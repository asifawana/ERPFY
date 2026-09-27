/**
 * ERPFY Hard Sandboxed Plugin Execution Engine
 * Powered by QuickJS compiled to WebAssembly (pure WASM isolate).
 * 
 * Boundary Guarantees:
 * - Zero ambient access to host process, process.env, filesystem, child_process, or network
 * - Zero direct database connection (no raw D1, SQLite, or SQL handles)
 * - Deterministic CPU execution timeout via WebAssembly interrupt handler
 * - Hard memory ceiling via QuickJS runtime memory limits
 * - Strict Default-Deny RPC bridge to host CapabilityBroker
 */

import { newQuickJSWASMModule, shouldInterruptAfterDeadline, Scope, type QuickJSWASMModule } from 'quickjs-emscripten';
import { ApiError } from '../core/server';
import { CapabilityBroker, type CapabilityBrokerContext } from './capability-broker';

export type SandboxExecutionOptions = {
  timeoutMs?: number;
  memoryLimitBytes?: number;
  maxResponseBytes?: number;
  allowHttpInTest?: boolean;
};

export type SandboxExecutionResult = {
  success: boolean;
  result?: unknown;
  error?: {
    class: string;
    message: string;
    stack?: string;
  };
  durationMs: number;
  memoryExhausted?: boolean;
  timedOut?: boolean;
};

let quickJSModulePromise: Promise<QuickJSWASMModule> | null = null;

function getQuickJS(): Promise<QuickJSWASMModule> {
  if (!quickJSModulePromise) {
    quickJSModulePromise = newQuickJSWASMModule();
  }
  return quickJSModulePromise;
}

const DEFAULT_TIMEOUT_MS = 5000;
const DEFAULT_MEMORY_LIMIT_BYTES = 32 * 1024 * 1024; // 32 MB
const DEFAULT_MAX_RESPONSE_BYTES = 1024 * 1024; // 1 MB

/**
 * Executes a capability on an untrusted plugin inside the WASM sandbox.
 */
