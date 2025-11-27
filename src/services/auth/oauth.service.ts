import {
  companyDBService,
  type CompanyData,
} from "@/services/database/company.service.js";
import { genukaApiService } from "@/services/genuka/api.service.js";
import { verifyHmac } from "@/utils/hmac.js";
import { OAUTH } from "@/config/constants.js";

export interface OAuthCallbackParams {
  code: string;
  companyId: string;
  timestamp: string;
  hmac: string;
  redirectTo: string;
}

export class OAuthService {
  async handleCallback(params: OAuthCallbackParams) {
    const isValidHmac = verifyHmac(
      {
        code: params.code,
        company_id: params.companyId,
        redirect_to: params.redirectTo,
        timestamp: params.timestamp,
      },
      params.hmac
    );

    if (!isValidHmac) {
      throw new Error("Invalid HMAC signature");
    }

    const timestampAge = Date.now() - parseInt(params.timestamp, 10) * 1000;
    if (timestampAge > OAUTH.TIMESTAMP_TOLERANCE_MS) {
      throw new Error("Request expired");
    }

    // Exchange code for access token
    const accessToken = await genukaApiService.exchangeCodeForToken(
      params.code
    );

    // Fetch company information from Genuka
    const companyInfo = await genukaApiService.getCompanyInfo(params.companyId);

    // Prepare company data for database
    const companyData: CompanyData = {
      id: params.companyId,
      handle: companyInfo.handle || null,
      name: companyInfo.name,
      description: companyInfo.description || null,
      authorizationCode: params.code,
      accessToken: accessToken,
      logoUrl: companyInfo.logoUrl || null,
      phone: companyInfo.metadata?.contact || null,
    };

    // Save/update company in database
    await companyDBService.upsertCompany(companyData);

    return { success: true, companyId: params.companyId };
  }

  /**
   * Validate OAuth callback parameters
   */
  validateCallbackParams(params: {
    code?: string | null;
    companyId?: string | null;
    timestamp?: string | null;
    hmac?: string | null;
  }): boolean {
    return !!(
      params.code &&
      params.companyId &&
      params.timestamp &&
      params.hmac
    );
  }
}

export const oauthService = new OAuthService();
