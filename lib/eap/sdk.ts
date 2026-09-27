import { ApiError } from '../core/server';
import type { EapManifest } from './manifest';

export class ErpfyPlatformMissingError extends ApiError {
  constructor(message = 'This plugin requires the official ERPFY runtime platform and cannot execute standalone.') {
    super(500, message);
    this.name = 'ErpfyPlatformMissingError';
  }
}

export class ErpfySecurityViolationError extends ApiError {
  constructor(message = 'Security violation: operation attempted outside ERPFY tenant trust boundary.') {
    super(403, message);
    this.name = 'ErpfySecurityViolationError';
  }
}

/**
 * Tenant-scoped data repositories provided by the ERPFY runtime host.
 * Plugins NEVER receive raw SQL connection strings or credentials;
 * all queries are strictly filtered by companyId in the host layer.
 */
export type ScopedRepository<T = Record<string, unknown>> = {
  findMany: (filter?: Record<string, unknown>) => Promise<T[]>;
  findById: (id: string) => Promise<T | null>;
  create?: (data: Record<string, unknown>) => Promise<T>;
  update?: (id: string, data: Record<string, unknown>) => Promise<T>;
};

export type ErpfyPluginContext = {
  platform: 'erpfy';
  pluginId: string;
  version: string;
  installationId: string;
  companyId: string;
  token: string;
  capabilities: string[];
  repositories: {
    products: ScopedRepository;
    orders: ScopedRepository;
    customers: ScopedRepository;
    settings: {
      get: (key: string) => Promise<unknown>;
      set: (key: string, value: unknown) => Promise<void>;
    };
    audit: {
      log: (action: string, details: Record<string, unknown>) => Promise<void>;
    };
  };
  logger: {
    info: (msg: string, meta?: Record<string, unknown>) => void;
    warn: (msg: string, meta?: Record<string, unknown>) => void;
    error: (msg: string, meta?: Record<string, unknown>) => void;
  };
};

export type CapabilityHandler = (
  context: ErpfyPluginContext,
  payload: unknown,
) => Promise<unknown>;

export type ErpfyPluginDefinition<TCapabilities extends Record<string, CapabilityHandler> = Record<string, CapabilityHandler>> = {
  manifest: EapManifest;
  capabilities: TCapabilities;
};

export type ErpfyExecutablePlugin<TCapabilities extends Record<string, CapabilityHandler> = Record<string, CapabilityHandler>> = {
  manifest: EapManifest;
  capabilities: TCapabilities;
  execute: (
    capability: keyof TCapabilities,
    context: ErpfyPluginContext,
    payload: unknown,
  ) => Promise<unknown>;
};

/**
 * Factory for defining an official ERPFY-locked plugin.
 * Standalone execution without a valid ERPFY runtime context fails closed immediately.
 */
export function defineErpfyPlugin<TCapabilities extends Record<string, CapabilityHandler>>(
  definition: ErpfyPluginDefinition<TCapabilities>,
): ErpfyExecutablePlugin<TCapabilities> {
  return {
    manifest: definition.manifest,
    capabilities: definition.capabilities,
    async execute(capability, context, payload) {
      // 1. Enforce Platform Presence (Anti-Standalone Guarantee)
      if (!context || typeof context !== 'object' || context.platform !== 'erpfy' || !context.token) {
        throw new ErpfyPlatformMissingError(
          `Plugin '${definition.manifest.app_id}' cannot run standalone: missing official ERPFY runtime context.`,
        );
      }

      // 2. Enforce Tenant & Installation Binding
      if (!context.companyId || !context.installationId || !context.pluginId) {
        throw new ErpfySecurityViolationError(
          `Plugin execution denied: incomplete ERPFY tenant binding context.`,
        );
      }

      const handler = definition.capabilities[capability as string];
      if (!handler) {
        throw new ApiError(404, `Capability '${String(capability)}' is not implemented by plugin '${definition.manifest.app_id}'.`);
      }

      return handler(context, payload);
    },
  };
}
