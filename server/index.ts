import "dotenv/config";
import { randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import bcrypt from "bcryptjs";
import cors from "cors";
import express from "express";
import { rateLimit } from "express-rate-limit";
import helmet from "helmet";
import jwt from "jsonwebtoken";
import Stripe from "stripe";
import { z } from "zod";
import { createSpiritualReply } from "./ai.js";
import { requireAuth, type AuthenticatedRequest } from "./auth.js";
import { hasAccess } from "./access.js";
import { initializeDatabase, pool } from "./db.js";
import {
  createPayPalSubscription,
  subscriptionStatusForPayPalEvent,
  verifyPayPalWebhook,
  type PayPalWebhookEvent,
} from "./paypal.js";

const app = express();
const port = Number(process.env.PORT || 3000);
const clientUrl = process.env.CLIENT_URL || "http://localhost:5173";
const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY)
  : null;
const paypalConfigured = Boolean(
  process.env.PAYPAL_CLIENT_ID &&
  process.env.PAYPAL_CLIENT_SECRET &&
  process.env.PAYPAL_PLAN_ID &&
  process.env.PAYPAL_WEBHOOK_ID,
);
const allowedOrigins = clientUrl.split(",").map((origin) => origin.trim());
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { error: "Demasiados intentos. Espera unos minutos e inténtalo de nuevo." },
});

function setSessionCookie(response: express.Response, token: string) {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  response.append(
    "Set-Cookie",
    `dios_session=${encodeURIComponent(token)}; HttpOnly; SameSite=Lax; Path=/api; Max-Age=604800${secure}`,
  );
}

function clearSessionCookie(response: express.Response) {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  response.append(
    "Set-Cookie",
    `dios_session=; HttpOnly; SameSite=Lax; Path=/api; Max-Age=0${secure}`,
  );
}

app.disable("x-powered-by");
app.use(helmet());
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) callback(null, true);
    else callback(new Error("Origen no permitido"));
  },
  credentials: true,
}));
app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 120,
  standardHeaders: "draft-8",
  legacyHeaders: false,
}));
app.use((request, response, next) => {
  const mutatingMethod = ["POST", "PUT", "PATCH", "DELETE"].includes(request.method);
  const webhook = request.path === "/api/billing/webhook" ||
    request.path === "/api/billing/paypal/webhook";
  if (mutatingMethod && !webhook && !allowedOrigins.includes(request.get("origin") || "")) {
    response.status(403).json({ error: "Origen de solicitud no permitido." });
    return;
  }
  next();
});

app.post(
  "/api/billing/webhook",
  express.raw({ type: "application/json" }),
  async (request, response) => {
    if (!stripe || !process.env.STRIPE_WEBHOOK_SECRET) {
      response.status(503).json({ error: "Los pagos todavía no están configurados." });
      return;
    }

    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(
        request.body,
        request.headers["stripe-signature"] || "",
        process.env.STRIPE_WEBHOOK_SECRET,
      );
    } catch {
      response.status(400).json({ error: "Firma de webhook inválida." });
      return;
    }

    try {
      if (event.type === "checkout.session.completed") {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.client_reference_id;
        if (userId) {
          await pool.query(
            `UPDATE users SET subscription_status = 'active',
              stripe_customer_id = $2 WHERE id = $1`,
            [userId, typeof session.customer === "string" ? session.customer : null],
          );
        }
      } else if (
        event.type === "customer.subscription.updated" ||
        event.type === "customer.subscription.deleted"
      ) {
        const subscription = event.data.object as Stripe.Subscription;
        const userId = subscription.metadata.user_id;
        if (userId) {
          await pool.query(
            "UPDATE users SET subscription_status = $2 WHERE id = $1",
            [userId, event.type === "customer.subscription.deleted" ? "canceled" : subscription.status],
          );
        }
      }
      response.json({ received: true });
    } catch (error) {
      console.error("Error al procesar webhook de Stripe:", error);
      response.status(500).json({ error: "No se pudo procesar el evento de pago." });
    }
  },
);

