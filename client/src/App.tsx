import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import "./App.css";

type User = {
  id: string;
  email: string;
  trialEndsAt: string;
  subscriptionStatus: string | null;
};

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

type Conversation = {
  id: string;
  title: string;
  created_at: string;
};

type Billing = {
  trialEndsAt: string;
  trialDaysRemaining: number;
  subscriptionStatus: string | null;
  hasAccess: boolean;
  paymentsConfigured: boolean;
};

const tokenKey = "dios-conmigo-token";

async function api<T>(url: string, options: RequestInit = {}, token?: string): Promise<T> {
  const response = await fetch(url, {
    ...options,
    headers: {
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: "Bearer " + token } : {}),
      ...options.headers,
    },
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || "Ocurrió un error.");
  return result as T;
}

function App() {
  const [token, setToken] = useState(() => localStorage.getItem(tokenKey) || "");
  const [user, setUser] = useState<User | null>(null);
  const [billing, setBilling] = useState<Billing | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [registering, setRegistering] = useState(true);
  const [loading, setLoading] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [error, setError] = useState("");
  const endOfMessages = useRef<HTMLDivElement>(null);

  async function refreshAccount(accessToken: string) {
    const [account, status, chats] = await Promise.all([
      api<{ user: User }>("/api/auth/me", {}, accessToken),
      api<Billing>("/api/billing/status", {}, accessToken),
      api<{ conversations: Conversation[] }>("/api/conversations", {}, accessToken),
    ]);
    setUser(account.user);
    setBilling(status);
    setConversations(chats.conversations);
    if (chats.conversations.length) {
      const first = chats.conversations[0];
      setConversationId(first.id);
      const history = await api<{ messages: Message[] }>(
        `/api/conversations/${first.id}/messages`,
        {},
        accessToken,
      );
      setMessages(history.messages);
    }
  }

  useEffect(() => {
    if (!token) return;
    let active = true;
    async function loadAccount() {
      try {
        await refreshAccount(token);
      } catch {
        localStorage.removeItem(tokenKey);
        if (active) setToken("");
      }
    }
    void loadAccount();
    return () => {
      active = false;
    };
  }, [token]);

  useEffect(() => {
    endOfMessages.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function handleAuth(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAuthLoading(true);
    setError("");
    try {
      const response = await api<{ token: string; user: User }>(
        `/api/auth/${registering ? "register" : "login"}`,
        { method: "POST", body: JSON.stringify({ email, password }) },
      );
      localStorage.setItem(tokenKey, response.token);
      setUser(response.user);
      setToken(response.token);
      setPassword("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo iniciar sesión.");
    } finally {
      setAuthLoading(false);
    }
  }

  function signOut() {
    localStorage.removeItem(tokenKey);
    setToken("");
    setUser(null);
    setBilling(null);
    setMessages([]);
    setConversations([]);
    setConversationId(null);
    setError("");
  }

  async function openConversation(id: string) {
    if (!token) return;
    setError("");
    setConversationId(id);
    try {
      const history = await api<{ messages: Message[] }>(
        `/api/conversations/${id}/messages`,
        {},
        token,
      );
      setMessages(history.messages);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo abrir el chat.");
    }
  }

  async function sendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!text.trim() || !token || loading) return;
    const content = text.trim();
    setText("");
    setError("");
    setLoading(true);
    try {
      const response = await api<{
        conversation: { id: string };
        messages: Message[];
      }>("/api/chat", {
        method: "POST",
        body: JSON.stringify({ content, conversationId }),
      }, token);
      setConversationId(response.conversation.id);
      setMessages((current) => [...current, ...response.messages]);
      const chats = await api<{ conversations: Conversation[] }>("/api/conversations", {}, token);
      setConversations(chats.conversations);
    } catch (cause) {
      setText(content);
      setError(cause instanceof Error ? cause.message : "No se pudo enviar el mensaje.");
      api<Billing>("/api/billing/status", {}, token).then(setBilling).catch(() => undefined);
    } finally {
      setLoading(false);
    }
  }

  async function subscribe() {
    if (!token) return;
    setError("");
    try {
      const response = await api<{ url: string }>("/api/billing/checkout", {
        method: "POST",
      }, token);
      if (response.url) window.location.assign(response.url);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo iniciar el pago.");
    }
  }

  if (!token || !user) {
    return (
      <main className="auth-page">
        <section className="auth-card">
          <div className="brand-mark" aria-hidden="true">✦</div>
          <p className="eyebrow">UN ESPACIO PARA TU CORAZÓN</p>
          <h1>Dios conmigo,<br />¿quién contra mí?</h1>
          <p className="auth-intro">
            Comparte lo que estás viviendo y encuentra una palabra de fe para acompañarte.
          </p>
          <form className="auth-form" onSubmit={handleAuth}>
            <label htmlFor="email">Correo electrónico</label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              maxLength={254}
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="tu@correo.com"
            />
            <label htmlFor="password">Contraseña</label>
            <input
              id="password"
              type="password"
              autoComplete={registering ? "new-password" : "current-password"}
              required
              minLength={registering ? 8 : 1}
              maxLength={72}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder={registering ? "Al menos 8 caracteres" : "Tu contraseña"}
            />
            {error && <p className="error-message" role="alert">{error}</p>}
            <button className="primary-button" type="submit" disabled={authLoading}>
              {authLoading ? "Un momento…" : registering ? "Comenzar mis 7 días gratis" : "Iniciar sesión"}
            </button>
          </form>
          <p className="switch-auth">
            {registering ? "¿Ya tienes cuenta?" : "¿Aún no tienes cuenta?"}{" "}
            <button type="button" onClick={() => {
              setRegistering(!registering);
              setError("");
            }}>
              {registering ? "Inicia sesión" : "Regístrate"}
            </button>
          </p>
          <p className="fine-print">7 días gratis. Después, solo $5 MXN al mes.</p>
        </section>
      </main>
    );
  }

  const trialDays = billing?.trialDaysRemaining ?? 7;

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <a className="sidebar-brand" href="/" aria-label="Inicio">
          <span className="brand-mark small" aria-hidden="true">✦</span>
          <span>Dios conmigo</span>
        </a>
        <button className="new-chat-button" onClick={() => {
          setConversationId(null);
          setMessages([]);
          setError("");
        }}>
          <span aria-hidden="true">＋</span> Nueva conversación
        </button>
        <p className="sidebar-label">TUS CONVERSACIONES</p>
        <nav className="conversation-list" aria-label="Historial de conversaciones">
          {conversations.map((conversation) => (
            <button
              key={conversation.id}
              className={`conversation-item ${conversation.id === conversationId ? "selected" : ""}`}
              onClick={() => openConversation(conversation.id)}
              title={conversation.title}
            >
              <span aria-hidden="true">◷</span>
              <span>{conversation.title}</span>
            </button>
          ))}
          {conversations.length === 0 && <p className="empty-history">Aquí aparecerán tus charlas.</p>}
        </nav>
        <div className="sidebar-bottom">
          <div className="user-avatar" aria-hidden="true">{user.email.charAt(0).toUpperCase()}</div>
          <div className="user-summary">
            <strong>{user.email}</strong>
            <span>{billing?.subscriptionStatus === "active" ? "Suscripción activa" : trialDays > 0 ? `${trialDays} días de prueba` : "Prueba finalizada"}</span>
          </div>
          <button className="sign-out-button" onClick={signOut} aria-label="Cerrar sesión" title="Cerrar sesión">↗</button>
        </div>
      </aside>

      <section className="chat-panel">
        <header className="topbar">
          <div className="mobile-brand">
            <span className="brand-mark small" aria-hidden="true">✦</span>
            <span>Dios conmigo</span>
          </div>
          <div className="subscription-status">
            {billing?.subscriptionStatus === "active" ? (
              <span className="active-plan">✦ Acceso completo</span>
            ) : trialDays > 0 ? (
              <span>Prueba gratuita · <strong>{trialDays} días</strong></span>
            ) : (
              <button className="subscribe-button" onClick={subscribe} disabled={!billing?.paymentsConfigured}>
                Suscribirme · $5 MXN/mes
              </button>
            )}
          </div>
        </header>

        <div className={`messages ${messages.length ? "has-messages" : ""}`}>
          {messages.length === 0 && (
            <div className="welcome">
              <span className="welcome-icon" aria-hidden="true">✦</span>
              <p className="eyebrow">AQUÍ PUEDES HABLAR CON CONFIANZA</p>
              <h2>¿Qué hay en tu corazón hoy?</h2>
              <p>Cuéntame lo que sientes. Estoy aquí para escucharte y compartir contigo una reflexión y pasajes de la Biblia.</p>
              <div className="prompt-chips">
                {["Me siento preocupado", "Necesito tomar una decisión", "Quiero agradecer"].map((prompt) => (
                  <button key={prompt} onClick={() => setText(prompt)}>{prompt}</button>
                ))}
              </div>
            </div>
          )}
          {messages.map((message) => (
            <article key={message.id} className={`message ${message.role}`}>
              {message.role === "assistant" && <div className="message-avatar" aria-hidden="true">✦</div>}
              <div className="message-content">
                <span className="message-author">{message.role === "assistant" ? "Acompañamiento" : "Tú"}</span>
                <p>{message.content}</p>
              </div>
            </article>
          ))}
          {loading && (
            <div className="message assistant">
              <div className="message-avatar" aria-hidden="true">✦</div>
              <div className="typing-indicator" aria-label="Preparando una respuesta"><i /><i /><i /></div>
            </div>
          )}
          <div ref={endOfMessages} />
        </div>

        <div className="composer-area">
          {error && <p className="error-message composer-error" role="alert">{error}</p>}
          {!billing?.hasAccess && billing && (
            <div className="locked-note">
              Tu prueba terminó. <button onClick={subscribe} disabled={!billing.paymentsConfigured}>Continúa por $5 MXN al mes</button>
            </div>
          )}
          <form className="composer" onSubmit={sendMessage}>
            <label className="visually-hidden" htmlFor="message">Escribe lo que sientes</label>
            <textarea
              id="message"
              value={text}
              onChange={(event) => setText(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  event.currentTarget.form?.requestSubmit();
                }
              }}
              placeholder="Escribe lo que sientes…"
              maxLength={2000}
              rows={1}
              disabled={!billing?.hasAccess || loading}
            />
            <button type="submit" disabled={!text.trim() || !billing?.hasAccess || loading} aria-label="Enviar mensaje">↑</button>
          </form>
          <p className="composer-hint">Presiona Enter para enviar · Shift + Enter para una nueva línea</p>
          <p className="care-note">Este espacio ofrece acompañamiento espiritual y no sustituye atención profesional.</p>
        </div>
      </section>
    </main>
  );
}

export default App;
