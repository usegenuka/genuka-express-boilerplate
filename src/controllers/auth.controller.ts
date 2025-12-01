import type { Request, Response } from "express";
import { sessionService } from "@/services/auth/session.service.js";
import { companyDBService } from "@/services/database/company.service.js";
import { HTTP_STATUS } from "@/config/constants.js";

/**
 * Auth Controller
 * Handles authentication-related endpoints
 */
export class AuthController {
  /**
   * GET /api/auth/me
   * Get the currently authenticated company
   */
  async me(req: Request, res: Response): Promise<void> {
    try {
      const company = await sessionService.getAuthenticatedCompany(req);

      if (!company) {
        res.status(HTTP_STATUS.UNAUTHORIZED).json({
          error: "Unauthorized",
          message: "Not authenticated",
        });
        return;
      }

      // Return company info without sensitive data
      res.json({
        id: company.id,
        handle: company.handle,
        name: company.name,
        description: company.description,
        logoUrl: company.logoUrl,
        phone: company.phone,
        createdAt: company.createdAt,
        updatedAt: company.updatedAt,
      });
    } catch (error) {
      console.error("Auth me error:", error);
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        error: "Failed to get user info",
      });
    }
  }

  /**
   * POST /api/auth/logout
   * Logout the current user by destroying the session
   */
  async logout(req: Request, res: Response): Promise<void> {
    try {
      sessionService.destroySession(res);

      res.json({
        success: true,
        message: "Logged out successfully",
      });
    } catch (error) {
      console.error("Logout error:", error);
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        error: "Failed to logout",
      });
    }
  }

  /**
   * GET /api/auth/check
   * Check if the current session is valid
   */
  async check(req: Request, res: Response): Promise<void> {
    try {
      const isAuthenticated = await sessionService.isAuthenticated(req);

      res.json({
        authenticated: isAuthenticated,
      });
    } catch (error) {
      console.error("Auth check error:", error);
      res.json({
        authenticated: false,
      });
    }
  }

  /**
   * POST /api/auth/refresh
   * Refresh session using company ID (when session expired but company exists in DB)
   * This avoids requiring re-installation of the app
   */
  async refresh(req: Request, res: Response): Promise<void> {
    try {
      const { companyId } = req.body;

      if (!companyId) {
        res.status(HTTP_STATUS.BAD_REQUEST).json({
          error: "Bad Request",
          message: "companyId is required",
        });
        return;
      }

      // Check if company exists in database (was previously authenticated)
      const company = await companyDBService.findByCompanyId(companyId);

      if (!company || !company.accessToken) {
        res.status(HTTP_STATUS.UNAUTHORIZED).json({
          error: "Unauthorized",
          message: "Company not found or not authenticated. Please reinstall the app.",
        });
        return;
      }

      // Create new session
      await sessionService.createSession(companyId, res);

      res.json({
        success: true,
        message: "Session refreshed successfully",
        company: {
          id: company.id,
          handle: company.handle,
          name: company.name,
        },
      });
    } catch (error) {
      console.error("Session refresh error:", error);
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        error: "Failed to refresh session",
      });
    }
  }
}

export const authController = new AuthController();
