'use client';

import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';

/**
 * Universal Page Transition Container
 * Conforms to UNIVERSAL-ANIMATION-MASTER-PROMPT.md (Sections 1, 16, 65, 68)
 *
 * Provides smooth, professional cross-fade + micro-elevation on route changes:
 * - Easing: --erpfy-ease-enter (cubic-bezier(0.16, 1, 0.3, 1))
 * - Duration: --erpfy-motion-standard (200ms)
 * - Zero Layout Shift (CLS < 0.05)
 */
export function PageTransition({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  const isOverlay =
    pathname === '/account/settings' ||
    pathname === '/account/app-store' ||
    pathname === '/account/developer';

  if (isOverlay) {
    return <>{children}</>;
  }

  return (
    <div
      key={pathname}
      className="erpfy-page-enter"
      style={{
        width: '100%',
        minHeight: '100%',
      }}
    >
      {children}
    </div>
  );
}