export async function executeInWasmSandbox(
  code: string,
  capability: string,
  payload: unknown,
  broker: CapabilityBroker,
  options?: SandboxExecutionOptions,
): Promise<SandboxExecutionResult> {
  const startTime = Date.now();
  const QuickJS = await getQuickJS();
  const timeoutMs = options?.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const memoryLimitBytes = options?.memoryLimitBytes ?? DEFAULT_MEMORY_LIMIT_BYTES;
  const maxResponseBytes = options?.maxResponseBytes ?? DEFAULT_MAX_RESPONSE_BYTES;

  let timedOut = false;
  let memoryExhausted = false;

  return Scope.withScope(async (scope) => {
    const vm = scope.manage(QuickJS.newContext());
    const runtime = vm.runtime;

    // 1. Configure strict resource limits
    runtime.setMemoryLimit(memoryLimitBytes);
    runtime.setInterruptHandler(shouldInterruptAfterDeadline(Date.now() + timeoutMs));

    // 2. Set up synchronous/asynchronous RPC bridge registry
    // Each RPC is registered in a host dispatcher
    const pendingRpcs = new Map<string, (val: unknown, isError?: boolean) => void>();

    const rpcDispatch = scope.manage(
      vm.newFunction('__erpfy_rpc_dispatch', (reqHandle) => {
        const reqJson = vm.dump(reqHandle);
        const { id, service, method, args } = reqJson as {
          id: string;
          service: string;
          method: string;
          args: unknown[];
        };

        const promise = vm.newPromise();
        pendingRpcs.set(id, (val, isError) => {
          if (isError) {
            const errStr = vm.newString(typeof val === 'string' ? val : JSON.stringify(val));
            promise.reject(errStr);
            errStr.dispose();
          } else {
            const valStr = vm.newString(JSON.stringify(val ?? null));
            promise.resolve(valStr);
            valStr.dispose();
          }
        });

        // Execute host broker capability asynchronously
        void (async () => {
          try {
            let res: unknown;
            if (service === 'products') {
              if (method === 'findMany') res = await broker.findMany('products', (args[0] as Record<string, unknown>) || {});
              else if (method === 'findById') res = await broker.findById('products', String(args[0]));
            } else if (service === 'orders') {
              if (method === 'findMany') res = await broker.findMany('orders', (args[0] as Record<string, unknown>) || {});
              else if (method === 'findById') res = await broker.findById('orders', String(args[0]));
            } else if (service === 'customers') {
              if (method === 'findMany') res = await broker.findMany('customers', (args[0] as Record<string, unknown>) || {});
              else if (method === 'findById') res = await broker.findById('customers', String(args[0]));
            } else if (service === 'settings') {
              if (method === 'get') res = await broker.getSetting(String(args[0]));
              else if (method === 'set') res = await broker.setSetting(String(args[0]), args[1]);
            } else if (service === 'audit') {
              if (method === 'log') res = await broker.logAudit(String(args[0]), (args[1] as Record<string, unknown>) || {});
            } else if (service === 'http') {
              if (method === 'request') {
                const httpOpts = { ...(args[0] as Record<string, unknown>), allowHttpInTest: options?.allowHttpInTest };
                res = await broker.httpRequest(httpOpts as never);
              }
            } else if (service === 'secrets') {
              if (method === 'get') res = await broker.getSecret(String(args[0]));
            } else {
              throw new ApiError(403, `Unknown or unauthorized service '${service}' requested in sandbox.`);
            }

            const resolveFn = pendingRpcs.get(id);
            if (resolveFn) {
              pendingRpcs.delete(id);
              resolveFn(res, false);
            }
          } catch (err: unknown) {
            const resolveFn = pendingRpcs.get(id);
            if (resolveFn) {
              pendingRpcs.delete(id);
              const msg = err instanceof Error ? err.message : String(err);
              resolveFn(msg, true);
            }
          }
        })();

        return promise.handle;
      }),
    );

    vm.setProp(vm.global, '__erpfy_rpc_dispatch', rpcDispatch);

    // 3. Inject sterile ERPFY SDK wrapper code into QuickJS global
    const bootstrapCode = `
      var __rpc_id_counter = 0;
      function __callHost(service, method, args) {
        var id = 'rpc_' + (++__rpc_id_counter) + '_' + Math.random();
        return __erpfy_rpc_dispatch({ id: id, service: service, method: method, args: args })
          .then(function(resStr) {
            return JSON.parse(resStr);
          });
      }

      var ctx = {
        platform: 'erpfy',
        repositories: {
          products: {
            findMany: function(filter) { return __callHost('products', 'findMany', [filter || {}]); },
            findById: function(id) { return __callHost('products', 'findById', [id]); }
          },
          orders: {
            findMany: function(filter) { return __callHost('orders', 'findMany', [filter || {}]); },
            findById: function(id) { return __callHost('orders', 'findById', [id]); }
          },
          customers: {
            findMany: function(filter) { return __callHost('customers', 'findMany', [filter || {}]); },
            findById: function(id) { return __callHost('customers', 'findById', [id]); }
          },
          settings: {
            get: function(key) { return __callHost('settings', 'get', [key]); },
            set: function(key, val) { return __callHost('settings', 'set', [key, val]); }
          },
          audit: {
            log: function(action, details) { return __callHost('audit', 'log', [action, details || {}]); }
          }
        },
        http: {
          request: function(options) { return __callHost('http', 'request', [options || {}]); }
        },
        secrets: {
          get: function(key) { return __callHost('secrets', 'get', [key]); }
        },
        logger: {
          info: function(msg) { /* mediated logging */ },
          warn: function(msg) { /* mediated logging */ },
          error: function(msg) { /* mediated logging */ }
        }
      };

      // Sealed Plugin Execution Wrapper
      var __erpfy_plugin_entry = null;
      function defineErpfyPlugin(definition) {
        __erpfy_plugin_entry = definition;
      }
    `;

    const bootstrapRes = scope.manage(vm.evalCode(bootstrapCode));
    if (bootstrapRes.error) {
      const errDump = vm.dump(bootstrapRes.error);
      return {
        success: false,
        error: { class: 'BootstrapError', message: String(errDump) },
        durationMs: Date.now() - startTime,
      };
    }

    // 4. Load plugin code into sandbox
    const pluginEval = scope.manage(vm.evalCode(code));
    if (pluginEval.error) {
      const errDump = vm.dump(pluginEval.error);
      const errMsg = typeof errDump === 'object' && errDump !== null ? (errDump as Record<string, unknown>).message : String(errDump);
      return {
        success: false,
        error: { class: 'SyntaxOrInitError', message: String(errMsg) },
        durationMs: Date.now() - startTime,
      };
    }

    // 5. Invoke capability handler
    const capabilityInvocationCode = `
      (function() {
        var handler = null;
        if (__erpfy_plugin_entry && typeof __erpfy_plugin_entry.execute === 'function') {
          handler = function(cap, c, p) { return __erpfy_plugin_entry.execute(cap, c, p); };
        } else if (__erpfy_plugin_entry && __erpfy_plugin_entry.capabilities && typeof __erpfy_plugin_entry.capabilities[${JSON.stringify(capability)}] === 'function') {
          handler = function(cap, c, p) { return __erpfy_plugin_entry.capabilities[cap](c, p); };
        } else if (typeof __runCapability === 'function') {
          handler = function(cap, c, p) { return __runCapability(cap, c, p); };
        } else {
          throw new Error("Plugin does not export an executable handler for capability '" + ${JSON.stringify(capability)} + "'.");
        }

        var payload = ${JSON.stringify(payload ?? null)};
        return Promise.resolve(handler(${JSON.stringify(capability)}, ctx, payload))
          .then(function(res) {
            return JSON.stringify({ ok: true, data: res });
          })
          .catch(function(err) {
            return JSON.stringify({ ok: false, error: err && err.message ? err.message : String(err) });
          });
      })()
    `;

    const invocationRes = scope.manage(vm.evalCode(capabilityInvocationCode));
    if (invocationRes.error) {
      const errDump = vm.dump(invocationRes.error) as Record<string, unknown>;
      const msg =
        typeof errDump?.message === 'string'
          ? errDump.message
          : JSON.stringify(errDump ?? '');
      if (msg.includes('interrupted')) timedOut = true;
      if (msg.includes('out of memory')) memoryExhausted = true;

      return {
        success: false,
        error: {
          class: timedOut ? 'TimeoutError' : memoryExhausted ? 'MemoryLimitError' : 'RuntimeError',
          message: timedOut ? `Sandbox execution timed out after ${timeoutMs}ms.` : memoryExhausted ? `Sandbox exceeded memory limit (${memoryLimitBytes} bytes).` : msg,
        },
        durationMs: Date.now() - startTime,
        timedOut,
        memoryExhausted,
      };
    }

    // 6. Pump the event loop until pending async RPCs and the capability promise resolve
    const deadline = Date.now() + timeoutMs;
    let finalResultJson: string | null = null;

    while (Date.now() < deadline) {
      // Pump QuickJS internal microtask queue
      runtime.executePendingJobs();

      // Check if invocation returned a promise that resolved
      const dumpRes = vm.dump(invocationRes.value);
      if (typeof dumpRes === 'string') {
        finalResultJson = dumpRes;
        break;
      }

      // Small yield to host event loop to allow pending host IO to progress
      await new Promise((resolve) => setTimeout(resolve, 5));
    }

    if (!finalResultJson) {
      return {
        success: false,
        error: {
          class: 'TimeoutError',
          message: `Sandbox capability execution did not complete within ${timeoutMs}ms deadline.`,
        },
        durationMs: Date.now() - startTime,
        timedOut: true,
      };
    }

    // 7. Enforce response size limits
    if (finalResultJson.length > maxResponseBytes) {
      return {
        success: false,
        error: {
          class: 'PayloadTooLargeError',
          message: `Sandbox response size (${finalResultJson.length} bytes) exceeds limit (${maxResponseBytes} bytes).`,
        },
        durationMs: Date.now() - startTime,
      };
    }

    let parsedOutput: { ok: boolean; data?: unknown; error?: string };
    try {
      parsedOutput = JSON.parse(finalResultJson);
    } catch {
      return {
        success: false,
        error: { class: 'SerializationError', message: 'Failed to parse sandbox response JSON.' },
        durationMs: Date.now() - startTime,
      };
    }

    if (!parsedOutput.ok) {
      return {
        success: false,
        error: { class: 'PluginExecutionError', message: parsedOutput.error ?? 'Unknown error in plugin capability' },
        durationMs: Date.now() - startTime,
      };
    }

    return {
      success: true,
      result: parsedOutput.data,
      durationMs: Date.now() - startTime,
    };
  });
}

