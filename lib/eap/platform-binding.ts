import { ApiError } from '../core/server';
import type { EapManifest } from './manifest';

export const CURRENT_ERPFY_PLATFORM_VERSION = '1.0.0';

/**
 * Validates that a plugin manifest declares official ERPFY platform binding.
 * Rejects any standalone, foreign, or non-ERPFY platform declarations.
 */
export function validatePlatformBinding(manifest: EapManifest): void {
  if (manifest.platform) {
    if (manifest.platform.id !== 'erpfy') {
      throw new ApiError(
        400,
        `Invalid platform '${manifest.platform.id}'. All plugins must bind specifically to the 'erpfy' platform.`,
      );
    }

    if (manifest.platform.protocol && manifest.platform.protocol !== 'eap-v1') {
      throw new ApiError(
        400,
        `Unsupported platform protocol '${manifest.platform.protocol}'. Expected 'eap-v1'.`,
      );
    }

    if (manifest.platform.plugin_id && manifest.platform.plugin_id !== manifest.app_id) {
      throw new ApiError(
        400,
        `Platform plugin_id '${manifest.platform.plugin_id}' must match manifest app_id '${manifest.app_id}'.`,
      );
    }
  }
}

/**
 * Enforces private plugin licensing and company/tenant entitlement.
 * If a plugin restricts allowed companies, only authorized companies may install or execute it.
 */
export function verifyPluginEntitlement(manifest: EapManifest, companyId: string): void {
  const allowedCompanies = manifest.platform?.allowed_companies;
  if (Array.isArray(allowedCompanies) && allowedCompanies.length > 0) {
    if (!allowedCompanies.includes(companyId)) {
      throw new ApiError(
        403,
        `Entitlement Denied: Plugin '${manifest.app_id}' is a private release restricted to specific companies. Company '${companyId}' is not authorized.`,
      );
    }
  }
}
