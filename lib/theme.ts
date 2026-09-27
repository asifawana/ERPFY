/**
 * Portal theme — one chosen colour, one coordinated palette.
 *
 * The customer picks a single colour in the appearance dialog. Everything that carries the
 * portal's identity is derived from it here: the top bar, primary buttons, active navigation,
 * checkboxes, chart series, and the tinted badges that sit behind brand icons. Nothing else
 * in the app is allowed to hardcode a brand colour — screens read the CSS variables this
 * module produces, so a new preset (or, later, a colour the customer types in) reaches every
 * screen without touching one of them.
 *
 * What is deliberately NOT derived: status colours. "Paid" stays green and "Refunded" stays
 * red whatever the brand is, because those carry meaning rather than identity — a purple
 * theme must not make a paid order look purple.
 *
 * The maths is plain HSL. It is not a perceptual colour space, so the tints of a very dark
 * or fully desaturated base come out grey; that is honest for a black theme rather than a
 * bug, and the alternative — a hand-written palette per preset — would rot the moment a
 * custom colour is allowed.
 */

export type ThemePreset = { name: string; color: string };

/** Recovered from the pre-rebuild lib/theme.ts, now driving the whole portal. */
export const THEME_PRESETS: ThemePreset[] = [
  { name: 'Forest green', color: '#1e5631' },
  { name: 'Emerald', color: '#064e3b' },
  { name: 'Teal ocean', color: '#0f3d3e' },
  { name: 'Classic navy', color: '#1e3a8a' },
  { name: 'Royal indigo', color: '#3730a3' },
  { name: 'Deep purple', color: '#4c1d95' },
  { name: 'Wine crimson', color: '#831843' },
  { name: 'Espresso', color: '#451a03' },
  { name: 'Charcoal slate', color: '#18181b' },
  { name: 'Classic black', color: '#0a0a0a' },
];

/** The portal's own colour: the design as shipped is green, so an untouched browser sees green. */
export const DEFAULT_THEME = '#1e5631';

export const THEME_STORAGE_KEY = 'erpfy_portal_theme';

/** A stored value only counts if it is one we published; anything else falls back. */
export function normalizeTheme(value: string | null | undefined): string {
  if (!value) return DEFAULT_THEME;
  const wanted = value.trim().toLowerCase();
  return THEME_PRESETS.some((preset) => preset.color === wanted)
    ? wanted
    : DEFAULT_THEME;
}

type Hsl = { h: number; s: number; l: number };

