/**
 * ERPFY Core Engine (Equivalent to wp-includes)
 *
 * Provides system-wide APIs, database models, authentication, authorization,
 * event hooks, and theme management.
 */

export * as Auth from './auth';
export * as Db from './db';
export * as Permissions from './permissions';
export * as Hooks from './hooks';
export * as Themes from './themes';
export * as Utils from './utils';

export { hooks, addAction, doAction, addFilter, applyFilters } from './hooks';
export { getInstalledThemes, getActiveTheme, setActiveTheme, registerTheme } from './themes';
