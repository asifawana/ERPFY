'use client';

import { ChangeEvent, useState } from 'react';
import { Upload, X } from 'lucide-react';

import type { AccountSystemSettings } from '@/lib/account-system-settings';
import {
  ErpfyButton,
  ErpfyCheckbox,
  ErpfyInput,
  ErpfyPanel,
} from '@/lib/design-system';

export function AppearanceSettingsPanel({
  settings,
  onChange,
  onSave,
}: {
  settings: AccountSystemSettings;
  onChange: (settings: AccountSystemSettings) => void;
  onSave?: () => void;
}) {
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const update = <K extends keyof AccountSystemSettings>(
    key: K,
    value: AccountSystemSettings[K],
  ) => onChange({ ...settings, [key]: value });

  function handleFileUpload(
    event: ChangeEvent<HTMLInputElement>,
    field: 'companyLogoDataUrl' | 'companyFaviconDataUrl',
  ) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    if (!['image/png', 'image/jpeg', 'image/webp', 'image/x-icon', 'image/vnd.microsoft.icon', 'image/svg+xml'].includes(file.type)) {
      setErrorMsg('Please choose an image file (PNG, JPG, WebP, ICO, SVG).');
      return;
    }
    if (file.size > 512 * 1024) {
      setErrorMsg('File must be 512 KB or smaller.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        update(field, reader.result);
        setErrorMsg(null);
      }
    };
    reader.onerror = () => setErrorMsg('Failed to read selected image.');
    reader.readAsDataURL(file);
  }

  return (
    <div className="space-y-5">
      <ErpfyPanel
        title="Appearance"
        description="Branding and login page look."
      >
        {errorMsg && (
          <div className="mb-4 rounded-xl border border-[var(--erpfy-bad-ink)] bg-[var(--erpfy-bad-bg)] px-4 py-2.5 text-xs font-semibold text-[var(--erpfy-bad-ink)]">
            {errorMsg}
          </div>
        )}

        {/* General Branding Section */}
        <div className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label
                htmlFor="appearance-company-name"
                className="mb-1.5 block text-xs font-semibold text-[var(--erpfy-ink)]"
              >
                Company Name
              </label>
              <ErpfyInput
                id="appearance-company-name"
                value={settings.companyName}
                placeholder="Stocky | Ultimate Inventory With POS"
                onChange={(e) => update('companyName', e.target.value)}
              />
            </div>

            <div>
              <label
                htmlFor="appearance-page-title-suffix"
                className="mb-1.5 block text-xs font-semibold text-[var(--erpfy-ink)]"
              >
                Page title suffix
              </label>
              <ErpfyInput
                id="appearance-page-title-suffix"
                value={settings.pageTitleSuffix}
                placeholder="Ultimate Inventory With POS"
                onChange={(e) => update('pageTitleSuffix', e.target.value)}
              />
            </div>

            <div>
              <label
                htmlFor="appearance-developed-by"
                className="mb-1.5 block text-xs font-semibold text-[var(--erpfy-ink)]"
              >
                Developed by
              </label>
              <ErpfyInput
                id="appearance-developed-by"
                value={settings.companyDevelopedBy}
                placeholder="Stocky"
                onChange={(e) => update('companyDevelopedBy', e.target.value)}
              />
            </div>

            <div>
              <label
                htmlFor="appearance-footer"
                className="mb-1.5 block text-xs font-semibold text-[var(--erpfy-ink)]"
              >
                Footer
              </label>
              <ErpfyInput
                id="appearance-footer"
                value={settings.companyFooter}
                placeholder="© 2026 Stocky. All rights reserved."
                onChange={(e) => update('companyFooter', e.target.value)}
              />
            </div>
          </div>

          {/* Change Logo & Favicon + Checkboxes */}
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 pt-2">
            {/* Logo */}
            <div>
              <p className="mb-2 text-xs font-semibold text-[var(--erpfy-ink)]">
                Change Logo
              </p>
              <div className="flex items-center gap-3">
                <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-[var(--erpfy-line-soft)] bg-white px-3.5 py-2 text-xs font-semibold text-[var(--erpfy-ink)] shadow-2xs hover:bg-neutral-50 transition-colors">
                  <Upload className="size-3.5 text-[var(--erpfy-ink-muted)]" />
                  Choose File
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/svg+xml"
                    className="sr-only"
                    onChange={(e) => handleFileUpload(e, 'companyLogoDataUrl')}
                  />
                </label>
                {settings.companyLogoDataUrl && (
                  <div className="flex items-center gap-2">
                    <span
                      aria-label="Logo preview"
                      style={{
                        backgroundImage: `url(${settings.companyLogoDataUrl})`,
                        backgroundSize: 'contain',
                        backgroundRepeat: 'no-repeat',
                        backgroundPosition: 'center',
                      }}
                      className="h-8 w-20 rounded border border-neutral-200 p-0.5 bg-neutral-50 inline-block"
                    />
                    <button
                      type="button"
                      title="Remove Logo"
                      onClick={() => update('companyLogoDataUrl', '')}
                      className="rounded p-1 text-neutral-400 hover:text-red-600 transition-colors"
                    >
                      <X className="size-4" />
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Favicon */}
            <div>
              <p className="mb-2 text-xs font-semibold text-[var(--erpfy-ink)]">
                Change Favicon
              </p>
              <div className="flex items-center gap-3">
                <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-[var(--erpfy-line-soft)] bg-white px-3.5 py-2 text-xs font-semibold text-[var(--erpfy-ink)] shadow-2xs hover:bg-neutral-50 transition-colors">
                  <Upload className="size-3.5 text-[var(--erpfy-ink-muted)]" />
                  Choose File
                  <input
                    type="file"
                    accept="image/x-icon,image/png,image/svg+xml"
                    className="sr-only"
                    onChange={(e) => handleFileUpload(e, 'companyFaviconDataUrl')}
                  />
                </label>
                {settings.companyFaviconDataUrl && (
                  <div className="flex items-center gap-2">
                    <span
                      aria-label="Favicon preview"
                      style={{
                        backgroundImage: `url(${settings.companyFaviconDataUrl})`,
                        backgroundSize: 'contain',
                        backgroundRepeat: 'no-repeat',
                        backgroundPosition: 'center',
                      }}
                      className="size-6 rounded border border-neutral-200 p-0.5 bg-neutral-50 inline-block"
                    />
                    <button
                      type="button"
                      title="Remove Favicon"
                      onClick={() => update('companyFaviconDataUrl', '')}
                      className="rounded p-1 text-neutral-400 hover:text-red-600 transition-colors"
                    >
                      <X className="size-4" />
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Checkbox Toggles */}
            <div className="space-y-3 pt-1">
              <ErpfyCheckbox
                id="appearance-dark-mode"
                label="Dark mode (default theme)"
                checked={settings.darkMode}
                onChange={(e) => update('darkMode', e.target.checked)}
              />
              <ErpfyCheckbox
                id="show-customize-btn"
                label="Show customize button"
                checked={settings.showCustomizeButton}
                onChange={(e) => update('showCustomizeButton', e.target.checked)}
              />
              <ErpfyCheckbox
                id="hide-site-name"
                label="Hide site name"
                checked={settings.hideSiteName}
                onChange={(e) => update('hideSiteName', e.target.checked)}
              />
            </div>
          </div>
        </div>

        {/* Login Page Section */}
        <div className="mt-8 border-t border-[var(--erpfy-line-soft)] pt-6">
          <h3 className="text-sm font-bold text-[var(--erpfy-ink)] tracking-tight">
            Login page
          </h3>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <label
                htmlFor="login-hero-title"
                className="mb-1.5 block text-xs font-semibold text-[var(--erpfy-ink)]"
              >
                Hero title
              </label>
              <ErpfyInput
                id="login-hero-title"
                value={settings.loginHeroTitle}
                onChange={(e) => update('loginHeroTitle', e.target.value)}
              />
            </div>

            <div>
              <label
                htmlFor="login-hero-subtitle"
                className="mb-1.5 block text-xs font-semibold text-[var(--erpfy-ink)]"
              >
                Hero subtitle
              </label>
              <ErpfyInput
                id="login-hero-subtitle"
                value={settings.loginHeroSubtitle}
                onChange={(e) => update('loginHeroSubtitle', e.target.value)}
              />
            </div>

            <div>
              <label
                htmlFor="login-panel-title"
                className="mb-1.5 block text-xs font-semibold text-[var(--erpfy-ink)]"
              >
                Panel title
              </label>
              <ErpfyInput
                id="login-panel-title"
                value={settings.loginPanelTitle}
                onChange={(e) => update('loginPanelTitle', e.target.value)}
              />
            </div>

            <div>
              <label
                htmlFor="login-panel-subtitle"
                className="mb-1.5 block text-xs font-semibold text-[var(--erpfy-ink)]"
              >
                Panel subtitle
              </label>
              <ErpfyInput
                id="login-panel-subtitle"
                value={settings.loginPanelSubtitle}
                onChange={(e) => update('loginPanelSubtitle', e.target.value)}
              />
            </div>

            <div>
              <label
                htmlFor="login-hero-badge"
                className="mb-1.5 block text-xs font-semibold text-[var(--erpfy-ink)]"
              >
                Hero badge
              </label>
              <ErpfyInput
                id="login-hero-badge"
                value={settings.loginHeroBadge}
                onChange={(e) => update('loginHeroBadge', e.target.value)}
              />
            </div>

            <div>
              <label
                htmlFor="login-hero-feature-1"
                className="mb-1.5 block text-xs font-semibold text-[var(--erpfy-ink)]"
              >
                Hero feature 1
              </label>
              <ErpfyInput
                id="login-hero-feature-1"
                value={settings.loginHeroFeature1}
                onChange={(e) => update('loginHeroFeature1', e.target.value)}
              />
            </div>

            <div>
              <label
                htmlFor="login-hero-feature-2"
                className="mb-1.5 block text-xs font-semibold text-[var(--erpfy-ink)]"
              >
                Hero feature 2
              </label>
              <ErpfyInput
                id="login-hero-feature-2"
                value={settings.loginHeroFeature2}
                onChange={(e) => update('loginHeroFeature2', e.target.value)}
              />
            </div>

            <div>
              <label
                htmlFor="login-hero-feature-3"
                className="mb-1.5 block text-xs font-semibold text-[var(--erpfy-ink)]"
              >
                Hero feature 3
              </label>
              <ErpfyInput
                id="login-hero-feature-3"
                value={settings.loginHeroFeature3}
                onChange={(e) => update('loginHeroFeature3', e.target.value)}
              />
            </div>

            <div>
              <label
                htmlFor="login-button-text"
                className="mb-1.5 block text-xs font-semibold text-[var(--erpfy-ink)]"
              >
                Login button text
              </label>
              <ErpfyInput
                id="login-button-text"
                value={settings.loginButtonText}
                onChange={(e) => update('loginButtonText', e.target.value)}
              />
            </div>

            <div>
              <label
                htmlFor="login-footer-text"
                className="mb-1.5 block text-xs font-semibold text-[var(--erpfy-ink)]"
              >
                Login footer text
              </label>
              <ErpfyInput
                id="login-footer-text"
                value={settings.loginFooterText}
                onChange={(e) => update('loginFooterText', e.target.value)}
              />
            </div>
          </div>

          {/* Background color */}
          <div className="mt-5">
            <label
              htmlFor="login-bg-color"
              className="mb-1.5 block text-xs font-semibold text-[var(--erpfy-ink)]"
            >
              Background color
            </label>
            <div className="flex items-center gap-3">
              <div className="relative">
                <input
                  id="login-bg-color"
                  type="color"
                  value={settings.loginBackgroundColor || '#1e5631'}
                  onChange={(e) => update('loginBackgroundColor', e.target.value)}
                  className="size-9 cursor-pointer rounded-lg border border-[var(--erpfy-line-soft)] p-0.5"
                />
              </div>
              <ErpfyInput
                value={settings.loginBackgroundColor || '#1e5631'}
                onChange={(e) => update('loginBackgroundColor', e.target.value)}
                className="w-36 font-mono text-xs"
              />
            </div>
          </div>
        </div>

        {/* Bottom Submit Button */}
        {onSave && (
          <div className="mt-8 border-t border-[var(--erpfy-line-soft)] pt-5">
            <ErpfyButton tone="primary" onClick={onSave} className="px-6 py-2">
              Submit
            </ErpfyButton>
          </div>
        )}
      </ErpfyPanel>
    </div>
  );
}
