import { createHmac, timingSafeEqual } from 'crypto';
import { env } from '../config/env.js';

interface HmacParams {
  code: string;
  company_id: string;
  redirect_to: string;
  timestamp: string;
}

/**
 * Generate HMAC signature for OAuth callback validation
 * @param params - OAuth callback parameters
 * @returns HMAC signature as hex string
 */
export function generateHmac(params: HmacParams): string {
  // Sort parameters alphabetically by key
  const sortedKeys = Object.keys(params).sort() as (keyof HmacParams)[];

  // Build query string with URL encoding
  const queryString = sortedKeys
    .map((key) => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`)
    .join('&');

  // Generate HMAC-SHA256
  const hmac = createHmac('sha256', env.genuka.clientSecret);
  hmac.update(queryString);

  return hmac.digest('hex');
}

/**
 * Verify HMAC signature using constant-time comparison
 * @param params - OAuth callback parameters
 * @param receivedHmac - HMAC signature received from request
 * @returns true if HMAC is valid
 */
export function verifyHmac(params: HmacParams, receivedHmac: string): boolean {
  const expectedHmac = generateHmac(params);

  // Use constant-time comparison to prevent timing attacks
  try {
    const expectedBuffer = Buffer.from(expectedHmac, 'hex');
    const receivedBuffer = Buffer.from(receivedHmac, 'hex');

    if (expectedBuffer.length !== receivedBuffer.length) {
      return false;
    }

    return timingSafeEqual(expectedBuffer, receivedBuffer);
  } catch {
    return false;
  }
}
