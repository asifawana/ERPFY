'use client';

import { useState, useEffect, useMemo } from 'react';
import type { AccountProfile } from '@/lib/core/page-data';
import { useAccountSystemSettings } from '@/lib/account-system-settings';
import {
  getGreeting,
  formatGreeting,
  resolveGreetingTimezone,
  resolveGreetingName,
  type GreetingText,
} from '@/lib/greeting';
import { ErpDashboard } from './ErpDashboard';

export function AccountDashboard({ profile }: { profile: AccountProfile }) {
  const systemSettings = useAccountSystemSettings();

  // 1. Resolve user's actual display/first name (e.g. "Muhammad Asif" -> "Asif", fallback "User")
  const displayName = useMemo(() => resolveGreetingName(profile), [profile]);

  // 2. Resolve best timezone in priority order:
  //    1. User profile timezone -> 2. Company localization timezone -> 3. Browser local timezone
  const activeTimezone = useMemo(() => {
    return resolveGreetingTimezone({
      userTimezone: profile?.timezone,
      companyTimezone: systemSettings.companyTimezone,
    });
  }, [profile?.timezone, systemSettings.companyTimezone]);

  // 3. Hydration-safe initial render:
  //    Matches server render using server-known timezone to prevent hydration mismatch
  const [greeting, setGreeting] = useState<GreetingText>(() => getGreeting(activeTimezone));

  // 4. Auto-update: syncs to client device on mount and checks every minute across time boundaries
  useEffect(() => {
    const syncGreeting = () => {
      const current = getGreeting(activeTimezone);
      setGreeting((prev) => (prev === current ? prev : current));
    };

    // Client mount sync
    syncGreeting();

    // Check once per minute without creating unnecessary re-renders
    const timer = setInterval(syncGreeting, 60_000);

    return () => clearInterval(timer);
  }, [activeTimezone]);

  if (!systemSettings.showDemoDashboard) {
    return (
      <section className="erpfy-card grid min-h-64 place-items-center p-8 text-center">
        <div>
          <h1 className="text-xl font-bold">Dashboard sample data is hidden</h1>
          <p className="mt-2 text-sm text-[var(--erpfy-ink-muted)]">
            Turn it on from Settings → System → Demo Data.
          </p>
        </div>
      </section>
    );
  }
  const periodMap: Record<string, 'today' | '7d' | '30d' | 'mtd' | 'ytd'> = {
    Today: 'today',
    'This Week': '7d',
    'This Month': '30d',
    today: 'today',
    '7d': '7d',
    '30d': '30d',
    mtd: 'mtd',
    ytd: 'ytd',
  };
  const activePeriod = periodMap[systemSettings.dashboardRange] ?? '7d';

  const fullGreeting = formatGreeting(greeting, displayName);

  return (
    <ErpDashboard
      greeting={fullGreeting}
      subline="Figures appear here as each app is installed. Feel free to explore the modules."
      defaultPeriod={activePeriod}
    />
  );
}
