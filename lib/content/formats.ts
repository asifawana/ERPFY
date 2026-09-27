/**
 * Regional format catalogue — authority: ERPFY-MASTER-PLAN.md sections 42 (Regional),
 * 71 (country catalog stores date and number format), 72 (date/number formatting).
 *
 * These are display and reporting conventions, not compliance. A country pack supplies a
 * starting point; the company owns the choice and can change it. Nothing here claims that
 * picking a fiscal year satisfies any tax authority — section 71's closing rule.
 *
 * Every formatter is pure and takes its inputs explicitly, so the same value renders
 * identically on the server and in the browser.
 */

/* ------------------------------------------------------------------ *
 * Date format
 * ------------------------------------------------------------------ */

export type DateFormatId =
  | 'dd/mm/yyyy'
  | 'mm/dd/yyyy'
  | 'yyyy-mm-dd'
  | 'dd.mm.yyyy'
  | 'dd-mm-yyyy'
  | 'dd-mmm-yyyy';

export type DateFormat = { id: DateFormatId; label: string };

export const DATE_FORMATS: DateFormat[] = [
  { id: 'dd/mm/yyyy', label: 'Day / month / year' },
  { id: 'mm/dd/yyyy', label: 'Month / day / year' },
  { id: 'yyyy-mm-dd', label: 'Year-month-day (ISO)' },
  { id: 'dd.mm.yyyy', label: 'Day.month.year' },
  { id: 'dd-mm-yyyy', label: 'Day-month-year' },
  { id: 'dd-mmm-yyyy', label: 'Day-month name-year' },
];

export const DEFAULT_DATE_FORMAT: DateFormatId = 'dd/mm/yyyy';

const MONTH_ABBREVIATIONS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

export function isDateFormat(value: string): value is DateFormatId {
  return DATE_FORMATS.some((format) => format.id === value);
}

/**
 * Renders a date in the company's format.
 *
 * Takes the calendar parts rather than a Date, because the calendar day depends on the
 * company's time zone and that decision belongs to the caller, not to a formatter.
 */
export function formatDateParts(
  parts: { year: number; month: number; day: number },
  format: DateFormatId,
): string {
  const day = String(parts.day).padStart(2, '0');
  const month = String(parts.month).padStart(2, '0');
  const year = String(parts.year).padStart(4, '0');
  const monthName = MONTH_ABBREVIATIONS[parts.month - 1] ?? month;

  switch (format) {
    case 'mm/dd/yyyy':
      return `${month}/${day}/${year}`;
    case 'yyyy-mm-dd':
      return `${year}-${month}-${day}`;
    case 'dd.mm.yyyy':
      return `${day}.${month}.${year}`;
    case 'dd-mm-yyyy':
      return `${day}-${month}-${year}`;
    case 'dd-mmm-yyyy':
      return `${day}-${monthName}-${year}`;
    default:
      return `${day}/${month}/${year}`;
  }
}

/** A fixed sample date — 31 January 2027 — so every option is visibly different. */
export function dateFormatSample(format: DateFormatId): string {
  return formatDateParts({ year: 2027, month: 1, day: 31 }, format);
}

/* ------------------------------------------------------------------ *
 * Number format
 * ------------------------------------------------------------------ */

export type NumberFormatId = 'comma-dot' | 'dot-comma' | 'space-comma' | 'indian';

export type NumberFormat = { id: NumberFormatId; label: string };

export const NUMBER_FORMATS: NumberFormat[] = [
  { id: 'comma-dot', label: 'Thousands with a comma, decimals with a dot' },
  { id: 'dot-comma', label: 'Thousands with a dot, decimals with a comma' },
  { id: 'space-comma', label: 'Thousands with a space, decimals with a comma' },
  { id: 'indian', label: 'Lakh and crore grouping' },
];

export const DEFAULT_NUMBER_FORMAT: NumberFormatId = 'comma-dot';

