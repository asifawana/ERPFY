import {
  DEFAULT_DATE_FORMAT,
  DEFAULT_FISCAL_MONTH,
  DEFAULT_NUMBER_FORMAT,
  DEFAULT_WEEK_START,
  isDateFormat,
  isFiscalMonth,
  isNumberFormat,
  isWeekStart,
  type DateFormatId,
  type NumberFormatId,
  type WeekStartId,
} from '@/lib/content/formats';
import { findCountry } from '@/lib/content/regions';

/**
 * Resolving a company's regional conventions.
 * Authority: ERPFY-MASTER-PLAN.md sections 42 (Regional), 71 (country catalog).
 *
 * Pure and dependency-free, so setup, the company screens and the browser all resolve the
 * same way. One rule, in one place: a stored choice wins; otherwise the country pack
 * supplies it; otherwise a neutral default. A company created before these settings
 * existed therefore reads correctly rather than reading as blank.
 */

export type RegionalSettings = {
  dateFormat: DateFormatId;
  numberFormat: NumberFormatId;
  /** 1 to 12. */
  fiscalYearStart: number;
  weekStart: WeekStartId;
  /** Which values came from the country pack rather than an explicit choice. */
  defaulted: ('dateFormat' | 'numberFormat' | 'fiscalYearStart' | 'weekStart')[];
};

export type StoredRegional = {
  countryCode: string;
  dateFormat: string;
  numberFormat: string;
  fiscalYearStart: number;
  weekStart: string;
};

export function resolveRegional(stored: StoredRegional): RegionalSettings {
  const pack = findCountry(stored.countryCode);
  const defaulted: RegionalSettings['defaulted'] = [];

  let dateFormat: DateFormatId;
  if (isDateFormat(stored.dateFormat)) {
    dateFormat = stored.dateFormat;
  } else {
    dateFormat = pack?.dateFormat ?? DEFAULT_DATE_FORMAT;
    defaulted.push('dateFormat');
  }

  let numberFormat: NumberFormatId;
  if (isNumberFormat(stored.numberFormat)) {
    numberFormat = stored.numberFormat;
  } else {
    numberFormat = pack?.numberFormat ?? DEFAULT_NUMBER_FORMAT;
    defaulted.push('numberFormat');
  }

  let fiscalYearStart: number;
  if (isFiscalMonth(stored.fiscalYearStart)) {
    fiscalYearStart = stored.fiscalYearStart;
  } else {
    fiscalYearStart = pack?.fiscalYearStart ?? DEFAULT_FISCAL_MONTH;
    defaulted.push('fiscalYearStart');
  }

  let weekStart: WeekStartId;
  if (isWeekStart(stored.weekStart)) {
    weekStart = stored.weekStart;
  } else {
    weekStart = pack?.weekStart ?? DEFAULT_WEEK_START;
    defaulted.push('weekStart');
  }

  return { dateFormat, numberFormat, fiscalYearStart, weekStart, defaulted };
}
