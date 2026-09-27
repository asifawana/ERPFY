'use client';

import { useEffect, useRef, useState } from 'react';
import { Maximize2, Minimize2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  isDocumentFullscreen,
  subscribeFullscreen,
  toggleDocumentFullscreen,
} from '@/lib/fullscreen';

export function FullscreenButton() {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const lastToggleRef = useRef(0);

  useEffect(() => {
    const update = () => {
      if (typeof document !== 'undefined') {
        const isFull = isDocumentFullscreen(document);
        setIsFullscreen(isFull);
        if (isFull) {
          document.documentElement.setAttribute('data-erpfy-fullscreen', 'on');
        } else {
          document.documentElement.removeAttribute('data-erpfy-fullscreen');
        }
      }
    };

    update();
    const unsub = subscribeFullscreen(document, update);

    // Keep icon state in sync when user presses F11 on keyboard
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F11') {
        setTimeout(update, 150);
      }
    };
    window.addEventListener('keydown', onKeyDown);

    return () => {
      unsub();
      window.removeEventListener('keydown', onKeyDown);
    };
  }, []);

  const handleToggle = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();

    const now = Date.now();
    if (now - lastToggleRef.current < 250) return;
    lastToggleRef.current = now;

    // Synchronous execution directly from user mouse gesture
    toggleDocumentFullscreen(document).catch(() => {
      // Fallback: full viewport layout adaptation
      const isFull = isDocumentFullscreen(document);
      if (!isFull) {
        document.documentElement.setAttribute('data-erpfy-fullscreen', 'on');
        setIsFullscreen(true);
      } else {
        document.documentElement.removeAttribute('data-erpfy-fullscreen');
        setIsFullscreen(false);
      }
    });
  };

  return (
    <button
      type="button"
      onClick={handleToggle}
      className={cn(
        'relative z-10 flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-full border border-white/25 bg-black/20 p-1 text-white/90 shadow-xs transition-all hover:bg-black/35 hover:scale-105 hover:text-white active:scale-95 focus:outline-hidden',
        isFullscreen && 'ring-2 ring-white/40 bg-black/35',
      )}
      title={isFullscreen ? 'Exit Fullscreen (F11)' : 'Fullscreen (F11)'}
      aria-label="Toggle fullscreen (F11)"
      aria-pressed={isFullscreen}
    >
      {isFullscreen ? (
        <Minimize2 className="size-4 pointer-events-none" aria-hidden />
      ) : (
        <Maximize2 className="size-4 pointer-events-none" aria-hidden />
      )}
    </button>
  );
}
