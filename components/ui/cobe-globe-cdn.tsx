'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import createGlobe from 'cobe';
import { cn } from '@/lib/utils';
import { Globe } from 'lucide-react';

export interface StoreVisitorMarker {
  id: string;
  location: [number, number]; // [lat, lon]
  country: string;
  flag: string;
  city?: string;
  visitors: number;
}

export interface StoreVisitorArc {
  id: string;
  from: [number, number];
  to: [number, number];
  label?: string;
}

export interface GlobeCdnProps {
  markers?: StoreVisitorMarker[];
  arcs?: StoreVisitorArc[];
  className?: string;
  speed?: number;
  themeColor?: [number, number, number]; // RGB normalized [0..1]
}

// Global store visitor hubs across major countries
export const DEFAULT_STORE_VISITOR_MARKERS: StoreVisitorMarker[] = [
  { id: 'vis-pk', location: [31.52, 74.35], country: 'Pakistan', flag: '🇵🇰', city: 'Lahore', visitors: 4280 },
  { id: 'vis-ae', location: [25.20, 55.27], country: 'UAE', flag: '🇦🇪', city: 'Dubai', visitors: 1890 },
  { id: 'vis-sa', location: [24.71, 46.67], country: 'Saudi Arabia', flag: '🇸🇦', city: 'Riyadh', visitors: 940 },
  { id: 'vis-uk', location: [51.50, -0.12], country: 'United Kingdom', flag: '🇬🇧', city: 'London', visitors: 1420 },
  { id: 'vis-us-ny', location: [40.71, -74.00], country: 'United States', flag: '🇺🇸', city: 'New York', visitors: 3120 },
  { id: 'vis-us-ca', location: [34.05, -118.24], country: 'United States', flag: '🇺🇸', city: 'California', visitors: 1850 },
  { id: 'vis-ca', location: [43.65, -79.38], country: 'Canada', flag: '🇨🇦', city: 'Toronto', visitors: 820 },
  { id: 'vis-de', location: [50.11, 8.68], country: 'Germany', flag: '🇩🇪', city: 'Frankfurt', visitors: 760 },
  { id: 'vis-sg', location: [1.35, 103.81], country: 'Singapore', flag: '🇸🇬', city: 'Singapore', visitors: 650 },
  { id: 'vis-au', location: [-33.86, 151.20], country: 'Australia', flag: '🇦🇺', city: 'Sydney', visitors: 580 },
];

// Arcs showing international buyer connections to the store
export const DEFAULT_STORE_VISITOR_ARCS: StoreVisitorArc[] = [
  { id: 'arc-1', from: [40.71, -74.00], to: [31.52, 74.35], label: 'US → Store' },
  { id: 'arc-2', from: [51.50, -0.12], to: [31.52, 74.35], label: 'UK → Store' },
  { id: 'arc-3', from: [25.20, 55.27], to: [31.52, 74.35], label: 'UAE → Store' },
  { id: 'arc-4', from: [24.71, 46.67], to: [31.52, 74.35], label: 'KSA → Store' },
  { id: 'arc-5', from: [50.11, 8.68], to: [25.20, 55.27], label: 'EU → Hub' },
  { id: 'arc-6', from: [1.35, 103.81], to: [31.52, 74.35], label: 'SG → Store' },
];

/**
 * 3D Interactive WebGL Globe for Live Store Traffic & International Customers
 * Built with COBE for ultra-smooth 60fps performance and zero layout shift.
 */
