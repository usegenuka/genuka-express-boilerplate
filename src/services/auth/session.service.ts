import { env } from "@/config/env.js";
import { companyDBService } from "@/services/database/company.service.js";
import type { Request, Response } from "express";
import { JWTPayload, SignJWT, jwtVerify } from "jose";

const SESSION_COOKIE_NAME = "session";
const SESSION_MAX_AGE = 60 * 60 * 7; // 7 hours in seconds

interface SessionPayload extends JWTPayload {
  companyId: string;
}

/**
 * Session Service
 * Handles JWT session management for authenticated users
 */
export class SessionService {
  private getSecret() {
    return new TextEncoder().encode(env.genuka.clientSecret);
  }

  /**
   * Create a new session for a company
   */
  async createSession(companyId: string, res: Response): Promise<string> {
    const secret = this.getSecret();

    const token = await new SignJWT({ companyId })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("7h")
      .sign(secret);

    const isProd = env.nodeEnv === "production";

    res.cookie(SESSION_COOKIE_NAME, token, {
      httpOnly: true,
      secure: isProd,
      sameSite: "lax",
      maxAge: SESSION_MAX_AGE * 1000, // Convert to milliseconds
      path: "/",
    });

    return token;
  }

  /**
   * Verify a JWT token and return the payload
   */
  async verifyJwt(token: string): Promise<SessionPayload | null> {
    try {
      const secret = this.getSecret();
      const { payload } = await jwtVerify(token, secret);
      return payload as SessionPayload;
    } catch (error) {
      console.error("JWT verification failed:", error);
      return null;
    }
  }

  /**
   * Get the session token from request cookies
   */
  getSessionToken(req: Request): string | null {
    return req.cookies?.[SESSION_COOKIE_NAME] || null;
  }

  /**
   * Get the authenticated company from the session
   */
  async getAuthenticatedCompany(req: Request) {
    const token = this.getSessionToken(req);

    if (!token) {
      return null;
    }

    const payload = await this.verifyJwt(token);

    if (!payload) {
      return null;
    }

    return await companyDBService.findByCompanyId(payload.companyId);
  }

  /**
   * Check if the request is authenticated
   */
  async isAuthenticated(req: Request): Promise<boolean> {
    const company = await this.getAuthenticatedCompany(req);
    return company !== null;
  }

  /**
   * Get authenticated company or throw error
   */
  async requireAuth(req: Request) {
    const company = await this.getAuthenticatedCompany(req);

    if (!company) {
      throw new Error("Unauthorized");
    }

    return company;
  }

  /**
   * Destroy the session (logout)
   */
  destroySession(res: Response): void {
    res.clearCookie(SESSION_COOKIE_NAME, {
      httpOnly: true,
      secure: env.nodeEnv === "production",
      sameSite: "lax",
      path: "/",
    });
  }
}

export const sessionService = new SessionService();
