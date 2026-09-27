/**
 * ERPFY Hook System (Actions & Filters)
 *
 * Inspired by WordPress hooks, but fully typed for TypeScript.
 * Allows plugins and themes to hook into core lifecycle events and filter data.
 */

type HookCallback = (...args: any[]) => any;

interface HookItem {
  id: string;
  callback: HookCallback;
  priority: number;
}

class HookRegistry {
  private actions: Map<string, HookItem[]> = new Map();
  private filters: Map<string, HookItem[]> = new Map();

  /** Register an action hook */
  addAction(tag: string, callback: HookCallback, priority = 10, id?: string): void {
    const hooks = this.actions.get(tag) || [];
    hooks.push({ id: id || Math.random().toString(36).substring(2), callback, priority });
    hooks.sort((a, b) => a.priority - b.priority);
    this.actions.set(tag, hooks);
  }

  /** Execute an action hook */
  async doAction(tag: string, ...args: any[]): Promise<void> {
    const hooks = this.actions.get(tag);
    if (!hooks) return;
    for (const hook of hooks) {
      await hook.callback(...args);
    }
  }

  /** Register a filter hook */
  addFilter(tag: string, callback: HookCallback, priority = 10, id?: string): void {
    const hooks = this.filters.get(tag) || [];
    hooks.push({ id: id || Math.random().toString(36).substring(2), callback, priority });
    hooks.sort((a, b) => a.priority - b.priority);
    this.filters.set(tag, hooks);
  }

  /** Apply all filters to a value */
  applyFilters<T>(tag: string, value: T, ...args: any[]): T {
    const hooks = this.filters.get(tag);
    if (!hooks) return value;
    let current = value;
    for (const hook of hooks) {
      current = hook.callback(current, ...args);
    }
    return current;
  }

  /** Remove a hook */
  removeHook(tag: string, id: string): void {
    if (this.actions.has(tag)) {
      this.actions.set(tag, this.actions.get(tag)!.filter(h => h.id !== id));
    }
    if (this.filters.has(tag)) {
      this.filters.set(tag, this.filters.get(tag)!.filter(h => h.id !== id));
    }
  }
}

export const hooks = new HookRegistry();

export const addAction = (tag: string, callback: HookCallback, priority = 10) =>
  hooks.addAction(tag, callback, priority);

export const doAction = (tag: string, ...args: any[]) =>
  hooks.doAction(tag, ...args);

export const addFilter = (tag: string, callback: HookCallback, priority = 10) =>
  hooks.addFilter(tag, callback, priority);

export const applyFilters = <T>(tag: string, value: T, ...args: any[]) =>
  hooks.applyFilters(tag, value, ...args);

export default hooks;
