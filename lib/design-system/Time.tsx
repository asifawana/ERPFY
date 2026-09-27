'use client';

/**
 * Timestamps that survive server rendering.
 *
 * A component rendered on the server and hydrated in the browser must produce identical
 * markup in both places. `Date.now()` and locale-dependent formatting do not: the server
 * clock, timezone and locale differ from the viewer's, which produces a hydration
 * mismatch and makes React discard the tree.
 *
 * So every timestamp renders a deterministic UTC string first — identical everywhere —
 * and switches to the viewer's own locale, timezone and relative wording once mounted.
 */

import { useSyncExternalStore } from 'react';

const DETERMINISTIC = new Intl.DateTimeFormat('en-GB', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  timeZone: 'UTC',
  hour12: false,
});

/** Identical on the server and in every browser. Safe for the first render. */
export function absoluteUtc(timestamp: number): string {
  return `${DETERMINISTIC.format(new Date(timestamp))} UTC`;
}

function localAbsolute(timestamp: number): string {
  return new Date(timestamp).toLocaleString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function localRelative(timestamp: number, now: number): string {
  const minutes = Math.round((now - timestamp) / 60_000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? '' : 's'} ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days} day${days === 1 ? '' : 's'} ago`;
  return localAbsolute(timestamp);
}

/**
 * The browser's clock, read once and then held steady for the life of the page.
 *
 * `useSyncExternalStore` is React's supported answer to "has this mounted in a browser
 * yet": the server snapshot and the client snapshot differ by design, and React performs
 * the switch itself rather than it surfacing as a hydration mismatch. Caching the reading
 * keeps the snapshot stable, which the hook requires, and keeps the component pure —
 * nothing reads the clock during render.
 */
let clientNow = 0;
const subscribe = () => () => {};
const getClientSnapshot = () => {
  if (clientNow === 0) clientNow = Date.now();
  return clientNow;
};
const getServerSnapshot = () => 0;

/** Returns 0 on the server and during hydration, then a fixed client timestamp. */
function useClientNow(): number {
  return useSyncExternalStore(subscribe, getClientSnapshot, getServerSnapshot);
}

/**
 * `relative` shows "3 hours ago" once mounted; otherwise a localised absolute time.
 * Either way the pre-hydration output is the deterministic UTC string.
 */
export function ErpfyTime({
  value,
  relative = false,
  className,
}: {
  value: number;
  relative?: boolean;
  className?: string;
}) {
  const now = useClientNow();
  const text =
    now === 0
      ? absoluteUtc(value)
      : relative
        ? localRelative(value, now)
        : localAbsolute(value);

  return (
    <time
      dateTime={new Date(value).toISOString()}
      title={absoluteUtc(value)}
      className={className}
    >
      {text}
    </time>
  );
}
