import Link from 'next/link';
import { ArrowRight, Building2, CircleAlert, Package, Settings, Store } from 'lucide-react';

import { ErpfyEmptyState, ErpfyErrorState } from '@/lib/design-system';

export type WorkspaceAppState =
  | {
      status: 'ready';
      hasInstalledApps: boolean;
      apps: {
        id: string;
        name: string;
        pages: { id: string; label: string; href: string }[];
      }[];
    }
  | { status: 'unavailable' };

/** Core workspace entry: business pages are provided by authorized installed apps. */
export function CompanyWorkspaceHome({
  greeting,
  companyName,
  companySlug,
  appState,
}: {
  greeting: string;
  companyName: string;
  companySlug: string;
  appState: WorkspaceAppState;
}) {
  const companyQuery = `company=${encodeURIComponent(companySlug)}`;
  const appStoreHref = `/account/app-store?${companyQuery}`;

  return (
    <div className="space-y-6 pb-12">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-[24px] font-bold tracking-[-0.03em] text-[var(--erpfy-ink-strong)]">
            {greeting}
          </h1>
          <p className="mt-1 text-sm text-[var(--erpfy-ink-muted)]">
            Your workspace for <span className="font-medium text-[var(--erpfy-ink)]">{companyName}</span>.
          </p>
        </div>
        <Link href={`/account/settings?${companyQuery}`} className="soft-button">
          <Settings className="size-4" aria-hidden />
          Settings
        </Link>
      </header>

      {appState.status === 'unavailable' ? (
        <section className="erpfy-card" aria-label="Workspace apps unavailable">
          <ErpfyErrorState
            icon={<CircleAlert className="size-5" aria-hidden />}
            title="Your apps could not be loaded"
            body="Try again to see the app pages available in this workspace."
            action={<a href={`/c/${encodeURIComponent(companySlug)}`} className="soft-button">Try again</a>}
          />
        </section>
      ) : appState.apps.length === 0 ? (
        <section className="erpfy-card" aria-label="Workspace apps">
          <ErpfyEmptyState
            icon={<Package className="size-5" aria-hidden />}
            title={appState.hasInstalledApps ? 'No app pages available' : 'Add apps to your workspace'}
            body={appState.hasInstalledApps
              ? 'Your installed apps have no pages available to your account. Your workspace administrator can help you review app access.'
              : 'Install the apps your business needs. Their pages will appear here and in your sidebar when you have access.'}
            action={
              <Link href={appStoreHref} className="primary-button">
                <Store className="size-4" aria-hidden />
                Browse App Store
              </Link>
            }
          />
        </section>
      ) : (
        <section aria-labelledby="workspace-apps-heading" className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 id="workspace-apps-heading" className="text-base font-semibold">Your apps</h2>
            <Link href={appStoreHref} className="soft-button">
              <Store className="size-4" aria-hidden />
              Browse App Store
            </Link>
          </div>
          <div className="grid items-start gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {appState.apps.map((app) => (
              <section key={app.id} className="erpfy-card overflow-hidden" aria-label={app.name}>
                <div className="erpfy-card-header">
                  <h3 className="flex min-w-0 items-center gap-2 text-sm font-semibold">
                    <Package className="size-4 shrink-0 text-[var(--erpfy-ink-muted)]" aria-hidden />
                    <span className="break-words">{app.name}</span>
                  </h3>
                </div>
                <ul className="p-2">
                  {app.pages.map((page) => (
                    <li key={page.id}>
                      <Link href={page.href} className="task-row text-sm">
                        <span className="min-w-0 flex-1 break-words">{page.label}</span>
                        <ArrowRight className="size-4 shrink-0 text-[var(--erpfy-ink-muted)]" aria-hidden />
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        </section>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-[var(--erpfy-ink-muted)]">
        <p>App pages are shown according to your workspace access.</p>
        <Link href="/account" className="soft-button">
          <Building2 className="size-4" aria-hidden />
          My ERPs
        </Link>
      </div>
    </div>
  );
}