export function isNumberFormat(value: string): value is NumberFormatId {
  return NUMBER_FORMATS.some((format) => format.id === value);
}

/** Groups the integer part: 3-digit groups, or the 2-2-3 lakh/crore pattern. */
function groupInteger(digits: string, separator: string, indian: boolean): string {
  if (digits.length <= 3) return digits;

  if (!indian) {
    const groups: string[] = [];
    for (let end = digits.length; end > 0; end -= 3) {
      groups.unshift(digits.slice(Math.max(0, end - 3), end));
    }
    return groups.join(separator);
  }

  // Last three digits stay together; everything above is grouped in twos.
  const last = digits.slice(-3);
  const rest = digits.slice(0, -3);
  const groups: string[] = [];
  for (let end = rest.length; end > 0; end -= 2) {
    groups.unshift(rest.slice(Math.max(0, end - 2), end));
  }
  return `${groups.join(separator)}${separator}${last}`;
}

/**
 * Formats a number in the company's convention. Decimal places are the caller's decision,
 * because money and quantities do not share one precision.
 */
export function formatNumber(
  value: number,
  format: NumberFormatId,
  decimals = 2,
): string {
  if (!Number.isFinite(value)) return '';

  const negative = value < 0;
  const fixed = Math.abs(value).toFixed(decimals);
  const [whole = '0', fraction = ''] = fixed.split('.');

  const groupSeparator = format === 'dot-comma' ? '.' : format === 'space-comma' ? ' ' : ',';
  const decimalSeparator = format === 'comma-dot' || format === 'indian' ? '.' : ',';

  const grouped = groupInteger(whole, groupSeparator, format === 'indian');
  const rendered = fraction ? `${grouped}${decimalSeparator}${fraction}` : grouped;
  return negative ? `-${rendered}` : rendered;
}

/** A sample large enough to show lakh/crore grouping differing from 3-digit grouping. */
export function numberFormatSample(format: NumberFormatId): string {
  return formatNumber(1234567.89, format);
}

/* ------------------------------------------------------------------ *
 * Fiscal year
 * ------------------------------------------------------------------ */

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

/** The month a financial year starts in, 1 to 12. */
export const FISCAL_MONTHS = MONTH_NAMES.map((name, index) => ({ month: index + 1, name }));

export const DEFAULT_FISCAL_MONTH = 1;

export function isFiscalMonth(value: number): boolean {
  return Number.isInteger(value) && value >= 1 && value <= 12;
}

/** "1 April to 31 March" — the range a customer recognises, not a month number. */
export function fiscalYearLabel(startMonth: number): string {
  if (!isFiscalMonth(startMonth)) return '';
  const endMonth = startMonth === 1 ? 12 : startMonth - 1;
  const lastDay = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][endMonth - 1] ?? 30;
  // February is shown as 28: a leap year is a property of a specific year, and this label
  // describes the recurring period rather than one dated instance.
  return `1 ${MONTH_NAMES[startMonth - 1]} to ${lastDay} ${MONTH_NAMES[endMonth - 1]}`;
}

export function monthName(month: number): string {
  return MONTH_NAMES[month - 1] ?? '';
}

/* ------------------------------------------------------------------ *
 * Week start
 * ------------------------------------------------------------------ */

export type WeekStartId = 'monday' | 'sunday' | 'saturday';

export const WEEK_STARTS: { id: WeekStartId; label: string }[] = [
  { id: 'monday', label: 'Monday' },
  { id: 'sunday', label: 'Sunday' },
  { id: 'saturday', label: 'Saturday' },
];

export const DEFAULT_WEEK_START: WeekStartId = 'monday';

export function isWeekStart(value: string): value is WeekStartId {
  return WEEK_STARTS.some((week) => week.id === value);
}

export function weekStartLabel(value: string): string {
  return WEEK_STARTS.find((week) => week.id === value)?.label ?? '';
}