function toHsl(hex: string): Hsl {
  const clean = hex.replace('#', '');
  const r = parseInt(clean.slice(0, 2), 16) / 255;
  const g = parseInt(clean.slice(2, 4), 16) / 255;
  const b = parseInt(clean.slice(4, 6), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  const span = max - min;

  if (span === 0) return { h: 0, s: 0, l: l * 100 };

  const s = span / (1 - Math.abs(2 * l - 1));
  const h =
    max === r
      ? ((g - b) / span + (g < b ? 6 : 0)) * 60
      : max === g
        ? ((b - r) / span + 2) * 60
        : ((r - g) / span + 4) * 60;

  return { h, s: s * 100, l: l * 100 };
}

function toHex({ h, s, l }: Hsl): string {
  const sat = Math.min(100, Math.max(0, s)) / 100;
  const lum = Math.min(100, Math.max(0, l)) / 100;
  const c = (1 - Math.abs(2 * lum - 1)) * sat;
  const hue = ((h % 360) + 360) % 360;
  const x = c * (1 - Math.abs(((hue / 60) % 2) - 1));
  const m = lum - c / 2;

  const [r, g, b] =
    hue < 60
      ? [c, x, 0]
      : hue < 120
        ? [x, c, 0]
        : hue < 180
          ? [0, c, x]
          : hue < 240
            ? [0, x, c]
            : hue < 300
              ? [x, 0, c]
              : [c, 0, x];

  const pair = (value: number) =>
    Math.round((value + m) * 255)
      .toString(16)
      .padStart(2, '0');

  return `#${pair(r)}${pair(g)}${pair(b)}`;
}

const shift = (hex: string, next: (hsl: Hsl) => Hsl) => toHex(next(toHsl(hex)));

/**
 * The variables every themed surface reads, as a plain object so both callers can use it:
 * the pre-paint script that stamps them on the document root, and the dialog that previews a
 * preset's combination without applying it.
 */
export function themeVars(base: string): Record<string, string> {
  const color = normalizeTheme(base);
  const { h, s, l } = toHsl(color);

  /* A dark base is already button-dark; a light one is pushed down so white text holds up. */
  const brand = l > 46 ? shift(color, (c) => ({ ...c, l: 40 })) : color;
  const brandHsl = toHsl(brand);

  return {
    /* The top bar, and the strip behind the rounded content corners. */
    '--erpfy-topbar': color,

    /* Solid brand: primary buttons, active tabs, checkboxes, the first chart series. */
    '--erpfy-brand': brand,
    '--erpfy-brand-hover': shift(brand, (c) => ({
      ...c,
      l: Math.max(4, c.l - 6),
    })),
    '--erpfy-brand-on': '#ffffff',

    /* Tinted brand: icon chips, soft badges, hovered rows. Readable ink to match. */
    '--erpfy-brand-soft': toHex({ h, s: s * 0.5, l: 93 }),
    '--erpfy-brand-soft-ink': toHex({
      h,
      s: Math.min(70, s),
      l: Math.min(32, brandHsl.l + 6),
    }),

    /* Focus rings and selected outlines. */
    '--erpfy-brand-line': toHex({ h, s: s * 0.6, l: 78 }),
    '--erpfy-brand-ring': `${brand}59`,

    /* Chart companions to the solid brand — lighter steps of the same hue.
       A grey base has no hue to lift, so it stays grey instead of drifting red. */
    '--erpfy-brand-2': toHex({
      h,
      s: s < 8 ? s : Math.max(12, s * 0.9),
      l: Math.min(62, brandHsl.l + 18),
    }),
    '--erpfy-brand-3': toHex({
      h,
      s: s < 8 ? s : Math.max(10, s * 0.7),
      l: Math.min(80, brandHsl.l + 36),
    }),

    /* The logo chip on the coloured bar, and the avatar. */
    '--erpfy-accent': toHex({ h, s: s * 0.5, l: 93 }),
    '--erpfy-accent-ink': toHex({
      h,
      s: Math.min(70, s),
      l: Math.min(28, brandHsl.l),
    }),
  };
}

/** `--name: value;` pairs, ready to drop inside a `:root { ... }` rule. */
export function themeDeclarations(color: string): string {
  return Object.entries(themeVars(color))
    .map(([name, value]) => `${name}:${value};`)
    .join('');
}

/**
 * Where the live palette lives: a constructed stylesheet holding one `:root` rule.
 *
 * Not an inline style on the document root, which is what this did first — the pre-paint
 * script in ThemeBoot has to write the palette before React hydrates, and an attribute it
 * added to <html> is an attribute the server did not render, which React reports as a
 * hydration mismatch it will not patch up. A constructed stylesheet is invisible to React's
 * reconciler, so the script and the picker can share it without fighting hydration.
 *
 * ThemeBoot's script creates the same sheet and parks it here, so a theme applied before
 * paint is replaced in place rather than stacked behind a second sheet.
 */
const SHEET_HANDLE = '__erpfyThemeSheet';

type ThemeWindow = typeof globalThis & { [SHEET_HANDLE]?: CSSStyleSheet };

export function applyTheme(color: string): void {
  if (typeof document === 'undefined' || typeof CSSStyleSheet === 'undefined')
    return;

  const host = globalThis as ThemeWindow;
  let sheet = host[SHEET_HANDLE];

  if (!sheet) {
    try {
      sheet = new CSSStyleSheet();
    } catch {
      return; /* No constructable stylesheets: the default palette stays. */
    }
    host[SHEET_HANDLE] = sheet;
    document.adoptedStyleSheets = [...document.adoptedStyleSheets, sheet];
  }

  sheet.replaceSync(`:root{${themeDeclarations(color)}}`);
}
