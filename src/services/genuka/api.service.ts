import Genuka from "genuka-api";
import { env } from "@/config/env.js";
import { OAUTH } from "@/config/constants.js";

export class GenukaApiService {
  async initialize(companyId: string) {
    return await Genuka.initialize({ id: companyId });
  }

  async exchangeCodeForToken(code: string): Promise<string> {
    const tokenUrl = `${env.genuka.url}${OAUTH.TOKEN_ENDPOINT}`;

    const response = await fetch(tokenUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: OAUTH.GRANT_TYPE,
        code,
        client_id: env.genuka.clientId,
        client_secret: env.genuka.clientSecret,
        redirect_uri: env.genuka.redirectUri,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Token exchange failed: ${response.status} ${errorText}`);
    }

    const data = (await response.json()) as { access_token: string };
    return data.access_token;
  }

  async getCompanyInfo(companyId: string) {
    const genuka = await this.initialize(companyId);
    return await genuka.company.retrieve();
  }

  async get<T>(endpoint: string, accessToken: string): Promise<T> {
    const url = `${env.genuka.url}${endpoint}`;

    const response = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`GET ${endpoint} failed: ${response.status}`);
    }

    return response.json() as Promise<T>;
  }

  async post<T>(
    endpoint: string,
    accessToken: string,
    data: unknown
  ): Promise<T> {
    const url = `${env.genuka.url}${endpoint}`;

    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error(`POST ${endpoint} failed: ${response.status}`);
    }

    return response.json() as Promise<T>;
  }
}

export const genukaApiService = new GenukaApiService();
