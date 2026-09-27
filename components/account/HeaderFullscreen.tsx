'use client';

import { useState, useEffect } from 'react';
import { Maximize, Minimize } from 'lucide-react';
import { cn } from '@/lib/utils';

export function HeaderFullscreen() {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isSupported] = useState(() => {
    if (typeof document === 'undefined') return true;
    const doc = document as Document & {
      webkitFullscreenEnabled?: boolean;
    };
    return Boolean(doc.fullscreenEnabled || doc.webkitFullscreenEnabled);
  });

  useEffect(() => {
    if (typeof document === 'undefined') return;

    const doc = document as Document & {
      webkitFullscreenElement?: Element;
    };

    const handleFullscreenChange = () => {
      const active = Boolean(document.fullscreenElement || doc.webkitFullscreenElement);
      setIsFullscreen(active);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
    };
  }, []);

  const toggleFullscreen = async () => {
    try {
      const doc = document as Document & {
        webkitFullscreenElement?: Element;
        webkitExitFullscreen?: () => Promise<void>;
      };
      const docEl = document.documentElement as HTMLElement & {
        webkitRequestFullscreen?: () => Promise<void>;
      };

      if (!document.fullscreenElement && !doc.webkitFullscreenElement) {
        if (docEl.requestFullscreen) {
          await docEl.requestFullscreen();
        } else if (docEl.webkitRequestFullscreen) {
          await docEl.webkitRequestFullscreen();
        }
      } else {
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        } else if (doc.webkitExitFullscreen) {
          await doc.webkitExitFullscreen();
        }
      }
    } catch {
      // Ignore user gesture rejection or unsupported environment errors
    }
  };

  if (!isSupported) return null;

  return (
    <button
      type="button"
      onClick={toggleFullscreen}
      className={cn(
        'flex size-8 shrink-0 items-center justify-center rounded-full border border-white/25 bg-black/20 text-white/90 shadow-xs transition-all hover:bg-black/35 hover:scale-105 hover:text-white active:scale-95 focus:outline-hidden',
        isFullscreen && 'ring-2 ring-white/40 bg-black/35',
      )}
      title={isFullscreen ? 'Exit full screen' : 'Full screen'}
      aria-label={isFullscreen ? 'Exit full screen' : 'Full screen'}
    >
      {isFullscreen ? (
        <Minimize className="size-4" aria-hidden />
      ) : (
        <Maximize className="size-4" aria-hidden />
      )}
    </button>
  );
}