app.post(
  "/api/billing/paypal/webhook",
  express.raw({ type: "application/json" }),
  async (request, response) => {
    let event: PayPalWebhookEvent;
    try {
      event = JSON.parse(request.body.toString("utf8")) as PayPalWebhookEvent;
    } catch {
      response.status(400).json({ error: "Evento de PayPal inválido." });
      return;
    }

    let verified: boolean;
    try {
      verified = await verifyPayPalWebhook(request.headers, event);
    } catch {
      response.status(503).json({ error: "No se pudo verificar el evento de PayPal." });
      return;
    }
    if (!verified) {
      response.status(400).json({ error: "Firma de webhook de PayPal inválida." });
      return;
    }

    const subscriptionStatus = subscriptionStatusForPayPalEvent(event);
    if (!subscriptionStatus) {
      response.json({ received: true });
      return;
    }

    try {
      const subscriptionId = event.resource?.id ?? event.resource?.billing_agreement_id ?? null;
      let userId = event.resource?.custom_id;
      if (!userId && subscriptionId) {
        const { rows } = await pool.query(
          "SELECT id FROM users WHERE paypal_subscription_id = $1",
          [subscriptionId],
        );
        userId = rows[0]?.id;
      }
      if (userId) {
        await pool.query(
          `UPDATE users SET subscription_status = $2,
            paypal_subscription_id = COALESCE($3, paypal_subscription_id)
            WHERE id = $1`,
          [userId, subscriptionStatus, subscriptionId],
        );
      }
      response.json({ received: true });
    } catch (error) {
      console.error("Error al procesar webhook de PayPal:", error);
      response.status(500).json({ error: "No se pudo procesar el evento de PayPal." });
    }
  },
);

app.use(express.json({ limit: "16kb" }));

app.get("/api/health", (_request, response) => {
  response.json({ status: "ok" });
});

app.post("/api/auth/register", authLimiter, async (request, response) => {
  const parsed = z.object({
    email: z.string().trim().email().max(254).transform((email) => email.toLowerCase()),
    password: z.string().min(8).max(72),
  }).safeParse(request.body);
  if (!parsed.success || Buffer.byteLength(parsed.data?.password ?? "", "utf8") > 72) {
    response.status(400).json({ error: "Escribe un correo válido y una contraseña de 8 a 72 caracteres." });
    return;
  }

  const { email, password } = parsed.data;
  const id = randomUUID();
  const trialEndsAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  try {
    const passwordHash = await bcrypt.hash(password, 12);
    await pool.query(
      "INSERT INTO users (id, email, password_hash, trial_ends_at) VALUES ($1, $2, $3, $4)",
      [id, email, passwordHash, trialEndsAt],
    );
    const token = jwt.sign({}, process.env.JWT_SECRET!, { subject: id, expiresIn: "7d" }    );
    setSessionCookie(response, token);
    response.status(201).json({ user: { id, email, trialEndsAt, subscriptionStatus: null } });
  } catch (error) {
    if ((error as { code?: string }).code === "23505") {
      response.status(409).json({ error: "Ya existe una cuenta con ese correo." });
      return;
    }
    throw error;
  }
});

app.post("/api/auth/login", authLimiter, async (request, response) => {
  const parsed = z.object({
    email: z.string().trim().email().max(254).transform((email) => email.toLowerCase()),
    password: z.string().min(1).max(72),
  }).safeParse(request.body);
  if (!parsed.success || Buffer.byteLength(parsed.data?.password ?? "", "utf8") > 72) {
    response.status(400).json({ error: "Correo o contraseña inválidos." });
    return;
  }

  const { email, password } = parsed.data;
  const { rows } = await pool.query(
    `SELECT id, email, password_hash, trial_ends_at, subscription_status
      FROM users WHERE email = $1`,
    [email],
  );
  const user = rows[0];
  if (!user || !(await bcrypt.compare(password, user.password_hash))) {
    response.status(401).json({ error: "Correo o contraseña incorrectos." });
    return;
  }
  const token = jwt.sign({}, process.env.JWT_SECRET!, { subject: user.id, expiresIn: "7d" });
  setSessionCookie(response, token);
  response.json({
    user: {
      id: user.id,
      email: user.email,
      trialEndsAt: user.trial_ends_at,
      subscriptionStatus: user.subscription_status,
    },
  });
});

