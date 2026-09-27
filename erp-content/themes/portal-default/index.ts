/**
 * ERPFY Portal Default Theme (100% Self-Contained Theme Package)
 *
 * Equivalent to a full WordPress theme (style.css, header, sidebar, shell, tokens, theme.json).
 * Packaging the approved baseline design into an independent, pluggable theme.
 */

import themeConfig from './theme.json';

export * from './tokens';
export * as Primitives from './components/Primitives';
export * as Header from './components/Header';
export { ThemeShell } from './components/Shell';

export const THEME_MANIFEST = themeConfig;

export default themeConfig;