export function GlobeCdn({
  markers = DEFAULT_STORE_VISITOR_MARKERS,
  arcs = DEFAULT_STORE_VISITOR_ARCS,
  className = '',
  speed = 0.003,
}: GlobeCdnProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pointerInteracting = useRef<{ x: number; y: number } | null>(null);
  const dragOffset = useRef({ phi: 0, theta: 0 });
  const phiOffsetRef = useRef(0);
  const thetaOffsetRef = useRef(0);
  const isPausedRef = useRef(false);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    pointerInteracting.current = { x: e.clientX, y: e.clientY };
    if (canvasRef.current) canvasRef.current.style.cursor = 'grabbing';
    isPausedRef.current = true;
  }, []);

  const handlePointerUp = useCallback(() => {
    if (pointerInteracting.current !== null) {
      phiOffsetRef.current += dragOffset.current.phi;
      thetaOffsetRef.current += dragOffset.current.theta;
      dragOffset.current = { phi: 0, theta: 0 };
    }
    pointerInteracting.current = null;
    if (canvasRef.current) canvasRef.current.style.cursor = 'grab';
    isPausedRef.current = false;
  }, []);

  useEffect(() => {
    const handlePointerMove = (e: PointerEvent) => {
      if (pointerInteracting.current !== null) {
        dragOffset.current = {
          phi: (e.clientX - pointerInteracting.current.x) / 280,
          theta: (e.clientY - pointerInteracting.current.y) / 800,
        };
      }
    };
    window.addEventListener('pointermove', handlePointerMove, { passive: true });
    window.addEventListener('pointerup', handlePointerUp, { passive: true });
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [handlePointerUp]);

  useEffect(() => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    let globe: ReturnType<typeof createGlobe> | null = null;
    let animationId: number;
    let phi = 0;

    function init() {
      if (!canvas) return;
      const width = canvas.offsetWidth;
      if (width === 0 || globe) return;

      // Dark forest green theme markers matching ERPFY portal palette
      globe = createGlobe(canvas, {
        devicePixelRatio: Math.min(window.devicePixelRatio || 1, 2),
        width: width * 2,
        height: width * 2,
        phi: 0,
        theta: 0.25,
        dark: 0,
        diffuse: 1.4,
        mapSamples: 14000,
        mapBrightness: 8,
        baseColor: [0.96, 0.97, 0.96],
        markerColor: [0.12, 0.38, 0.22], // #1e5631 portal brand green
        glowColor: [0.91, 0.95, 0.92],
        markerElevation: 0.03,
        markers: markers.map((m) => ({
          location: m.location,
          size: 0.035,
        })),
        arcs: arcs.map((a) => ({
          from: a.from,
          to: a.to,
        })),
        arcColor: [0.12, 0.42, 0.24],
        arcWidth: 0.6,
        arcHeight: 0.28,
        opacity: 0.85,
      });

      function animate() {
        if (!isPausedRef.current) phi += speed;
        if (globe) {
          globe.update({
            phi: phi + phiOffsetRef.current + dragOffset.current.phi,
            theta: 0.25 + thetaOffsetRef.current + dragOffset.current.theta,
          });
        }
        animationId = requestAnimationFrame(animate);
      }

      animate();
      if (canvas) canvas.style.opacity = '1';
    }

    if (canvas.offsetWidth > 0) {
      init();
    } else {
      const ro = new ResizeObserver((entries) => {
        if (entries[0]?.contentRect.width > 0) {
          ro.disconnect();
          init();
        }
      });
      ro.observe(canvas);
    }

    return () => {
      if (animationId) cancelAnimationFrame(animationId);
      if (globe) globe.destroy();
    };
  }, [markers, arcs, speed]);

  return (
    <div className={cn('relative aspect-square w-full select-none', className)}>
      <canvas
        ref={canvasRef}
        onPointerDown={handlePointerDown}
        style={{
          width: '100%',
          height: '100%',
          cursor: 'grab',
          opacity: 0,
          transition: 'opacity 0.8s ease',
          borderRadius: '50%',
          touchAction: 'none',
        }}
      />
      {/* Interactive hint */}
      <div className="pointer-events-none absolute bottom-2 left-1/2 -translate-x-1/2 rounded-full bg-black/5 px-2.5 py-0.5 text-[10px] font-medium text-[#4B5563] backdrop-blur-xs">
        Drag to rotate 3D view
      </div>
    </div>
  );
}

/**
 * Complete Store Traffic & International Visitors Module
 * Shows live active online visitors, rotating 3D globe with visitor pins & connections,
 * and top visitor countries leaderboard.
 */