app.post("/api/auth/logout", (_request, response) => {
  clearSessionCookie(response);
  response.status(204).end();
});

app.get("/api/auth/me", requireAuth, async (request, response) => {
  const userId = (request as AuthenticatedRequest).userId;
  const { rows } = await pool.query(
    `SELECT id, email, trial_ends_at, subscription_status
      FROM users WHERE id = $1`,
    [userId],
  );
  if (!rows[0]) {
    response.status(404).json({ error: "No se encontró la cuenta." });
    return;
  }
  response.json({
    user: {
      id: rows[0].id,
      email: rows[0].email,
      trialEndsAt: rows[0].trial_ends_at,
      subscriptionStatus: rows[0].subscription_status,
    },
  });
});

app.get("/api/conversations", requireAuth, async (request, response) => {
  const userId = (request as AuthenticatedRequest).userId;
  const { rows } = await pool.query(
    `SELECT id, title, created_at FROM conversations
      WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50`,
    [userId],
  );
  response.json({ conversations: rows });
});

app.get("/api/conversations/:id/messages", requireAuth, async (request, response) => {
  const userId = (request as AuthenticatedRequest).userId;
  const conversationId = z.uuid().safeParse(request.params.id);
  if (!conversationId.success) {
    response.status(400).json({ error: "Conversación inválida." });
    return;
  }
  const { rows } = await pool.query(
    `SELECT m.id, m.role, m.content, m.created_at
      FROM messages m JOIN conversations c ON c.id = m.conversation_id
      WHERE c.id = $1 AND c.user_id = $2 ORDER BY m.created_at`,
    [conversationId.data, userId],
  );
  response.json({ messages: rows });
});

app.post("/api/chat", requireAuth, async (request, response) => {
  const parsed = z.object({
    content: z.string().trim().min(1).max(2000),
    conversationId: z.uuid().nullable().optional(),
  }).safeParse(request.body);
  if (!parsed.success) {
    response.status(400).json({ error: "El mensaje debe tener entre 1 y 2000 caracteres." });
    return;
  }

  const userId = (request as AuthenticatedRequest).userId;
  const { rows: users } = await pool.query(
    "SELECT trial_ends_at, subscription_status FROM users WHERE id = $1",
    [userId],
  );
  const user = users[0];
  if (!user) {
    response.status(401).json({ error: "Inicia sesión de nuevo." });
    return;
  }
  if (!hasAccess(user.trial_ends_at, user.subscription_status)) {
    response.status(402).json({ error: "Tu prueba gratuita terminó. Activa tu suscripción para continuar." });
    return;
  }

  let conversationId = parsed.data.conversationId;
  if (conversationId) {
    const { rows } = await pool.query(
      "SELECT id FROM conversations WHERE id = $1 AND user_id = $2",
      [conversationId, userId],
    );
    if (!rows[0]) {
      response.status(404).json({ error: "No se encontró la conversación." });
      return;
    }
  } else {
    conversationId = randomUUID();
    await pool.query(
      "INSERT INTO conversations (id, user_id, title) VALUES ($1, $2, $3)",
      [conversationId, userId, parsed.data.content.slice(0, 60)],
    );
  }

  const { rows: history } = await pool.query(
    `SELECT role, content FROM messages WHERE conversation_id = $1
      ORDER BY created_at DESC LIMIT 12`,
    [conversationId],
  );
  const userMessage = { id: randomUUID(), role: "user", content: parsed.data.content };
  await pool.query(
    "INSERT INTO messages (id, conversation_id, role, content) VALUES ($1, $2, 'user', $3)",
    [userMessage.id, conversationId, userMessage.content],
  );
  const reply = await createSpiritualReply(parsed.data.content, history.reverse());
  const assistantMessage = { id: randomUUID(), role: "assistant", content: reply };
  await pool.query(
    "INSERT INTO messages (id, conversation_id, role, content) VALUES ($1, $2, 'assistant', $3)",
    [assistantMessage.id, conversationId, assistantMessage.content],
  );
  response.json({
    conversation: { id: conversationId },
    messages: [userMessage, assistantMessage],
  });
});

