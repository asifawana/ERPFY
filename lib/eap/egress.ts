/**
 * ERPFY Network Egress Broker with Strict SSRF Protection
 * Mediates all outbound HTTP requests made by sandboxed plugins.
 * 
 * Enforces:
 * - Runtime token capability check (network.request or network.outbound)
 * - Strict SSRF blocking (localhost, RFC1918, link-local, cloud metadata)
 * - Scheme restrictions (HTTPS enforcement)
 * - Maximum payload size & execution timeouts
 */

import { ApiError } from '../core/server';

export type EgressRequestOptions = {
  url: string;
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD';
  headers?: Record<string, string>;
  body?: string;
  timeoutMs?: number;
  maxSizeBytes?: number;
  allowedHosts?: string[];
  allowHttpInTest?: boolean;
};

export type EgressResponse = {
  status: number;
  statusText: string;
  headers: Record<string, string>;
  data: string;
};

const DEFAULT_TIMEOUT_MS = 5000;
const DEFAULT_MAX_SIZE_BYTES = 2 * 1024 * 1024; // 2 MB

// Denied hostnames and IP patterns (SSRF Protection)
const BLOCKED_HOST_PATTERNS = [
  /^localhost$/i,
  /^127\.\d+\.\d+\.\d+$/,
  /^0\.0\.0\.0$/,
  /^10\.\d+\.\d+\.\d+$/,
  /^172\.(1[6-9]|2\d|3[0-1])\.\d+\.\d+$/,
  /^192\.168\.\d+\.\d+$/,
  /^169\.254\.\d+\.\d+$/, // Link-local & cloud metadata
  /^\[?::1\]?$/,
  /^\[?fc00:/i,
  /^\[?fe80:/i,
  /\.internal$/i,
  /\.local$/i,
  /\.localhost$/i,
];

/**
 * Validates whether a target URL is safe against SSRF attacks.
 */
export function validateSafeEgressUrl(
  urlString: string,
  options?: { allowHttpInTest?: boolean; allowedHosts?: string[] },
): URL {
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(urlString);
  } catch {
    throw new ApiError(400, `Malformed egress URL: '${urlString}'`);
  }

  // Scheme check
  const isHttps = parsedUrl.protocol === 'https:';
  const isHttp = parsedUrl.protocol === 'http:';

  if (!isHttps && !(isHttp && options?.allowHttpInTest)) {
    throw new ApiError(
      403,
      `Insecure egress protocol '${parsedUrl.protocol}'. Sandboxed plugins are strictly restricted to HTTPS.`,
    );
  }

  const hostname = parsedUrl.hostname.toLowerCase();

  // Hostname / IP SSRF blocklist check
  for (const pattern of BLOCKED_HOST_PATTERNS) {
    if (pattern.test(hostname)) {
      throw new ApiError(
        403,
        `SSRF Protection Violation: Egress to private, loopback, or cloud metadata address '${hostname}' is strictly denied.`,
      );
    }
  }

  // Optional allowlist check
  if (options?.allowedHosts && options.allowedHosts.length > 0) {
    const isAllowed = options.allowedHosts.some(
      (allowed) => hostname === allowed.toLowerCase() || hostname.endsWith(`.${allowed.toLowerCase()}`),
    );
    if (!isAllowed) {
      throw new ApiError(
        403,
        `Destination host '${hostname}' is not in the declared plugin egress allowlist.`,
      );
    }
  }

  return parsedUrl;
}

/**
 * Executes a mediated outbound network request on behalf of a sandboxed plugin.
 */
export async function executeMediatedEgressRequest(
  options: EgressRequestOptions,
  capabilityChecker: () => void,
): Promise<EgressResponse> {
  // 1. Enforce capability
  capabilityChecker();

  // 2. Validate URL safety (SSRF checks)
  const safeUrl = validateSafeEgressUrl(options.url, {
    allowHttpInTest: options.allowHttpInTest,
    allowedHosts: options.allowedHosts,
  });

  const method = (options.method ?? 'GET').toUpperCase();
  const timeoutMs = Math.min(options.timeoutMs ?? DEFAULT_TIMEOUT_MS, 10000);
  const maxBytes = options.maxSizeBytes ?? DEFAULT_MAX_SIZE_BYTES;

  // 3. Setup timeout controller
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    // 4. Sanitize headers (strip sensitive ERPFY internal headers)
    const sanitizedHeaders: Record<string, string> = {};
    if (options.headers) {
      for (const [key, value] of Object.entries(options.headers)) {
        const lowerKey = key.toLowerCase();
        if (
          lowerKey.startsWith('x-erpfy-') ||
          lowerKey === 'cookie' ||
          lowerKey === 'authorization' ||
          lowerKey === 'host'
        ) {
          continue; // Strip sensitive host headers
        }
        sanitizedHeaders[key] = value;
      }
    }

    const response = await fetch(safeUrl.toString(), {
      method,
      headers: sanitizedHeaders,
      body: ['GET', 'HEAD'].includes(method) ? undefined : options.body,
      signal: controller.signal,
      redirect: 'follow',
    });

    const responseHeaders: Record<string, string> = {};
    response.headers.forEach((val, key) => {
      responseHeaders[key.toLowerCase()] = val;
    });

    const text = await response.text();

    if (text.length > maxBytes) {
      throw new ApiError(
        413,
        `Egress response size (${text.length} bytes) exceeds maximum allowable limit (${maxBytes} bytes).`,
      );
    }

    return {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
      data: text,
    };
  } catch (err: unknown) {
    if (err instanceof ApiError) throw err;
    if (controller.signal.aborted) {
      throw new ApiError(504, `Egress request timed out after ${timeoutMs}ms.`);
    }
    const message = err instanceof Error ? err.message : String(err);
    throw new ApiError(502, `Egress request failed: ${message}`);
  } finally {
    clearTimeout(timeoutId);
  }
}