/**
 * End-to-end sandboxed capability executor combining preflight, verification, and WASM sandbox execution.
 */
export async function executeSandboxedPluginCapability(
  db: D1Database,
  params: {
    companyId: string;
    appId: string;
    capability: string;
    payload: unknown;
    code: string;
    runtimeToken: string;
    secret?: string;
    options?: SandboxExecutionOptions;
  },
): Promise<{ result: unknown; runtimeToken: string; durationMs: number }> {
  const brokerContext: CapabilityBrokerContext = {
    db,
    companyId: params.companyId,
    appId: params.appId,
    version: '1.0.0', // Resolved from token or preflight
    installationId: '',
    runtimeToken: params.runtimeToken,
    secret: params.secret,
  };

  // Extract installationId and version from token
  try {
    const parts = params.runtimeToken.split('.');
    const decoded = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf8'));
    brokerContext.installationId = decoded.installationId;
    brokerContext.version = decoded.pluginVersion;
  } catch {
    throw new ApiError(401, 'Invalid runtime token structure');
  }

  const broker = new CapabilityBroker(brokerContext);

  const sandboxRes = await executeInWasmSandbox(
    params.code,
    params.capability,
    params.payload,
    broker,
    params.options,
  );

  if (!sandboxRes.success) {
    const err = sandboxRes.error;
    const statusCode = sandboxRes.timedOut ? 504 : sandboxRes.memoryExhausted ? 413 : 500;
    throw new ApiError(statusCode, `Plugin Sandbox Error [${err?.class ?? 'Error'}]: ${err?.message ?? 'Unknown error'}`);
  }

  return {
    result: sandboxRes.result,
    runtimeToken: params.runtimeToken,
    durationMs: sandboxRes.durationMs,
  };
}
