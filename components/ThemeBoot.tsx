/**
 * Puts the customer's chosen theme on the page before the first paint.
 *
 * Without this the server renders the default green, the browser paints it, and the effect
 * that reads localStorage then repaints the whole portal — a visible green flash on every
 * full page load of a purple portal.
 *
 * The palettes are computed here, on the server, from lib/theme.ts, and only the lookup runs
 * in the browser. That way the derivation lives in exactly one place: this script cannot
 * drift from the palette the rest of the app renders.
 *
 * The script writes a constructed stylesheet rather than an inline style on <html>: an
 * attribute added before hydration is an attribute the server did not render, which React
 * reports as a mismatch it will not repair. It parks the sheet where lib/theme.ts looks for
 * it, so a later change replaces this rule instead of stacking another sheet on top.
 */

import {
  THEME_PRESETS,
  THEME_STORAGE_KEY,
  themeDeclarations,
} from '@/lib/theme';

const RULES = Object.fromEntries(
  THEME_PRESETS.map((preset) => [
    preset.color,
    themeDeclarations(preset.color),
  ]),
);

export function ThemeBoot() {
  const script =
    `try{` +
    `var m=localStorage.getItem('erpfy_theme_mode');` +
    `if(m==='dark'||(m==='auto'&&window.matchMedia('(prefers-color-scheme: dark)').matches)){` +
    `document.documentElement.setAttribute('data-erpfy-dark','on');}` +
    `var r=${JSON.stringify(RULES)}[localStorage.getItem(${JSON.stringify(THEME_STORAGE_KEY)})];` +
    `if(r){var s=new CSSStyleSheet();s.replaceSync(":root{"+r+"}");` +
    `document.adoptedStyleSheets=[...document.adoptedStyleSheets,s];window.__erpfyThemeSheet=s;}}catch(e){}`;

  // Built from a fixed list on the server; no part of it comes from the request.
  return <script dangerouslySetInnerHTML={{ __html: script }} />;
}
