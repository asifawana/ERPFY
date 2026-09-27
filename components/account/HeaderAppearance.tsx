'use client';

/**
 * The portal's colour picker.
 *
 * One choice, whole portal: the colour set here becomes the top bar, the primary buttons,
 * the active navigation, the chart series and every brand tint, because lib/theme.ts derives
 * all of them from it and stamps them on the document root. Nothing here knows which screens
 * exist, and no screen knows this dialog exists.
 *
 * The choice lives in this browser's localStorage rather than on the account. It is a
 * per-viewer preference today; when the portal has a place to store account settings this
 * component keeps its shape and only the read/write moves.
 */

import { useEffect, useState } from 'react';
import { Check, Palette } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import {
  DEFAULT_THEME,
  THEME_PRESETS,
  THEME_STORAGE_KEY,
  applyTheme,
  normalizeTheme,
  themeVars,
} from '@/lib/theme';

export function HeaderAppearance() {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState(DEFAULT_THEME);
  const [notice, setNotice] = useState('');

  useEffect(() => {
    const apply = (value: string | null) => {
      const color = normalizeTheme(value);
      setSelected(color);
      applyTheme(color);
    };
    try {
      apply(localStorage.getItem(THEME_STORAGE_KEY));
    } catch {
      /* The default palette is already on the page, so there is nothing to recover from. */
    }
    // A second tab changing the theme should not leave this one on the old colour.
    const sync = (event: StorageEvent) => {
      if (event.key === THEME_STORAGE_KEY || event.key === null)
        apply(event.newValue);
    };
    window.addEventListener('storage', sync);
    return () => window.removeEventListener('storage', sync);
  }, []);

  function choose(color: string) {
    setSelected(color);
    applyTheme(color);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, color);
      setNotice('Theme saved for this browser.');
    } catch {
      setNotice(
        'Theme applied. Browser storage is unavailable, so it may reset after refresh.',
      );
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          'flex size-8 shrink-0 items-center justify-center rounded-full border border-white/25 bg-black/20 p-1 text-white/90 shadow-xs transition-all hover:bg-black/35 hover:scale-105 hover:text-white active:scale-95 focus:outline-hidden',
          open && 'ring-2 ring-white/40',
        )}
        aria-label="Change portal theme"
        title="Change portal theme"
      >
        <Palette className="size-4" aria-hidden />
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="admin-surface gap-5 sm:max-w-[830px]">
          <div>
            <DialogTitle>Portal theme</DialogTitle>
            <DialogDescription className="mt-1">
              One colour for the whole portal — top bar, buttons, active menu
              and charts. Saved on this browser.
            </DialogDescription>
          </div>

          <fieldset
            className="grid gap-2 sm:grid-cols-2"
            aria-label="Portal theme colours"
          >
            {THEME_PRESETS.map((preset) => {
              const active = selected === preset.color;
              const vars = themeVars(preset.color);
              return (
                <button
                  key={preset.color}
                  type="button"
                  aria-pressed={active}
                  onClick={() => choose(preset.color)}
                  className="flex min-h-[56px] items-center gap-3 rounded-xl border px-3 py-2 text-left text-sm transition-colors"
                  style={{
                    borderColor: active
                      ? vars['--erpfy-brand']
                      : 'var(--erpfy-line)',
                    background: active
                      ? vars['--erpfy-brand-soft']
                      : 'var(--erpfy-surface)',
                    color: active
                      ? vars['--erpfy-brand-soft-ink']
                      : 'var(--erpfy-ink)',
                  }}
                >
                  {/* A preview of the combination, not just the one colour: bar, button, tint. */}
                  <span
                    className="grid size-8 shrink-0 place-items-center rounded-lg text-white"
                    style={{ backgroundColor: preset.color }}
                  >
                    {active && <Check className="size-4" aria-hidden />}
                  </span>
                  <span className="flex-1 font-semibold">{preset.name}</span>
                  <span
                    className="flex shrink-0 items-center gap-1"
                    aria-hidden
                  >
                    <span
                      className="size-3.5 rounded-full"
                      style={{ background: vars['--erpfy-brand-2'] }}
                    />
                    <span
                      className="size-3.5 rounded-full"
                      style={{ background: vars['--erpfy-brand-3'] }}
                    />
                    <span
                      className="size-3.5 rounded-full border"
                      style={{
                        background: vars['--erpfy-brand-soft'],
                        borderColor: vars['--erpfy-brand-line'],
                      }}
                    />
                  </span>
                </button>
              );
            })}
          </fieldset>

          <output className="min-h-5 text-sm text-[var(--erpfy-ink-muted)]">
            {notice}
          </output>

          <div className="flex justify-between gap-2">
            <button
              type="button"
              className="soft-button"
              onClick={() => choose(DEFAULT_THEME)}
            >
              Reset to green
            </button>
            <button
              type="button"
              className="primary-button"
              onClick={() => setOpen(false)}
            >
              Done
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
