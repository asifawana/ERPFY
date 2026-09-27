'use client';

import { useEffect, useState } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

/**
 * Universal Route Progress Bar & Loading Indicator
 * - Positioned at top: 0 (directly above the logo and topbar)
 * - Color dynamically coordinated with the user's active theme (--erpfy-brand-2 / --erpfy-brand-3)
 * - Conforms to UNIVERSAL-ANIMATION-MASTER-PROMPT.md (Sections 15, 32, 76, 77)
 */
export function NavigationProgressBar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);

  // Complete progress and smoothly fade out on route arrival
  useEffect(() => {
    if (!loading) return;
    const finishTimer = setTimeout(() => {
      setProgress(100);
      const resetTimer = setTimeout(() => {
        setLoading(false);
        setProgress(0);
      }, 250);
      return () => clearTimeout(resetTimer);
    }, 0);
    return () => clearTimeout(finishTimer);
  }, [pathname, searchParams, loading]);

  // Intercept internal clicks for immediate visual progress response
  useEffect(() => {
    const handleAnchorClick = (event: MouseEvent) => {
      const target = (event.target as HTMLElement).closest('a');
      if (!target) return;

      const href = target.getAttribute('href');
      if (!href) return;

      // Only trigger for internal links that navigate away from current location
      if (
        href.startsWith('/') &&
        !href.startsWith('//') &&
        !target.hasAttribute('download') &&
        target.getAttribute('target') !== '_blank'
      ) {
        const currentUrl = window.location.pathname + window.location.search;
        if (href !== currentUrl && !href.startsWith('#')) {
          setLoading(true);
          setProgress(30);

          const t1 = setTimeout(() => setProgress(65), 70);
          const t2 = setTimeout(() => setProgress(88), 200);

          return () => {
            clearTimeout(t1);
            clearTimeout(t2);
          };
        }
      }
    };

    document.addEventListener('click', handleAnchorClick, { capture: true });
    return () => {
      document.removeEventListener('click', handleAnchorClick, { capture: true });
    };
  }, [pathname]);

  if (!loading && progress === 0) return null;

  return (
    <>
      {/* Radiant progress bar directly at top: 0 (above the logo and topbar) */}
      <div
        aria-hidden="true"
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          height: '3.5px',
          zIndex: 999999,
          pointerEvents: 'none',
          background: 'rgba(255, 255, 255, 0.12)',
        }}
      >
        <div
          style={{
            height: '100%',
            width: `${progress}%`,
            background:
              'linear-gradient(90deg, var(--erpfy-brand-2, #3b9559) 0%, var(--erpfy-brand-3, #72b98a) 70%, #FFFFFF 100%)',
            boxShadow:
              '0 0 16px var(--erpfy-brand-3, rgba(114, 185, 138, 0.9)), 0 0 6px #FFFFFF, 0 1px 3px rgba(0, 0, 0, 0.3)',
            transition:
              progress === 100
                ? 'width 140ms cubic-bezier(0.16, 1, 0.3, 1), opacity 220ms ease-out'
                : 'width 240ms cubic-bezier(0.16, 1, 0.3, 1)',
            opacity: progress === 100 ? 0 : 1,
          }}
        />
      </div>

      {/* Stocky signature floating spinning indicator pill */}
      <div
        aria-hidden="true"
        style={{
          position: 'fixed',
          top: '68px',
          right: '24px',
          zIndex: 999999,
          pointerEvents: 'none',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '5px 11px',
          borderRadius: '999px',
          background: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(8px)',
          border: '1px solid rgba(0, 0, 0, 0.08)',
          boxShadow: '0 4px 14px rgba(0, 0, 0, 0.08)',
          opacity: progress === 100 ? 0 : 1,
          transition: 'opacity 220ms ease-out',
        }}
      >
        <div
          style={{
            width: '14px',
            height: '14px',
            boxSizing: 'border-box',
            border: '2px solid rgba(0, 0, 0, 0.1)',
            borderTopColor: 'var(--erpfy-brand, #1e5631)',
            borderLeftColor: 'var(--erpfy-brand-2, #3b9559)',
            borderRadius: '50%',
            animation: 'erpfy-spinner 450ms linear infinite',
          }}
        />
        <span
          style={{
            fontSize: '11px',
            fontWeight: 600,
            color: 'var(--erpfy-brand-soft-ink, #1e5631)',
            letterSpacing: '0.01em',
          }}
        >
          Loading…
        </span>
      </div>
    </>
  );
}