app.get("/api/billing/status", requireAuth, async (request, response) => {
  const userId = (request as AuthenticatedRequest).userId;
  const { rows } = await pool.query(
    "SELECT trial_ends_at, subscription_status FROM users WHERE id = $1",
    [userId],
  );
  if (!rows[0]) {
    response.status(404).json({ error: "No se encontró la cuenta." });
    return;
  }
  response.json({
    trialEndsAt: rows[0].trial_ends_at,
    trialDaysRemaining: Math.max(
      0,
      Math.ceil((new Date(rows[0].trial_ends_at).getTime() - Date.now()) / 86_400_000),
    ),
    subscriptionStatus: rows[0].subscription_status,
    hasAccess: hasAccess(rows[0].trial_ends_at, rows[0].subscription_status),
    paymentsConfigured: Boolean(stripe) || paypalConfigured,
    paypalConfigured,
  });
});

app.post("/api/billing/checkout", requireAuth, async (request, response) => {
  if (!stripe) {
    response.status(503).json({ error: "Los pagos todavía no están configurados. Contacta al equipo de soporte." });
    return;
  }
  const userId = (request as AuthenticatedRequest).userId;
  const { rows } = await pool.query(
    "SELECT email, stripe_customer_id FROM users WHERE id = $1",
    [userId],
  );
  if (!rows[0]) {
    response.status(404).json({ error: "No se encontró la cuenta." });
    return;
  }
  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    line_items: [{
      price_data: {
        currency: "mxn",
        unit_amount: 500,
        recurring: { interval: "month" },
        product_data: { name: "Consejero espiritual — mensual" },
      },
      quantity: 1,
    }],
    customer: rows[0].stripe_customer_id || undefined,
    customer_email: rows[0].stripe_customer_id ? undefined : rows[0].email,
    client_reference_id: userId,
    subscription_data: { metadata: { user_id: userId } },
    success_url: `${clientUrl.split(",")[0]}/?billing=success`,
    cancel_url: `${clientUrl.split(",")[0]}/?billing=cancel`,
  });
  response.json({ url: session.url });
});

app.post("/api/billing/paypal/checkout", requireAuth, async (request, response) => {
  if (!paypalConfigured) {
    response.status(503).json({ error: "PayPal todavía no está configurado en el servidor." });
    return;
  }
  const userId = (request as AuthenticatedRequest).userId;
  const { rows } = await pool.query(
    "SELECT email FROM users WHERE id = $1",
    [userId],
  );
  if (!rows[0]) {
    response.status(404).json({ error: "No se encontró la cuenta." });
    return;
  }
  const subscription = await createPayPalSubscription(
    userId,
    rows[0].email,
    clientUrl.split(",")[0],
  );
  if (subscription.id) {
    await pool.query(
      "UPDATE users SET paypal_subscription_id = $2 WHERE id = $1",
      [userId, subscription.id],
    );
  }
  response.json({ url: subscription.url });
});

const clientBuild = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../client/dist",
);
if (existsSync(clientBuild)) {
  app.use(express.static(clientBuild));
  app.get("/{*path}", (_request, response) => response.sendFile(path.join(clientBuild, "index.html")));
}

app.use((error: unknown, _request: express.Request, response: express.Response, _next: express.NextFunction) => {
  console.error("Error de API:", error);
  response.status(500).json({ error: "Ocurrió un problema. Inténtalo de nuevo." });
});

async function start() {
  if (!process.env.DATABASE_URL) throw new Error("Configura DATABASE_URL antes de iniciar la aplicación.");
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
    throw new Error("JWT_SECRET debe contener al menos 32 caracteres aleatorios.");
  }
  await initializeDatabase();
  app.listen(port, () => console.info(`API disponible en http://localhost:${port}`));
}

start().catch((error) => {
  console.error("No se pudo iniciar la aplicación:", error);
  process.exit(1);
});
