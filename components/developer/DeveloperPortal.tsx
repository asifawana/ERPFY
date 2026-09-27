'use client';

import { useState, useEffect } from 'react';
import {
  Code,
  Shield,
  Key,
  Plus,
  Layers,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Lock,
  RefreshCw,
  Terminal,
} from 'lucide-react';
import {
  ErpfyButton,
  ErpfyInput,
  ErpfySelect,
  ErpfyTextarea,
  ErpfyStatus,
} from '@/lib/design-system';

interface DevProfile {
  id: string;
  name: string;
  slug: string;
  websiteUrl?: string;
  contactEmail: string;
  verified: boolean;
  status: string;
}

interface AppItem {
  id: string;
  slug: string;
  name: string;
  tagline: string;
  description: string;
  category: string;
  appType: string;
  status: string;
  isKilled: boolean;
  killReason?: string;
  installedCount: number;
  publishedAt?: string;
  createdAt: string;
}

interface VersionItem {
  id: string;
  version: string;
  changelog?: string;
  reviewStatus: string;
  status?: string;
  securityScanStatus?: string;
  signature?: string;
  reviewMessages?: { message: string }[];
  releaseId?: string;
  signedAt?: number;
  packageHash?: string;
  createdAt: number;
}

interface CredentialItem {
  id: string;
  clientId: string;
  label?: string;
  name?: string;
  role?: string;
  environment?: string;
  status?: string;
  createdAt: number;
}

interface ScanResultIssue {
  severity: string;
  message: string;
}

interface ScanResult {
  passed: boolean;
  issues?: ScanResultIssue[];
}

