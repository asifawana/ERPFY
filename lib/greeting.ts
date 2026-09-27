/**
 * ERPFY Dynamic Time-Based Greeting Utilities
 *
 * Rules:
 * - 05:00 to 11:59 -> "Good Morning"
 * - 12:00 to 16:59 -> "Good Afternoon"
 * - 17:00 to 20:59 -> "Good Evening"
 * - 21:00 to 04:59 -> "Good Night"
 *
 * Requirements:
 * - Exact title-case text ("Good Morning", "Good Afternoon", "Good Evening", "Good Night")
 * - Dynamic authenticated user display/first name resolution ("Good Morning, Asif")
 * - Priority-based timezone resolution:
 *     1. User profile timezone
 *     2. Company/workspace localization timezone
 *     3. Browser/device local timezone fallback
 * - Client/server hydration safety (stable initial render matching SSR, client sync on mount)
 * - Auto-update across time boundaries (once per minute check with state deduplication)
 */

export type GreetingText = 'Good Morning' | 'Good Afternoon' | 'Good Evening' | 'Good Night';

/**
 * Returns greeting for a given hour in 24-hour format (0 to 23).
 * Exact title-case strings.
 */
export function getTimeBasedGreeting(hour: number): GreetingText {
  if (hour >= 5 && hour < 12) {
    return 'Good Morning';
  }
  if (hour >= 12 && hour < 17) {
    return 'Good Afternoon';
  }
  if (hour >= 17 && hour < 21) {
    return 'Good Evening';
  }
  return 'Good Night';
}

/**
 * Backwards-compatible alias for getTimeBasedGreeting.
 */
export const getGreetingForHour = getTimeBasedGreeting;

/**
 * Checks whether an IANA timezone string is valid in the current environment.
 */
export function isValidTimezone(tz?: string | null): boolean {
  if (!tz || typeof tz !== 'string') return false;
  const trimmed = tz.trim();
  if (!trimmed) return false;
  try {
    Intl.DateTimeFormat(undefined, { timeZone: trimmed });
    return true;
  } catch {
    return false;
  }
}

/**
 * Resolves the best available timezone in strict order of priority:
 * 1. User/account preferred timezone
 * 2. Current company/workspace timezone
 * 3. Browser/device local timezone fallback
 *
 * Never blindly falls back to UTC if a device/company timezone is available.
 */
export function resolveGreetingTimezone(sources?: {
  userTimezone?: string | null;
  companyTimezone?: string | null;
}): string | undefined {
  // 1. User/account preferred timezone
  const userTz = sources?.userTimezone?.trim();
  if (userTz && isValidTimezone(userTz)) {
    return userTz;
  }

  // 2. Current company/workspace timezone
  const companyTz = sources?.companyTimezone?.trim();
  if (companyTz && isValidTimezone(companyTz)) {
    return companyTz;
  }

  // 3. Browser/device local timezone as fallback
  if (typeof Intl !== 'undefined' && typeof Intl.DateTimeFormat === 'function') {
    try {
      const localTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (localTz && isValidTimezone(localTz)) {
        return localTz;
      }
    } catch {
      // Fall through
    }
  }

  return undefined;
}

/**
 * Resolves the user display name or friendly first name.
 * Examples:
 * - "Muhammad Asif" -> "Asif" (recognizes honorifics/prefixes)
 * - "Asif Ali" -> "Asif"
 * - "Asif" -> "Asif"
 * - email "asif@erpfy.com" with missing display name -> "Asif"
 * - missing both -> "User"
 */
export function resolveGreetingName(
  profile?: { displayName?: string | null; email?: string | null } | null
): string {
  const raw = (profile?.displayName || '').trim();
  if (raw) {
    const parts = raw.split(/\s+/);
    if (parts.length > 1) {
      const firstLower = parts[0].toLowerCase().replace(/\./g, '');
      // Prominent South-Asian / Middle-Eastern prefix where second token is the call name
      if (['muhammad', 'mohammad', 'mohammed', 'mohd', 'md'].includes(firstLower) && parts[1]) {
        return parts[1];
      }
      // Standard Western/Eastern full name: use first name
      return parts[0];
    }
    return raw;
  }

  const email = (profile?.email || '').trim();
  if (email) {
    const handle = email.split('@')[0];
    if (handle) {
      const token = handle.split(/[._-]/)[0];
      if (token) {
        return token.charAt(0).toUpperCase() + token.slice(1);
      }
    }
  }

  return 'User';
}

/**
 * Computes greeting text for a given timezone or date.
 * If timezone is provided and valid, calculates the hour in that timezone.
 * Otherwise uses the given date's local hour.
 */
export function getGreeting(timezone?: string | null, date: Date = new Date()): GreetingText {
  if (timezone && isValidTimezone(timezone)) {
    try {
      const hourStr = new Intl.DateTimeFormat('en-GB', {
        timeZone: timezone,
        hour: '2-digit',
        hour12: false,
      }).format(date);
      const hour = parseInt(hourStr, 10);
      if (Number.isFinite(hour) && hour >= 0 && hour <= 23) {
        return getTimeBasedGreeting(hour);
      }
    } catch {
      // Fall through to local date
    }
  }

  return getTimeBasedGreeting(date.getHours());
}

/**
 * Formats greeting with user display name or identifier.
 * Example:
 *   formatGreeting("Good Morning", "Asif") => "Good Morning, Asif"
 *   formatGreeting("Good Afternoon", "") => "Good Afternoon"
 */
export function formatGreeting(greeting: GreetingText, nameOrEmail?: string | null): string {
  const cleanName = (nameOrEmail || '').trim();
  return cleanName ? `${greeting}, ${cleanName}` : greeting;
}
