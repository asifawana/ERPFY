'use client';

import { useState } from 'react';
import {
  X,
  Settings,
  Power,
  Trash2,
  AlertTriangle,
  CheckCircle,
  Loader2,
} from 'lucide-react';

interface ManageAppProps {
  id: string;
  name: string;
  category: string;
  appType?: string;
  isFirstParty?: boolean;
  isFeatured?: boolean;
  isPrivate?: boolean;
  installation: {
    isInstalled: boolean;
    version: string | null;
    enabled: boolean;
    installedAt: string | null;
  };
  latestVersion: {
    version: string;
    packageHash: string;
    requiredScopes: string[];
    dependencies?: { app_id?: string; required?: boolean }[];
  } | null;
  developer: {
    name: string;
    verified: boolean;
  };
}

export function ManagePluginModal({
  isOpen,
  onClose,
  app,
  companyId,
  companyName,
  onUpdated,
}: {
  isOpen: boolean;
  onClose: () => void;
  app: ManageAppProps | null;
  companyId?: string | null;
  companyName?: string | null;
  onUpdated?: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  if (!isOpen || !app) return null;

  const currentApp = app;
  const isEnabled = currentApp.installation.enabled;
  const isFirstParty = Boolean(
    currentApp.isFirstParty ||
    currentApp.appType === 'first_party' ||
    currentApp.isFeatured ||
    currentApp.id === 'erpfy.contacts_crm' ||
    currentApp.developer?.name === 'ERPFY',
  );
  const isPrivate = !isFirstParty && (currentApp.appType === 'private' || currentApp.isPrivate);

  async function handleToggleStatus() {
    if (!companyId || !currentApp) return;
    setLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const res = await fetch('/api/apps/install', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'toggle',
          appId: currentApp.id,
          companyId,
        }),
      });

      const data = (await res.json()) as { success?: boolean; error?: string; enabled?: boolean };
      if (!res.ok || !data.success) {
        setError(data.error || 'Failed to toggle plugin status.');
      } else {
        window.dispatchEvent(
          new CustomEvent('erpfy:apps-changed', { detail: { companyId } }),
        );
        setSuccessMessage(`Plugin ${data.enabled ? 'enabled' : 'disabled'} successfully.`);
        onUpdated?.();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error.');
    } finally {
      setLoading(false);
    }
  }

  async function handleUninstall() {
    if (!companyId || !currentApp) return;
    if (
      !confirm(
        `Are you sure you want to uninstall "${currentApp.name}"? Its menu items and capabilities will be deactivated for this company.`,
      )
    ) {
      return;
    }

    setLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const res = await fetch('/api/apps/install', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'uninstall',
          appId: currentApp.id,
          companyId,
        }),
      });

      const data = (await res.json()) as { success?: boolean; error?: string };
      if (!res.ok || !data.success) {
        setError(data.error || 'Failed to uninstall plugin.');
      } else {
        window.dispatchEvent(
          new CustomEvent('erpfy:apps-changed', { detail: { companyId } }),
        );
        onUpdated?.();
        onClose();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Uninstall failed.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <dialog
      open
      aria-labelledby="manage-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget && !loading) onClose();
      }}
      className="fixed inset-0 z-[100] m-0 h-full w-full max-h-none max-w-none border-0 p-4 flex items-center justify-center overflow-y-auto bg-black/50 backdrop-blur-xs animate-in fade-in duration-200"
    >
      <div className="relative w-full max-w-[620px] rounded-2xl border border-[var(--erpfy-line,#E5E7EB)] bg-white shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--erpfy-line-soft,#F3F4F6)] px-6 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex size-8 items-center justify-center rounded-lg bg-[#F3F4F6] text-[#374151]">
              <Settings className="size-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 id="manage-modal-title" className="text-base font-bold text-[#111827]">
                  {app.name}
                </h2>
                {isFirstParty ? (
                  <span className="rounded-md bg-[var(--erpfy-brand-soft,#DCFCE7)] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[var(--erpfy-brand,#15803D)]">
                    Foundation
                  </span>
                ) : isPrivate ? (
                  <span className="rounded-md bg-[#FEF3C7] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#B45309]">
                    Private
                  </span>
                ) : null}
              </div>
              <p className="text-xs text-[#6B7280]">
                Manage workspace installation for{' '}
                <span className="font-semibold text-[#111827]">
                  {companyName || companyId}
                </span>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-lg p-1 text-[#6B7280] hover:bg-[#F3F4F6] transition"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Details Content */}
        <div className="max-h-[70vh] overflow-y-auto p-6 space-y-4">
          {successMessage && (
            <div className="rounded-xl border border-[#BBF7D0] bg-[#F0FDF4] p-3 text-xs text-[#15803D] flex items-center gap-2">
              <CheckCircle className="size-4 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {error && (
            <div className="rounded-xl border border-[#FCA5A5] bg-[#FEF2F2] p-3 text-xs text-[#B91C1C] flex items-center gap-2">
              <AlertTriangle className="size-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="rounded-xl border border-[#E5E7EB] bg-white divide-y divide-[#F3F4F6] text-xs">
            <div className="flex justify-between p-3">
              <span className="text-[#6B7280]">Current Status:</span>
              <span
                className={
                  isEnabled
                    ? 'font-bold text-[#15803D] flex items-center gap-1'
                    : 'font-bold text-[#6B7280] flex items-center gap-1'
                }
              >
                <span
                  className={`size-2 rounded-full ${
                    isEnabled ? 'bg-[#15803D]' : 'bg-[#9CA3AF]'
                  }`}
                />
                {isEnabled ? 'Active / Enabled' : 'Disabled'}
              </span>
            </div>
            <div className="flex justify-between p-3">
              <span className="text-[#6B7280]">Installed Version:</span>
              <span className="font-semibold text-[#111827]">
                {app.installation.version || app.latestVersion?.version || '1.0.0'}
              </span>
            </div>
            <div className="flex justify-between p-3">
              <span className="text-[#6B7280]">Classification:</span>
              <span className="font-semibold text-[#111827]">
                {isFirstParty
                  ? 'First-party / Official ERPFY Foundation'
                  : isPrivate
                    ? 'Private (Current Workspace Only)'
                    : 'Public (Marketplace)'}
              </span>
            </div>
            <div className="flex justify-between p-3">
              <span className="text-[#6B7280]">Publisher:</span>
              <span className="font-medium text-[#111827]">
                {isFirstParty
                  ? 'ERPFY'
                  : (currentApp.developer?.name || 'Private Tenant Apps').replace(/\s*\([a-f0-9-]{8,}\)/i, '')}
              </span>
            </div>
            {app.latestVersion?.packageHash && (
              <div className="p-3 space-y-1">
                <span className="text-[#6B7280]">Package Hash:</span>
                <p className="font-mono text-[11px] text-[#374151] break-all bg-[#F9FAFB] p-1.5 rounded">
                  {app.latestVersion.packageHash}
                </p>
              </div>
            )}
            {app.latestVersion?.requiredScopes && app.latestVersion.requiredScopes.length > 0 && (
              <div className="p-3 space-y-1.5">
                <span className="text-[#6B7280]">Granted Permissions:</span>
                <div className="flex flex-wrap gap-1">
                  {app.latestVersion.requiredScopes.map((scope) => (
                    <span
                      key={scope}
                      className="rounded bg-[#F3F4F6] px-2 py-0.5 font-mono text-[11px] text-[#374151]"
                    >
                      {scope}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between border-t border-[var(--erpfy-line-soft,#F3F4F6)] bg-[#F9FAFB] px-6 py-4">
          <button
            type="button"
            onClick={handleUninstall}
            disabled={loading}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[#FCA5A5] bg-white px-3 py-1.5 text-xs font-semibold text-[#DC2626] hover:bg-[#FEF2F2] transition disabled:opacity-50"
          >
            <Trash2 className="size-3.5" />
            <span>Uninstall</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="soft-button"
            >
              Close
            </button>
            <button
              type="button"
              onClick={handleToggleStatus}
              disabled={loading}
              className={
                isEnabled
                  ? 'inline-flex items-center gap-1.5 rounded-lg border border-[#D1D5DB] bg-white px-3 py-1.5 text-xs font-semibold text-[#374151] hover:bg-[#F3F4F6] transition disabled:opacity-50'
                  : 'primary-button'
              }
            >
              {loading ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Power className="size-3.5" />
              )}
              <span>{isEnabled ? 'Disable Plugin' : 'Enable Plugin'}</span>
            </button>
          </div>
        </div>
      </div>
    </dialog>
  );
}