export function GlobalStoreVisitorsModule({
  className,
}: {
  className?: string;
}) {
  const [onlineNow, setOnlineNow] = useState(148);

  // Gentle live pulsation of active online shoppers
  useEffect(() => {
    const interval = setInterval(() => {
      setOnlineNow((prev) =>
        Math.max(80, prev + Math.floor(Math.random() * 7) - 3),
      );
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  const totalVisitors = DEFAULT_STORE_VISITOR_MARKERS.reduce(
    (acc, m) => acc + m.visitors,
    0,
  );

  return (
    <div
      className={cn(
        'rounded-2xl border border-[#E5E7EB] bg-white p-5 shadow-xs transition-all dark:bg-[#1f2937] dark:border-gray-800',
        className,
      )}
    >
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#F3F4F6] pb-4">
        <div className="flex items-center gap-2.5">
          <span className="grid size-9 place-items-center rounded-xl bg-[var(--erpfy-brand-soft,#e9f1ec)] text-[var(--erpfy-brand,#1e5631)]">
            <Globe className="size-5" />
          </span>
          <div>
            <h3 className="text-base font-bold text-[#111827] dark:text-white">
              Global Store Visitors & Traffic
            </h3>
            <p className="text-xs text-[#6B7280] dark:text-gray-400">
              Live international visitors & store traffic from connected channels
            </p>
          </div>
        </div>

        {/* Live Active Badge */}
        <div className="flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800 dark:bg-emerald-950/50 dark:border-emerald-800 dark:text-emerald-300">
          <span className="relative flex size-2">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-500 opacity-75" />
            <span className="relative inline-flex size-2 rounded-full bg-emerald-600" />
          </span>
          <span>{onlineNow} Online Now</span>
        </div>
      </div>

      {/* Main Grid: 3D Globe + Country Traffic Leaderboard */}
      <div className="mt-5 grid items-center gap-6 lg:grid-cols-[1.2fr_1fr]">
        {/* Left: 3D Interactive Rotating Globe */}
        <div className="relative mx-auto flex max-w-[380px] items-center justify-center sm:max-w-[420px]">
          <GlobeCdn className="max-w-[380px]" />
        </div>

        {/* Right: Visitor Traffic by Country */}
        <div className="flex flex-col justify-center space-y-3.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-[#9CA3AF]">
              Top Visiting Countries
            </span>
            <span className="text-xs font-semibold text-[var(--erpfy-brand,#1e5631)]">
              {totalVisitors.toLocaleString('en')} Total Visits
            </span>
          </div>

          <div className="divide-y divide-[#F3F4F6] rounded-xl border border-[#F3F4F6] bg-[#F9FAFB]/70 p-2 dark:bg-gray-800/40 dark:border-gray-800">
            {DEFAULT_STORE_VISITOR_MARKERS.slice(0, 6).map((m) => {
              const percent = Math.round((m.visitors / totalVisitors) * 100);
              return (
                <div
                  key={m.id}
                  className="flex items-center justify-between py-2.5 px-2 text-xs transition-colors hover:bg-white/90 rounded-lg dark:hover:bg-gray-800"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="text-base" aria-hidden>
                      {m.flag}
                    </span>
                    <div>
                      <span className="font-bold text-[#111827] dark:text-white">
                        {m.country}
                      </span>
                      <span className="ml-1 text-[11px] text-[#9CA3AF]">
                        ({m.city})
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {/* Visual Progress Bar */}
                    <div className="hidden h-1.5 w-16 overflow-hidden rounded-full bg-gray-200 sm:block dark:bg-gray-700">
                      <div
                        className="h-full rounded-full bg-[var(--erpfy-brand,#1e5631)] transition-all duration-500"
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                    <span className="w-10 text-right font-semibold text-[#111827] dark:text-white">
                      {percent}%
                    </span>
                    <span className="w-14 text-right font-medium text-[#6B7280] dark:text-gray-400">
                      {m.visitors.toLocaleString('en')}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Quick Metrics Strip */}
          <div className="grid grid-cols-2 gap-3 pt-1">
            <div className="rounded-xl border border-[#E5E7EB] bg-white p-3 text-center dark:bg-gray-800 dark:border-gray-700">
              <p className="text-[11px] font-medium text-[#6B7280]">
                Avg. Session Duration
              </p>
              <p className="mt-1 text-sm font-bold text-[#111827] dark:text-white">
                3m 42s
              </p>
            </div>
            <div className="rounded-xl border border-[#E5E7EB] bg-white p-3 text-center dark:bg-gray-800 dark:border-gray-700">
              <p className="text-[11px] font-medium text-[#6B7280]">
                Checkout Conversion
              </p>
              <p className="mt-1 text-sm font-bold text-emerald-600">
                2.84% (+0.4%)
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Standalone Demo Export matching user snippet
export default function GlobeCdnDemo() {
  return (
    <div className="flex min-h-screen w-full items-center justify-center overflow-hidden bg-white p-6">
      <div className="w-full max-w-4xl">
        <GlobalStoreVisitorsModule />
      </div>
    </div>
  );
}
