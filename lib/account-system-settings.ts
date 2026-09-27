'use client';

/**
 * Client access to the settings screens.
 *
 * Persistence lives on the server (`/api/settings`), not in this browser. What is kept
 * locally is a cache so a settings panel can paint immediately on a second visit; the
 * server's answer always replaces it, and a failed save never leaves the cache claiming a
 * value the server rejected.
 *
 * Credentials are never held here. The server blanks every secret field on the way out and
 * reports only whether one is configured, so a page that is scraped or a device that is
 * stolen yields no gateway key.
 */

import { useCallback, useEffect, useState } from 'react';

import {
  DEFAULT_ACCOUNT_SYSTEM_SETTINGS,
  normalizeAccountSystemSettings,
  type AccountSystemSettings,
} from '@/lib/settings/schema';

export * from '@/lib/settings/schema';

/** Local paint cache. Not the record of truth — the server is. */
const CACHE_KEY = 'erpfy_settings_cache_v2';
export const ACCOUNT_SYSTEM_SETTINGS_EVENT = 'erpfy:system-settings';

export type SecretStatus = { configured: boolean; updatedAt: number | null };

export type SettingsCompany = {
  id: string;
  name: string;
  role: string;
  canEdit: boolean;
};

export type SettingsState = {
  settings: AccountSystemSettings;
  secrets: Record<string, SecretStatus>;
  company: SettingsCompany | null;
  secretsAvailable: boolean;
  /** 'loading' until the server has answered once. */
  status: 'loading' | 'ready' | 'unavailable';
  message: string;
};

const EMPTY_SECRETS: Record<string, SecretStatus> = {};

export const INITIAL_SETTINGS_STATE: SettingsState = {
  settings: DEFAULT_ACCOUNT_SYSTEM_SETTINGS,
  secrets: EMPTY_SECRETS,
  company: null,
  secretsAvailable: false,
  status: 'loading',
  message: '',
};

function readCache(): AccountSystemSettings {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    return raw
      ? normalizeAccountSystemSettings(JSON.parse(raw))
      : DEFAULT_ACCOUNT_SYSTEM_SETTINGS;
  } catch {
    // A private window, cleared storage or a corrupt entry all mean the same thing here:
    // paint the defaults and wait for the server.
    return DEFAULT_ACCOUNT_SYSTEM_SETTINGS;
  }
}

function writeCache(settings: AccountSystemSettings) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(settings));
  } catch {
    /* The cache is an optimisation; losing it costs a paint, not a setting. */
  }
}

/**
 * Applies the settings that change how the portal itself renders.
 *
 * These are the only settings with an immediate visual effect, and they are applied as data
 * attributes and one custom property so the approved design tokens stay in charge of the
 * actual values (`DESIGN.md` section 3).
 */
export function applyAccountSystemSettings(settings: AccountSystemSettings) {
  const root = document.documentElement;
  root.dataset.erpfyTableDensity = settings.tableDensity;
  root.dataset.erpfyTableStripes = settings.tableStripedRows ? 'on' : 'off';
  let savedThemeMode: string | null = null;
  try {
    savedThemeMode = localStorage.getItem('erpfy_theme_mode');
  } catch {
    /* A blocked storage API falls back to the company default. */
  }
  const darkModeActive =
    savedThemeMode === 'dark' ||
    (savedThemeMode === 'auto' &&
      window.matchMedia('(prefers-color-scheme: dark)').matches) ||
    (savedThemeMode === null && settings.darkMode);
  if (darkModeActive) {
    root.dataset.erpfyDark = 'on';
  } else {
    delete root.dataset.erpfyDark;
  }
  root.dir = settings.rtl ? 'rtl' : 'ltr';
  root.lang = settings.defaultLanguage || 'en';
  root.style.setProperty(
    '--erpfy-table-page-size',
    String(settings.tableRowsPerPage),
  );
}

function announce(settings: AccountSystemSettings) {
  applyAccountSystemSettings(settings);
  window.dispatchEvent(
    new CustomEvent(ACCOUNT_SYSTEM_SETTINGS_EVENT, { detail: settings }),
  );
}

type ServerPayload = {
  settings?: unknown;
  secrets?: Record<string, SecretStatus>;
  company?: SettingsCompany | null;
  secretsAvailable?: boolean;
  error?: string;
};

function absorb(
  payload: ServerPayload,
): Omit<SettingsState, 'status' | 'message'> {
  const settings = normalizeAccountSystemSettings(payload.settings);
  writeCache(settings);
  announce(settings);
  return {
    settings,
    secrets: payload.secrets ?? EMPTY_SECRETS,
    company: payload.company ?? null,
    secretsAvailable: payload.secretsAvailable === true,
  };
}

function url(companyId: string | null): string {
  return companyId
    ? `/api/settings?companyId=${encodeURIComponent(companyId)}`
    : '/api/settings';
}

const inFlightSettings = new Map<string, Promise<{ ok: boolean; payload: ServerPayload }>>();

