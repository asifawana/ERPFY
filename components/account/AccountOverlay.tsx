'use client';

import type { ReactNode } from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { X } from 'lucide-react';

import { ErpfyIconButton } from '@/lib/design-system';
import { cn } from '@/lib/utils';

export function AccountOverlay({
  closeLabel,
  contentClassName,
  children,
  closeHref,
}: {
  closeLabel: string;
  contentClassName: string;
  children: ReactNode;
  closeHref?: string;
}) {
  const router = useRouter();
  const [closing, setClosing] = useState(false);
  const closedRef = useRef(false);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  const finishClose = useCallback(() => {
    if (closedRef.current) return;
    closedRef.current = true;

    if (closeHref) {
      router.push(closeHref);
      return;
    }

    // Determine target company if present in current URL search params
    const search = typeof window !== 'undefined' ? window.location.search : '';
    const params = new URLSearchParams(search);
    const company = params.get('company');
    const fallbackTarget = company
      ? `/account?company=${encodeURIComponent(company)}`
      : '/account';

    // Check if referrer is a safe same-origin internal page (not about:blank or external)
    const hasSafeInternalReferrer =
      typeof document !== 'undefined' &&
      typeof window !== 'undefined' &&
      document.referrer &&
      document.referrer.startsWith(window.location.origin) &&
      !document.referrer.includes('/app-store') &&
      !document.referrer.includes('/settings') &&
      !document.referrer.includes('/developer') &&
      !document.referrer.includes('/admin/apps');

    if (hasSafeInternalReferrer && window.history.length > 1) {
      router.back();
    } else {
      router.push(fallbackTarget);
    }
  }, [closeHref, router]);

  useEffect(() => {
    if (!closing) return;
    const timer = setTimeout(() => {
      finishClose();
    }, 250);
    return () => clearTimeout(timer);
  }, [closing, finishClose]);

  return (
    <section
      className={cn(
        'fixed inset-x-0 bottom-0 top-[56px] z-[40] overflow-hidden rounded-t-[14px] bg-[var(--erpfy-canvas)] text-[var(--erpfy-ink)] shadow-[0_-1px_0_var(--erpfy-line)]',
        closing ? 'account-overlay-exit' : 'account-overlay-enter',
      )}
      onAnimationEnd={(event) => {
        if (closing && event.target === event.currentTarget) finishClose();
      }}
    >
      {/* Top-Left Rounded Corner Mask (Green Topbar Fill) */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-0 top-0 z-20 size-[14px]"
      >
        <svg viewBox="0 0 14 14" className="size-[14px] block" aria-hidden="true">
          <path
            d="M 0 14 L 0 0 L 14 0 A 14 14 0 0 0 0 14 Z"
            fill="var(--erpfy-topbar)"
          />
        </svg>
      </div>

      {/* Top-Right Rounded Corner Mask (Green Topbar Fill) */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute right-0 top-0 z-20 size-[14px]"
      >
        <svg viewBox="0 0 14 14" className="size-[14px] block" aria-hidden="true">
          <path
            d="M 0 0 L 14 0 L 14 14 A 14 14 0 0 0 0 0 Z"
            fill="var(--erpfy-topbar)"
          />
        </svg>
      </div>

      <ErpfyIconButton
        label={closeLabel}
        onClick={() => setClosing(true)}
        disabled={closing}
        className="absolute right-3 top-3 z-10 size-8 shrink-0 bg-[var(--erpfy-rail)] sm:right-4 sm:top-4"
      >
        <X className="size-4" aria-hidden />
      </ErpfyIconButton>

      <div className="h-full overflow-y-auto overscroll-contain">
        <div className={contentClassName}>{children}</div>
      </div>
    </section>
  );
}
