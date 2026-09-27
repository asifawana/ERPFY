'use client';

import { useState } from 'react';
import { CheckCircle2, KeyRound, Lock, ShieldCheck } from 'lucide-react';

import type { DynamicPluginSettingsSection } from '@/lib/settings/plugin-settings';

function formatFieldValue(val: unknown): string {
  if (val === null || val === undefined) return '';
  if (typeof val === 'string') return val;
  if (typeof val === 'number' || typeof val === 'boolean') return String(val);
  if (typeof val === 'object') return JSON.stringify(val);
  return '';
}
import {
  ErpfyCheckbox,
  ErpfyInput,
  ErpfyPanel,
  ErpfyReleaseTag,
  ErpfySelect,
} from '@/lib/design-system';

export function DynamicPluginSettingsPanel({
  section,
  companyId,
  canEdit,
  onSaved,
}: {
  section: DynamicPluginSettingsSection;
  companyId: string;
  canEdit: boolean;
  onSaved?: () => void;
}) {
  const [values, setValues] = useState<Record<string, unknown>>(() => {
    const initial: Record<string, unknown> = {};
    for (const field of section.fields) {
      initial[field.key] = field.value ?? (field.type === 'boolean' ? false : '');
    }
    return initial;
  });

  const [secrets, setSecrets] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{
    tone: 'success' | 'critical';
    text: string;
  } | null>(null);

  const updateValue = (key: string, val: unknown) => {
    setValues((prev) => ({ ...prev, [key]: val }));
    setMessage(null);
  };

  const updateSecret = (key: string, val: string) => {
    setSecrets((prev) => ({ ...prev, [key]: val }));
    setMessage(null);
  };

  async function handleSave() {
    if (!canEdit) return;
    setSaving(true);
    setMessage(null);

    try {
      const payload: Record<string, unknown> = { ...values };
      for (const [secKey, secVal] of Object.entries(secrets)) {
        if (secVal.trim().length > 0) {
          payload[secKey] = secVal;
        }
      }

      const res = await fetch('/api/settings/plugins', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          companyId,
          pluginSlug: section.pluginSlug,
          settings: payload,
        }),
      });

      const json = (await res.json()) as { error?: string };
      if (!res.ok) {
        throw new Error(json.error || 'Failed to save plugin settings.');
      }

      setMessage({
        tone: 'success',
        text: `Settings for ${section.pluginName} saved successfully.`,
      });
      setSecrets({});
      onSaved?.();
    } catch (err) {
      setMessage({
        tone: 'critical',
        text: err instanceof Error ? err.message : 'Failed to save plugin settings.',
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <ErpfyPanel
        title={section.pluginName}
        description={`Configure parameters and integration options for ${section.pluginName} (v${section.version}).`}
      >
        <div className="mb-4 flex flex-wrap items-center gap-2 border-b border-[var(--erpfy-line-soft)] pb-3 text-xs text-[var(--erpfy-muted-foreground)]">
          <span className="font-medium text-[var(--erpfy-foreground)]">Category:</span>
          <span>{section.category}</span>
          <span>•</span>
          <span className="font-medium text-[var(--erpfy-foreground)]">Plugin ID:</span>
          <code className="rounded bg-[var(--erpfy-line-soft)] px-1 py-0.5 text-[11px]">
            {section.pluginSlug}
          </code>
          <span>•</span>
          <ErpfyReleaseTag state="available" />
        </div>

        {message && (
          <div
            className={`mb-4 flex items-center gap-2 rounded-xl border p-3 text-xs font-medium ${
              message.tone === 'success'
                ? 'border-[var(--erpfy-emerald-soft)] bg-[var(--erpfy-emerald-subtle)] text-[var(--erpfy-emerald-dark)]'
                : 'border-[var(--erpfy-critical-soft)] bg-[var(--erpfy-critical-subtle)] text-[var(--erpfy-critical)]'
            }`}
          >
            {message.tone === 'success' ? (
              <CheckCircle2 className="h-4 w-4 shrink-0 text-[var(--erpfy-emerald)]" />
            ) : (
              <Lock className="h-4 w-4 shrink-0" />
            )}
            <span>{message.text}</span>
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          {section.fields.map((field) => {
            if (field.type === 'boolean') {
              return (
                <div
                  key={field.key}
                  className="rounded-xl border border-[var(--erpfy-line-soft)] p-3 sm:col-span-2"
                >
                  <ErpfyCheckbox
                    id={`field-${section.pluginSlug}-${field.key}`}
                    checked={Boolean(values[field.key])}
                    label={field.label}
                    description={`Enable or disable ${field.label.toLowerCase()} for this workspace.`}
                    disabled={!canEdit}
                    onChange={(e) => updateValue(field.key, e.target.checked)}
                  />
                </div>
              );
            }

            if (field.type === 'select') {
              return (
                <div key={field.key} className="space-y-1">
                  <ErpfySelect
                    id={`field-${section.pluginSlug}-${field.key}`}
                    label={field.label}
                    value={formatFieldValue(values[field.key])}
                    disabled={!canEdit}
                    onChange={(e) => updateValue(field.key, e.target.value)}
                  >
                    {(field.options || []).map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </ErpfySelect>
                </div>
              );
            }

            if (field.type === 'secret') {
              return (
                <div
                  key={field.key}
                  className="space-y-1.5 rounded-xl border border-[var(--erpfy-line-soft)] p-3 sm:col-span-2"
                >
                  <div className="flex items-center justify-between">
                    <label
                      htmlFor={`field-${section.pluginSlug}-${field.key}`}
                      className="text-xs font-semibold text-[var(--erpfy-foreground)]"
                    >
                      {field.label}
                    </label>
                    <span
                      className={`inline-flex items-center gap-1 text-[11px] font-medium ${
                        field.isConfigured
                          ? 'text-[var(--erpfy-emerald-dark)]'
                          : 'text-[var(--erpfy-muted-foreground)]'
                      }`}
                    >
                      <ShieldCheck className="h-3.5 w-3.5" />
                      {field.isConfigured
                        ? 'Configured (Encrypted AES-256-GCM)'
                        : 'Not configured'}
                    </span>
                  </div>
                  <div className="relative">
                    <ErpfyInput
                      id={`field-${section.pluginSlug}-${field.key}`}
                      type="password"
                      label=""
                      value={secrets[field.key] ?? ''}
                      placeholder={
                        field.isConfigured
                          ? '•••••••••••••••• (Leave blank to keep unchanged)'
                          : 'Enter secret value'
                      }
                      disabled={!canEdit}
                      onChange={(e) => updateSecret(field.key, e.target.value)}
                    />
                    <KeyRound className="pointer-events-none absolute right-3 top-2.5 h-4 w-4 text-[var(--erpfy-muted-foreground)]" />
                  </div>
                  <p className="text-[11px] text-[var(--erpfy-muted-foreground)]">
                    Protected at rest with AES-256-GCM. Plaintext is never returned to the browser.
                  </p>
                </div>
              );
            }

            // string or number
            return (
              <div key={field.key} className="space-y-1">
                <ErpfyInput
                  id={`field-${section.pluginSlug}-${field.key}`}
                  type={field.type === 'number' ? 'number' : 'text'}
                  label={field.label}
                  value={formatFieldValue(values[field.key])}
                  disabled={!canEdit}
                  onChange={(e) =>
                    updateValue(
                      field.key,
                      field.type === 'number' ? Number(e.target.value) : e.target.value,
                    )
                  }
                />
              </div>
            );
          })}
        </div>

        {canEdit && (
          <div className="mt-6 flex items-center justify-end gap-3 border-t border-[var(--erpfy-line-soft)] pt-4">
            <button
              type="button"
              className="primary-button"
              disabled={saving}
              onClick={handleSave}
            >
              {saving ? 'Saving...' : 'Save Plugin Settings'}
            </button>
          </div>
        )}
      </ErpfyPanel>
    </div>
  );
}