async function fetchSettingsShared(targetUrl: string): Promise<{ ok: boolean; payload: ServerPayload }> {
  const existing = inFlightSettings.get(targetUrl);
  if (existing) return existing;

  const promise = (async () => {
    try {
      const response = await fetch(targetUrl, {
        headers: { accept: 'application/json' },
      });
      const payload = (await response.json()) as ServerPayload;
      return { ok: response.ok, payload };
    } finally {
      setTimeout(() => {
        inFlightSettings.delete(targetUrl);
      }, 500);
    }
  })();

  inFlightSettings.set(targetUrl, promise);
  return promise;
}

/**
 * Loads settings from the server and returns a saver.
 *
 * `companyId` is passed on every request rather than remembered, so a settings screen can
 * never write a business setting into a company the person merely visited earlier.
 */
export function useAccountSettings(companyId: string | null = null) {
  const [state, setState] = useState<SettingsState>(INITIAL_SETTINGS_STATE);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      // Paint the cache first so the panels are not empty for a round trip. Done inside
      // the async body so the effect itself does not set state synchronously.
      const cached = readCache();
      applyAccountSystemSettings(cached);
      if (!cancelled) setState((current) => ({ ...current, settings: cached }));

      try {
        const { ok, payload } = await fetchSettingsShared(url(companyId));
        if (cancelled) return;

        if (!ok) {
          setState((current) => ({
            ...current,
            status: 'unavailable',
            message: payload.error || 'Settings could not be loaded.',
          }));
          return;
        }
        setState({ ...absorb(payload), status: 'ready', message: '' });
      } catch {
        if (!cancelled) {
          setState((current) => ({
            ...current,
            status: 'unavailable',
            message: 'Settings could not be loaded. Nothing has been changed.',
          }));
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [companyId]);

  const save = useCallback(
    async (
      changes: Partial<AccountSystemSettings>,
    ): Promise<{ ok: boolean; message: string }> => {
      try {
        const response = await fetch('/api/settings', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ companyId, settings: changes }),
        });
        const payload = (await response.json()) as ServerPayload;

        if (!response.ok) {
          // The cache is deliberately not touched: it must not hold a value the server
          // refused, or the next paint would show a setting that was never saved.
          return {
            ok: false,
            message: payload.error || 'These settings were not saved.',
          };
        }

        const absorbed = absorb(payload);
        writeCache(absorbed.settings);
        applyAccountSystemSettings(absorbed.settings);
        if (typeof window !== 'undefined') {
          window.dispatchEvent(
            new CustomEvent(ACCOUNT_SYSTEM_SETTINGS_EVENT, { detail: absorbed.settings }),
          );
        }
        setState({ ...absorbed, status: 'ready', message: '' });
        return { ok: true, message: 'Settings saved.' };
      } catch {
        return {
          ok: false,
          message: 'Settings could not be saved. Nothing has been changed.',
        };
      }
    },
    [companyId],
  );

  const clearSecret = useCallback(
    async (name: string): Promise<{ ok: boolean; message: string }> => {
      if (!companyId) {
        return {
          ok: false,
          message: 'Open an ERP before changing its credentials.',
        };
      }
      try {
        const response = await fetch('/api/settings', {
          method: 'DELETE',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ companyId, secret: name }),
        });
        const payload = (await response.json()) as ServerPayload;
        if (!response.ok) {
          return {
            ok: false,
            message: payload.error || 'The credential was not removed.',
          };
        }
        setState({ ...absorb(payload), status: 'ready', message: '' });
        return { ok: true, message: 'Credential removed.' };
      } catch {
        return {
          ok: false,
          message:
            'The credential could not be removed. Nothing has been changed.',
        };
      }
    },
    [companyId],
  );

  return { ...state, save, clearSecret };
}

/**
 * Read-only view of the settings that affect the shell, for components that render inside
 * it and must not each open their own request.
 *
 * It paints from the cache and then follows whatever `useAccountSettings` last received
 * from the server, so the rail and a settings panel never disagree.
 */
export function useAccountSystemSettings(
  companyId: string | null = null,
): AccountSystemSettings {
  const [settings, setSettings] = useState(DEFAULT_ACCOUNT_SYSTEM_SETTINGS);

  useEffect(() => {
    const sync = () => {
      const next = readCache();
      applyAccountSystemSettings(next);
      setSettings(next);
    };
    sync();

    void fetch(url(companyId), { headers: { accept: 'application/json' } })
      .then(async (response) => {
        if (!response.ok) return;
        const payload = (await response.json()) as ServerPayload;
        const next = normalizeAccountSystemSettings(payload.settings);
        writeCache(next);
        applyAccountSystemSettings(next);
        setSettings(next);
      })
      .catch(() => {
        // The last verified cache remains a useful fallback while the server is offline.
      });

    const onEvent = (event: Event) => {
      const detail = (event as CustomEvent<AccountSystemSettings>).detail;
      if (detail) {
        applyAccountSystemSettings(detail);
        setSettings(detail);
      } else {
        sync();
      }
    };

    window.addEventListener('storage', sync);
    window.addEventListener(ACCOUNT_SYSTEM_SETTINGS_EVENT, onEvent);
    return () => {
      window.removeEventListener('storage', sync);
      window.removeEventListener(ACCOUNT_SYSTEM_SETTINGS_EVENT, onEvent);
    };
  }, [companyId]);

  return settings;
}
