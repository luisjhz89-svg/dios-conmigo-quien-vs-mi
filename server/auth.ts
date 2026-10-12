import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";

export type AuthenticatedRequest = Request & { userId: string };

export function requireAuth(request: Request, response: Response, next: NextFunction) {
  const token = request.headers.authorization?.replace(/^Bearer\s+/i, "");
  if (!token) {
    response.status(401).json({ error: "Inicia sesión para continuar." });
    return;
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET!) as jwt.JwtPayload;
    if (typeof payload.sub !== "string") throw new Error("Token sin usuario");
    (request as AuthenticatedRequest).userId = payload.sub;
    next();
  } catch {
    response.status(401).json({ error: "Tu sesión ha caducado. Inicia sesión de nuevo." });
  }
}