export function DeveloperPortal() {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<DevProfile | null>(null);
  const [apps, setApps] = useState<AppItem[]>([]);
  const [activeTab, setActiveTab] = useState<'apps' | 'credentials' | 'docs' | 'admin'>('apps');
  const [selectedApp, setSelectedApp] = useState<AppItem | null>(null);

  // Registration modal / form state
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regWebsite, setRegWebsite] = useState('');
  const [submittingReg, setSubmittingReg] = useState(false);

  // New App Wizard modal
  const [showNewAppModal, setShowNewAppModal] = useState(false);
  const [newAppName, setNewAppName] = useState('');
  const [newAppSlug, setNewAppSlug] = useState('');
  const [newAppTagline, setNewAppTagline] = useState('');
  const [newAppDesc, setNewAppDesc] = useState('');
  const [newAppCategory, setNewAppCategory] = useState('Sales');
  const [newAppType, setNewAppType] = useState<'embedded' | 'standalone' | 'webhook_only'>('embedded');
  const [creatingApp, setCreatingApp] = useState(false);

  // Version management
  const [versions, setVersions] = useState<VersionItem[]>([]);
  const [loadingVersions, setLoadingVersions] = useState(false);
  const [showNewVersionModal, setShowNewVersionModal] = useState(false);
  const [verSemver, setVerSemver] = useState('1.0.0');
  const [verChangelog, setVerChangelog] = useState('');
  const [verManifestRaw, setVerManifestRaw] = useState('');
  const [verCodeBundle, setVerCodeBundle] = useState('');
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [uploadingVersion, setUploadingVersion] = useState(false);

  // Credentials
  const [credentials, setCredentials] = useState<CredentialItem[]>([]);
  const [loadingCreds, setLoadingCreds] = useState(false);
  const [newCredSecret, setNewCredSecret] = useState<string | null>(null);

  const loadProfileAndApps = async () => {
    setLoading(true);
    try {
      const pRes = await fetch('/api/developer/profile');
      if (pRes.ok) {
        const pData = (await pRes.json()) as { profile?: DevProfile };
        setProfile(pData.profile || null);
      }

      const aRes = await fetch('/api/developer/apps');
      if (aRes.ok) {
        const aData = (await aRes.json()) as { apps?: AppItem[] };
        setApps(aData.apps || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const animId = requestAnimationFrame(() => {
      void loadProfileAndApps();
    });
    return () => cancelAnimationFrame(animId);
  }, []);

  async function handleRegister(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmittingReg(true);
    try {
      const res = await fetch('/api/developer/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organizationName: regName,
          contactEmail: regEmail,
          websiteUrl: regWebsite,
        }),
      });
      if (res.ok) {
        const data = (await res.json()) as { profile?: DevProfile };
        setProfile(data.profile || null);
      } else {
        const err = (await res.json()) as { error?: string };
        alert(err.error || 'Failed to register');
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to register');
    } finally {
      setSubmittingReg(false);
    }
  }

  async function handleCreateApp(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    setCreatingApp(true);
    try {
      const res = await fetch('/api/developer/apps', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newAppName,
          slug: newAppSlug || newAppName.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
          tagline: newAppTagline,
          description: newAppDesc,
          category: newAppCategory,
          appType: newAppType,
        }),
      });
      if (res.ok) {
        setShowNewAppModal(false);
        setNewAppName('');
        setNewAppSlug('');
        setNewAppTagline('');
        setNewAppDesc('');
        void loadProfileAndApps();
      } else {
        const err = (await res.json()) as { error?: string };
        alert(err.error || 'Failed to create app');
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to create app');
    } finally {
      setCreatingApp(false);
    }
  }

  async function openAppDetails(app: AppItem) {
    setSelectedApp(app);
    setLoadingVersions(true);
    try {
      const res = await fetch(`/api/developer/apps/${app.id}/versions`);
      if (res.ok) {
        const data = (await res.json()) as { versions?: VersionItem[] };
        setVersions(data.versions || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingVersions(false);
    }
  }

  async function handleUploadVersion(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!selectedApp) return;
    setUploadingVersion(true);
    setScanResult(null);

    let parsedManifest: Record<string, unknown>;
    try {
      parsedManifest = JSON.parse(verManifestRaw) as Record<string, unknown>;
    } catch {
      alert('Manifest must be valid JSON matching EAP v1 specifications.');
      setUploadingVersion(false);
      return;
    }

    try {
      const res = await fetch(`/api/developer/apps/${selectedApp.id}/versions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          version: verSemver,
          changelog: verChangelog,
          manifest: parsedManifest,
          codeBundle: verCodeBundle,
        }),
      });

      const data = (await res.json()) as { scan?: ScanResult; error?: string };
      if (res.ok) {
        setScanResult(data.scan || null);
        // Refresh versions list
        void openAppDetails(selectedApp);
      } else {
        alert(data.error || 'Failed to upload version');
        if (data.scan) setScanResult(data.scan);
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploadingVersion(false);
    }
  }

  async function handleSubmitForReview(versionId: string) {
    if (!selectedApp) return;
    if (profile?.status !== 'verified') {
      alert(
        'Developer organization verification required: Your organization is currently Pending Verification. Only verified partners can submit applications for Platform Admin review.',
      );
      return;
    }
    if (!confirm('Submit this version for ERPFY Platform Admin Review? Automated scan must have passed.')) return;

    try {
      const res = await fetch(`/api/developer/apps/${selectedApp.id}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ versionId }),
      });
      const data = (await res.json()) as { error?: string };
      if (res.ok) {
        alert('Submitted for review! Platform team has been notified.');
        void openAppDetails(selectedApp);
      } else {
        alert(data.error || 'Submission rejected');
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Submit failed');
    }
  }

  async function loadCredentials() {
    setLoadingCreds(true);
    try {
      const res = await fetch('/api/developer/credentials');
      if (res.ok) {
        const data = (await res.json()) as { credentials?: CredentialItem[] };
        setCredentials(data.credentials || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingCreds(false);
    }
  }

  async function handleGenerateCredential(appId?: string) {
    const isVerified = profile?.status === 'verified';
    const envChoice = prompt(
      isVerified
        ? "Enter environment: 'development' (Sandbox) or 'production':"
        : "Unverified organization: Only 'development' (Sandbox) keys can be generated before verification. Continue with 'development'?",
      'development',
    );
    if (!envChoice) return;
    const environment = envChoice.trim().toLowerCase() === 'production' ? 'production' : 'development';

    if (environment === 'production' && !isVerified) {
      alert(
        'Production credentials require Platform Admin verification. You can generate Development credentials for sandbox testing.',
      );
      return;
    }

    const label = prompt(
      'Enter a label for this credential key:',
      environment === 'production' ? 'Production API Key' : 'Sandbox API Key',
    );
    if (!label) return;

    try {
      const res = await fetch('/api/developer/credentials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          appId: appId || undefined,
          label,
          environment,
          scopes: ['orders.read', 'invoices.read', 'customers.read'],
        }),
      });
      const data = (await res.json()) as { clientSecret?: string; error?: string };
      if (res.ok) {
        setNewCredSecret(data.clientSecret || null);
        void loadCredentials();
      } else {
        alert(data.error || 'Failed to create credential');
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to generate credential');
    }
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <RefreshCw className="size-6 animate-spin text-[var(--erpfy-ink-muted)]" />
      </div>
    );
  }

  // If user does not have a developer organization profile yet, show onboarding
  if (!profile) {
    return (
      <div className="mx-auto max-w-2xl py-12">
        <div className="rounded-2xl border border-[#E5E7EB] bg-white p-8 shadow-xs">
          <div className="flex items-center gap-3">
            <span className="grid size-12 place-items-center rounded-xl bg-[var(--erpfy-brand)] text-white shadow-xs">
              <Code className="size-6" />
            </span>
            <div>
              <h2 className="text-xl font-bold tracking-tight text-[#111827]">
                Join ERPFY Developer Ecosystem
              </h2>
              <p className="text-xs text-[#6B7280]">
                Build apps and extensions under ERP App Protocol (EAP v1).
              </p>
            </div>
          </div>

          <div className="mt-6 space-y-3 rounded-xl bg-[#F9FAFB] p-4 text-xs text-[#4B5563]">
            <div className="flex items-center gap-2 font-semibold text-[#111827]">
              <Shield className="size-4 text-[var(--erpfy-brand)]" />
              Platform Guarantees:
            </div>
            <p>• Zero code leakage: All plugins execute directly inside secured ERPFY tenant runtime.</p>
            <p>• Cryptographic release signing via HMAC-SHA256.</p>
            <p>• Fine-grained permission scopes protecting customer data.</p>
          </div>

          <form onSubmit={handleRegister} className="mt-6 space-y-4">
            <ErpfyInput
              id="orgName"
              label="Organization or Developer Name"
              placeholder="e.g. Acme Integrations Lab"
              value={regName}
              onChange={(e) => setRegName(e.target.value)}
              required
            />
            <ErpfyInput
              id="orgEmail"
              label="Contact / Security Email"
              type="email"
              placeholder="developer@acme.com"
              value={regEmail}
              onChange={(e) => setRegEmail(e.target.value)}
              required
            />
            <ErpfyInput
              id="orgWebsite"
              label="Website or Portfolio URL"
              type="url"
              placeholder="https://acme.com"
              value={regWebsite}
              onChange={(e) => setRegWebsite(e.target.value)}
            />

            <div className="pt-2">
              <ErpfyButton
                type="submit"
                tone="primary"
                disabled={submittingReg}
                className="w-full justify-center"
              >
                {submittingReg ? 'Creating Developer Account...' : 'Register Developer Organization'}
              </ErpfyButton>
            </div>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Bar / Dev Org Status */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-[#E5E7EB] bg-white p-5 shadow-xs">
        <div className="flex items-center gap-3.5">
          <span className="grid size-11 place-items-center rounded-xl bg-[var(--erpfy-brand)] text-white shadow-xs font-bold">
            <Code className="size-5" />
          </span>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-[#111827]">{profile.name}</h2>
              {profile.status === 'verified' || profile.verified ? (
                <ErpfyStatus tone="success">Verified Partner</ErpfyStatus>
              ) : profile.status === 'rejected' ? (
                <ErpfyStatus tone="critical">Rejected</ErpfyStatus>
              ) : profile.status === 'suspended' ? (
                <ErpfyStatus tone="critical">Suspended</ErpfyStatus>
              ) : (
                <ErpfyStatus tone="attention">Pending Verification</ErpfyStatus>
              )}
            </div>
            <p className="text-xs text-[#6B7280]">EAP Protocol v1.0 · Contact: {profile.contactEmail}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <ErpfyButton
            tone="primary"
            onClick={() => setShowNewAppModal(true)}
            className="flex items-center gap-1.5"
          >
            <Plus className="size-4" />
            Create App
          </ErpfyButton>
        </div>
      </div>

      {/* Pending verification notice banner */}
      {profile.status !== 'verified' && (
        <div className="flex items-center gap-3 rounded-xl border border-[#FDE68A] bg-[#FEF3C7] p-4 text-xs text-[#92400E]">
          <AlertTriangle className="size-5 shrink-0 text-[#D97706]" />
          <div>
            <span className="font-bold">Organization Status: Pending Platform Verification.</span>{' '}
            You can create draft apps, upload test versions, and generate sandbox API keys. Submitting apps for Platform Review and obtaining Production API credentials requires Platform Admin verification.
          </div>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex border-b border-[#E5E7EB]">
        <button
          type="button"
          onClick={() => { setActiveTab('apps'); setSelectedApp(null); }}
          className={`flex items-center gap-2 border-b-2 px-5 py-3 text-xs font-semibold transition-colors ${
            activeTab === 'apps'
              ? 'border-[var(--erpfy-brand)] text-[var(--erpfy-brand)]'
              : 'border-transparent text-[#6B7280] hover:text-[#111827]'
          }`}
        >
          <Layers className="size-4" />
          My Apps ({apps.length})
        </button>

        <button
          type="button"
          onClick={() => { setActiveTab('credentials'); void loadCredentials(); setSelectedApp(null); }}
          className={`flex items-center gap-2 border-b-2 px-5 py-3 text-xs font-semibold transition-colors ${
            activeTab === 'credentials'
              ? 'border-[var(--erpfy-brand)] text-[var(--erpfy-brand)]'
              : 'border-transparent text-[#6B7280] hover:text-[#111827]'
          }`}
        >
          <Key className="size-4" />
          API Credentials
        </button>

        <button
          type="button"
          onClick={() => { setActiveTab('docs'); setSelectedApp(null); }}
          className={`flex items-center gap-2 border-b-2 px-5 py-3 text-xs font-semibold transition-colors ${
            activeTab === 'docs'
              ? 'border-[var(--erpfy-brand)] text-[var(--erpfy-brand)]'
              : 'border-transparent text-[#6B7280] hover:text-[#111827]'
          }`}
        >
          <Terminal className="size-4" />
          EAP Standard Docs
        </button>
      </div>

      {/* Tab 1: Apps */}
      {activeTab === 'apps' && !selectedApp && (
        <div className="space-y-4">
          {apps.length === 0 ? (
            <div className="rounded-xl border border-dashed border-[#D1D5DB] p-12 text-center">
              <Layers className="mx-auto size-10 text-[#9CA3AF]" />
              <h3 className="mt-3 text-sm font-semibold text-[#111827]">No Apps Created Yet</h3>
              <p className="mt-1 text-xs text-[#6B7280]">
                Register your first app to test in sandbox or distribute to ERP tenants.
              </p>
              <ErpfyButton
                tone="primary"
                onClick={() => setShowNewAppModal(true)}
                className="mt-4"
              >
                Create App Wizard
              </ErpfyButton>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {apps.map((app) => (
                <button
                  type="button"
                  key={app.id}
                  onClick={() => { void openAppDetails(app); }}
                  className="text-left w-full group cursor-pointer rounded-xl border border-[#E5E7EB] bg-white p-5 shadow-xs transition hover:border-[#D1D5DB] hover:shadow-sm"
                >
                  <div className="flex items-start justify-between">
                    <span className="grid size-10 place-items-center rounded-lg bg-[#F3F4F6] text-xs font-bold text-[#111827]">
                      {app.name.substring(0, 2).toUpperCase()}
                    </span>
                    {app.isKilled ? (
                      <ErpfyStatus tone="critical">KILLED</ErpfyStatus>
                    ) : app.status === 'published' ? (
                      <ErpfyStatus tone="success">Published</ErpfyStatus>
                    ) : app.status === 'in_review' ? (
                      <ErpfyStatus tone="attention">In Review</ErpfyStatus>
                    ) : (
                      <ErpfyStatus tone="neutral">Draft</ErpfyStatus>
                    )}
                  </div>

                  <h3 className="mt-3 text-sm font-bold text-[#111827] group-hover:text-[var(--erpfy-brand)]">
                    {app.name}
                  </h3>
                  <p className="mt-1 line-clamp-2 text-xs text-[#6B7280]">{app.tagline || app.description}</p>

                  <div className="mt-4 flex items-center justify-between border-t border-[#F3F4F6] pt-3 text-[11px] text-[#6B7280]">
                    <span>Category: {app.category}</span>
                    <span>{app.installedCount} Installs</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* App Details View */}
      {selectedApp && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => setSelectedApp(null)}
              className="text-xs font-medium text-[var(--erpfy-brand)] hover:underline"
            >
              ← Back to All Apps
            </button>
            <ErpfyButton
              tone="primary"
              onClick={() => {
                setShowNewVersionModal(true);
                setVerManifestRaw(
                  JSON.stringify(
                    {
                      protocol: 'eap-v1',
                      app_id: selectedApp.id,
                      name: selectedApp.name,
                      slug: selectedApp.slug,
                      version: '1.0.1',
                      minimum_platform_version: '1.0.0',
                      permissions: ['orders.read'],
                      navigation: [
                        {
                          id: `${selectedApp.slug}-nav`,
                          label: selectedApp.name,
                          href: `/account/apps/${selectedApp.slug}`,
                          icon: 'Box',
                          group: 'General',
                        },
                      ],
                    },
                    null,
                    2
                  )
                );
              }}
              className="flex items-center gap-1.5"
            >
              <Plus className="size-4" />
              Upload New Version
            </ErpfyButton>
          </div>

          <div className="rounded-xl border border-[#E5E7EB] bg-white p-6 shadow-xs">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-bold text-[#111827]">{selectedApp.name}</h3>
                <p className="text-xs text-[#6B7280]">{selectedApp.tagline}</p>
                <div className="mt-2 flex items-center gap-3 text-xs text-[#4B5563]">
                  <span>App ID: <code className="rounded bg-[#F3F4F6] px-1.5 py-0.5">{selectedApp.id}</code></span>
                  <span>Slug: <code className="rounded bg-[#F3F4F6] px-1.5 py-0.5">{selectedApp.slug}</code></span>
                  <span>Type: <span className="font-semibold capitalize">{selectedApp.appType}</span></span>
                </div>
              </div>
            </div>

            {/* Versions Table */}
            <div className="mt-6">
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#6B7280]">
                Release Versions & Platform Signatures
              </h4>

              {loadingVersions ? (
                <div className="py-6 text-center text-xs text-[#9CA3AF]">Loading versions...</div>
              ) : versions.length === 0 ? (
                <div className="mt-3 rounded-lg border border-dashed border-[#E5E7EB] p-6 text-center text-xs text-[#6B7280]">
                  No versions uploaded yet. Click &quot;Upload New Version&quot; to build and submit your first release.
                </div>
              ) : (
                <div className="mt-3 overflow-x-auto rounded-lg border border-[#E5E7EB]">
                  <table className="w-full text-left text-xs">
                    <thead className="border-b border-[#E5E7EB] bg-[#F9FAFB] text-[#4B5563]">
                      <tr>
                        <th className="p-3 font-semibold">Version</th>
                        <th className="p-3 font-semibold">Security Scan</th>
                        <th className="p-3 font-semibold">Package Hash</th>
                        <th className="p-3 font-semibold">Platform Signature</th>
                        <th className="p-3 font-semibold">Status</th>
                        <th className="p-3 font-semibold">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E5E7EB]">
                      {versions.map((ver) => (
                        <tr key={ver.id} className="hover:bg-[#F9FAFB]">
                          <td className="p-3 font-bold text-[#111827]">{ver.version}</td>
                          <td className="p-3">
                            {ver.securityScanStatus === 'passed' ? (
                              <span className="inline-flex items-center gap-1 text-[#16a34a] font-semibold">
                                <CheckCircle className="size-3.5" /> Passed
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[#dc2626] font-semibold">
                                <XCircle className="size-3.5" /> Failed
                              </span>
                            )}
                          </td>
                          <td className="p-3">
                            <code className="text-[11px] text-[#6B7280]">
                              {ver.packageHash ? ver.packageHash.substring(0, 12) + '...' : 'None'}
                            </code>
                          </td>
                          <td className="p-3">
                            {ver.signature ? (
                              <span className="inline-flex items-center gap-1 text-[#16a34a] font-semibold">
                                <Shield className="size-3.5" /> Signed
                              </span>
                            ) : (
                              <span className="text-[#9CA3AF]">Pending Approval</span>
                            )}
                          </td>
                          <td className="p-3">
                            {ver.status === 'published' ? (
                              <ErpfyStatus tone="success">Published</ErpfyStatus>
                            ) : ver.status === 'submitted' ? (
                              <ErpfyStatus tone="attention">In Review</ErpfyStatus>
                            ) : ver.status === 'changes_requested' ? (
                              <ErpfyStatus tone="attention">Changes Requested</ErpfyStatus>
                            ) : ver.status === 'rejected' ? (
                              <ErpfyStatus tone="critical">Rejected</ErpfyStatus>
                            ) : (
                              <ErpfyStatus tone="neutral">Draft</ErpfyStatus>
                            )}
                            {ver.reviewMessages && ver.reviewMessages.length > 0 && (
                              <div className="mt-1 text-[10px] text-[#DC2626]">
                                Note: {ver.reviewMessages[ver.reviewMessages.length - 1].message}
                              </div>
                            )}
                          </td>
                          <td className="p-3">
                            {ver.status === 'draft' && ver.securityScanStatus === 'passed' && (
                              <div className="flex items-center gap-1.5">
                                <ErpfyButton
                                  tone="primary"
                                  disabled={profile.status !== 'verified'}
                                  onClick={() => { void handleSubmitForReview(ver.id); }}
                                  className="text-[11px] py-1 px-2.5"
                                >
                                  Submit for Review
                                </ErpfyButton>
                                {profile.status !== 'verified' && (
                                  <span className="text-[10px] text-[#D97706] italic">
                                    (Verification required)
                                  </span>
                                )}
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: API Credentials */}
      {activeTab === 'credentials' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-[#111827]">Developer API Keys & Webhook Signing</h3>
              <p className="text-xs text-[#6B7280]">
                Use these client credentials to authenticate external integrations or receive HMAC-signed webhooks.
              </p>
            </div>
            <ErpfyButton
              tone="primary"
              onClick={() => { void handleGenerateCredential(); }}
              className="flex items-center gap-1.5"
            >
              <Plus className="size-4" />
              Generate API Key
            </ErpfyButton>
          </div>

          {newCredSecret && (
            <div className="rounded-xl border border-[#FDE68A] bg-[#FEF3C7] p-4 text-xs text-[#92400E]">
              <div className="flex items-center gap-1.5 font-bold">
                <AlertTriangle className="size-4" />
                New Client Secret Generated (Save this now! It will not be shown again):
              </div>
              <code className="mt-2 block select-all rounded bg-white p-2 font-mono text-[#111827] border border-[#FCD34D]">
                {newCredSecret}
              </code>
            </div>
          )}

          {loadingCreds ? (
            <div className="py-8 text-center text-xs text-[#9CA3AF]">Loading credentials...</div>
          ) : credentials.length === 0 ? (
            <div className="rounded-xl border border-dashed border-[#E5E7EB] p-8 text-center text-xs text-[#6B7280]">
              No API credentials generated yet.
            </div>
          ) : (
            <div className="divide-y divide-[#E5E7EB] rounded-xl border border-[#E5E7EB] bg-white">
              {credentials.map((cred) => (
                <div key={cred.id} className="flex items-center justify-between p-4 text-xs">
                  <div>
                    <span className="font-bold text-[#111827]">{cred.label || 'API Client'}</span>
                    <div className="mt-1 flex items-center gap-3 text-[#6B7280]">
                      <span>Client ID: <code className="rounded bg-[#F3F4F6] px-1 py-0.5">{cred.clientId}</code></span>
                      <span>Status: <span className="font-semibold text-[#16a34a]">{cred.status}</span></span>
                    </div>
                  </div>
                  <span className="text-[11px] text-[#9CA3AF]">Created: {new Date(cred.createdAt).toLocaleDateString()}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Documentation */}
      {activeTab === 'docs' && (
        <div className="space-y-6 rounded-xl border border-[#E5E7EB] bg-white p-6 shadow-xs text-xs text-[#4B5563]">
          <h3 className="text-base font-bold text-[#111827]">ERP App Protocol (EAP v1) Architecture</h3>
          <p>
            EAP v1 governs the distribution, sandboxing, and execution of extensions across the ERPFY ecosystem.
            Customers do not download ZIP packages; code is deployed directly to ERPFY infrastructure and authorized per-tenant.
          </p>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-lg border border-[#E5E7EB] p-4 bg-[#F9FAFB]">
              <h4 className="font-bold text-[#111827] flex items-center gap-1.5">
                <Lock className="size-4 text-[var(--erpfy-brand)]" />
                1. Security Scanner
              </h4>
              <p className="mt-2 text-[#6B7280]">
                Every version upload is scanned for forbidden primitives including <code className="text-[#111827]">eval()</code>, <code className="text-[#111827]">child_process</code>, and unauthorized network endpoints.
              </p>
            </div>

            <div className="rounded-lg border border-[#E5E7EB] p-4 bg-[#F9FAFB]">
              <h4 className="font-bold text-[#111827] flex items-center gap-1.5">
                <Shield className="size-4 text-[var(--erpfy-brand)]" />
                2. Platform Signing
              </h4>
              <p className="mt-2 text-[#6B7280]">
                Production releases are cryptographically signed with the platform master key. Unsigned packages are blocked from running on tenant environments.
              </p>
            </div>

            <div className="rounded-lg border border-[#E5E7EB] p-4 bg-[#F9FAFB]">
              <h4 className="font-bold text-[#111827] flex items-center gap-1.5">
                <Layers className="size-4 text-[var(--erpfy-brand)]" />
                3. Tenant Isolation
              </h4>
              <p className="mt-2 text-[#6B7280]">
                Apps run in sandboxed tenant contexts with explicit permission scoping (<code className="text-[#111827]">orders.read</code>, <code className="text-[#111827]">inventory.write</code>) granted during installation.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Create App */}
      {showNewAppModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="text-base font-bold text-[#111827]">Create New EAP App</h3>
            <p className="text-xs text-[#6B7280]">Configure the application identity and runtime architecture.</p>

            <form onSubmit={handleCreateApp} className="mt-4 space-y-4">
              <ErpfyInput
                id="appName"
                label="App Name"
                placeholder="e.g. Smart Dispatcher"
                value={newAppName}
                onChange={(e) => {
                  setNewAppName(e.target.value);
                  setNewAppSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-'));
                }}
                required
              />

              <ErpfyInput
                id="appSlug"
                label="Unique App Slug"
                placeholder="smart-dispatcher"
                value={newAppSlug}
                onChange={(e) => setNewAppSlug(e.target.value)}
                required
              />

              <ErpfyInput
                id="appTagline"
                label="Tagline / Short Summary"
                placeholder="Automated dispatch and routing for orders."
                value={newAppTagline}
                onChange={(e) => setNewAppTagline(e.target.value)}
                required
              />

              <div className="grid grid-cols-2 gap-3">
                <ErpfySelect
                  id="appCategory"
                  label="Category"
                  value={newAppCategory}
                  onChange={(e) => setNewAppCategory(e.target.value)}
                >
                  <option value="Sales">Sales</option>
                  <option value="Shipping">Shipping</option>
                  <option value="Accounting">Accounting</option>
                  <option value="CRM">CRM</option>
                  <option value="Marketing">Marketing</option>
                  <option value="HR">HR</option>
                  <option value="Inventory">Inventory</option>
                </ErpfySelect>

                <ErpfySelect
                  id="appType"
                  label="Architecture"
                  value={newAppType}
                  onChange={(e) => setNewAppType(e.target.value as 'embedded' | 'standalone' | 'webhook_only')}
                >
                  <option value="embedded">Embedded UI</option>
                  <option value="standalone">Standalone App</option>
                  <option value="webhook_only">Background Webhooks</option>
                </ErpfySelect>
              </div>

              <ErpfyTextarea
                id="appDesc"
                label="Full Description"
                placeholder="Explain what problem this app solves for ERP tenants..."
                rows={3}
                value={newAppDesc}
                onChange={(e) => setNewAppDesc(e.target.value)}
              />

              <div className="flex justify-end gap-2 pt-2">
                <ErpfyButton
                  tone="secondary"
                  onClick={() => setShowNewAppModal(false)}
                >
                  Cancel
                </ErpfyButton>
                <ErpfyButton
                  type="submit"
                  tone="primary"
                  disabled={creatingApp}
                >
                  {creatingApp ? 'Creating...' : 'Register App'}
                </ErpfyButton>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Upload Version */}
      {showNewVersionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="text-base font-bold text-[#111827]">Upload New Version</h3>
            <p className="text-xs text-[#6B7280]">
              Provide the EAP v1 manifest. The automated security scanner will evaluate code before human review.
            </p>

            <form onSubmit={handleUploadVersion} className="mt-4 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <ErpfyInput
                  id="verSemver"
                  label="Semantic Version (e.g. 1.0.1)"
                  placeholder="1.0.0"
                  value={verSemver}
                  onChange={(e) => setVerSemver(e.target.value)}
                  required
                />
                <ErpfyInput
                  id="verChangelog"
                  label="Changelog"
                  placeholder="Added inventory sync webhooks"
                  value={verChangelog}
                  onChange={(e) => setVerChangelog(e.target.value)}
                  required
                />
              </div>

              <ErpfyTextarea
                id="verManifest"
                label="EAP v1 Manifest JSON"
                rows={7}
                className="font-mono text-[11px]"
                value={verManifestRaw}
                onChange={(e) => setVerManifestRaw(e.target.value)}
                required
              />

              <ErpfyTextarea
                id="verCodeBundle"
                label="App Code / Script Bundle"
                rows={4}
                className="font-mono text-[11px]"
                placeholder="// Export app components or handlers..."
                value={verCodeBundle}
                onChange={(e) => setVerCodeBundle(e.target.value)}
              />

              {scanResult && (
                <div className={`rounded-lg p-3 text-xs ${scanResult.passed ? 'bg-[#ECFDF5] text-[#065F46] border border-[#A7F3D0]' : 'bg-[#FEF2F2] text-[#991B1B] border border-[#FECACA]'}`}>
                  <div className="font-bold flex items-center gap-1.5">
                    {scanResult.passed ? <CheckCircle className="size-4" /> : <XCircle className="size-4" />}
                    Automated Security Scanner: {scanResult.passed ? 'PASSED' : 'FAILED'}
                  </div>
                  {scanResult.issues && scanResult.issues.length > 0 && (
                    <ul className="mt-2 list-disc pl-4 space-y-1">
                      {scanResult.issues.map((issue: ScanResultIssue, idx: number) => (
                        <li key={idx}>
                          <strong>[{issue.severity.toUpperCase()}]</strong> {issue.message}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <ErpfyButton
                  tone="secondary"
                  onClick={() => setShowNewVersionModal(false)}
                >
                  Close
                </ErpfyButton>
                <ErpfyButton
                  type="submit"
                  tone="primary"
                  disabled={uploadingVersion}
                >
                  {uploadingVersion ? 'Scanning & Uploading...' : 'Scan & Save Version'}
                </ErpfyButton>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
