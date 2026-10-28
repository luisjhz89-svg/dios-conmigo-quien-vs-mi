import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";

export type AuthenticatedRequest = Request & { userId: string };

export function getSessionToken(cookieHeader: string | undefined) {
  const sessionCookie = cookieHeader
    ?.split(";")
    .map((cookie) => cookie.trim())
    .find((cookie) => cookie.startsWith("dios_session="));
  if (!sessionCookie) return null;

  try {
    return decodeURIComponent(sessionCookie.slice("dios_session=".length));
  } catch {
    return null;
  }
}

export function requireAuth(request: Request, response: Response, next: NextFunction) {
  const token = getSessionToken(request.headers.cookie);
  if (!token) {
    response.status(401).json({ error: "Inicia sesión para continuar." });
    return;
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET!, {
      algorithms: ["HS256"],
    }) as jwt.JwtPayload;
    if (typeof payload.sub !== "string") throw new Error("Token sin usuario");
    (request as AuthenticatedRequest).userId = payload.sub;
    next();
  } catch {
    response.status(401).json({ error: "Tu sesión ha caducado. Inicia sesión de nuevo." });
  }
}
