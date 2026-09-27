/**
 * Country availability catalogue ΓÇö authority: ERPFY-MASTER-PLAN.md section 71.
 *
 * Availability describes the state of ERPFY's country configuration, not a claim of legal
 * or tax compliance in that country (section 71, final line).
 *
 * Section 71 allows a country entry to carry date and number format alongside currency and
 * time zone. Those, and the usual start of a financial year, are the beginning of the
 * country packs described in section 18: **starting points a company can change**, never a
 * statement that ERPFY meets that country's accounting or tax rules.
 */

import type { DateFormatId, NumberFormatId, WeekStartId } from './formats';

export type Availability = 'supported' | 'beta' | 'limited' | 'coming-soon' | 'unavailable';

export type Country = {
  code: string;
  name: string;
  region: string;
  /** Default currency offered during company setup. Always overridable (section 71). */
  currency: string;
  /** Default IANA timezone offered during company setup. Always overridable. */
  timezone: string;
  /** Section 71 date format for this country. A default, not a requirement. */
  dateFormat: DateFormatId;
  /** Section 71 number grouping for this country. A default, not a requirement. */
  numberFormat: NumberFormatId;
  /**
   * Month the financial year usually starts in, 1 to 12. A widely used convention, not
   * legal advice, and every company can set its own.
   */
  fiscalYearStart: number;
  /** Day the working week usually starts on. */
  weekStart: WeekStartId;
  availability: Availability;
};

export const AVAILABILITY_LABEL: Record<Availability, string> = {
  supported: 'Supported',
  beta: 'Beta',
  limited: 'Limited',
  'coming-soon': 'Coming soon',
  unavailable: 'Unavailable',
};

export const COUNTRIES: Country[] = [
  { code: 'GB', name: 'United Kingdom', region: 'Europe', currency: 'GBP', timezone: 'Europe/London', dateFormat: 'dd/mm/yyyy', numberFormat: 'comma-dot', fiscalYearStart: 4, weekStart: 'monday', availability: 'beta' },
  { code: 'IE', name: 'Ireland', region: 'Europe', currency: 'EUR', timezone: 'Europe/Dublin', dateFormat: 'dd/mm/yyyy', numberFormat: 'comma-dot', fiscalYearStart: 1, weekStart: 'monday', availability: 'beta' },
  { code: 'DE', name: 'Germany', region: 'Europe', currency: 'EUR', timezone: 'Europe/Berlin', dateFormat: 'dd.mm.yyyy', numberFormat: 'dot-comma', fiscalYearStart: 1, weekStart: 'monday', availability: 'coming-soon' },
  { code: 'FR', name: 'France', region: 'Europe', currency: 'EUR', timezone: 'Europe/Paris', dateFormat: 'dd/mm/yyyy', numberFormat: 'space-comma', fiscalYearStart: 1, weekStart: 'monday', availability: 'coming-soon' },
  { code: 'NL', name: 'Netherlands', region: 'Europe', currency: 'EUR', timezone: 'Europe/Amsterdam', dateFormat: 'dd-mm-yyyy', numberFormat: 'dot-comma', fiscalYearStart: 1, weekStart: 'monday', availability: 'coming-soon' },
  { code: 'ES', name: 'Spain', region: 'Europe', currency: 'EUR', timezone: 'Europe/Madrid', dateFormat: 'dd/mm/yyyy', numberFormat: 'dot-comma', fiscalYearStart: 1, weekStart: 'monday', availability: 'coming-soon' },

  { code: 'US', name: 'United States', region: 'Americas', currency: 'USD', timezone: 'America/New_York', dateFormat: 'mm/dd/yyyy', numberFormat: 'comma-dot', fiscalYearStart: 1, weekStart: 'sunday', availability: 'beta' },
  { code: 'CA', name: 'Canada', region: 'Americas', currency: 'CAD', timezone: 'America/Toronto', dateFormat: 'yyyy-mm-dd', numberFormat: 'comma-dot', fiscalYearStart: 1, weekStart: 'sunday', availability: 'coming-soon' },
  { code: 'MX', name: 'Mexico', region: 'Americas', currency: 'MXN', timezone: 'America/Mexico_City', dateFormat: 'dd/mm/yyyy', numberFormat: 'comma-dot', fiscalYearStart: 1, weekStart: 'monday', availability: 'coming-soon' },
  { code: 'BR', name: 'Brazil', region: 'Americas', currency: 'BRL', timezone: 'America/Sao_Paulo', dateFormat: 'dd/mm/yyyy', numberFormat: 'dot-comma', fiscalYearStart: 1, weekStart: 'sunday', availability: 'coming-soon' },

  { code: 'AE', name: 'United Arab Emirates', region: 'Middle East & Africa', currency: 'AED', timezone: 'Asia/Dubai', dateFormat: 'dd/mm/yyyy', numberFormat: 'comma-dot', fiscalYearStart: 1, weekStart: 'monday', availability: 'beta' },
  { code: 'SA', name: 'Saudi Arabia', region: 'Middle East & Africa', currency: 'SAR', timezone: 'Asia/Riyadh', dateFormat: 'dd/mm/yyyy', numberFormat: 'comma-dot', fiscalYearStart: 1, weekStart: 'sunday', availability: 'coming-soon' },
  { code: 'QA', name: 'Qatar', region: 'Middle East & Africa', currency: 'QAR', timezone: 'Asia/Qatar', dateFormat: 'dd/mm/yyyy', numberFormat: 'comma-dot', fiscalYearStart: 1, weekStart: 'sunday', availability: 'coming-soon' },
  { code: 'ZA', name: 'South Africa', region: 'Middle East & Africa', currency: 'ZAR', timezone: 'Africa/Johannesburg', dateFormat: 'yyyy-mm-dd', numberFormat: 'space-comma', fiscalYearStart: 3, weekStart: 'monday', availability: 'coming-soon' },
  { code: 'NG', name: 'Nigeria', region: 'Middle East & Africa', currency: 'NGN', timezone: 'Africa/Lagos', dateFormat: 'dd/mm/yyyy', numberFormat: 'comma-dot', fiscalYearStart: 1, weekStart: 'monday', availability: 'coming-soon' },
  { code: 'KE', name: 'Kenya', region: 'Middle East & Africa', currency: 'KES', timezone: 'Africa/Nairobi', dateFormat: 'dd/mm/yyyy', numberFormat: 'comma-dot', fiscalYearStart: 7, weekStart: 'monday', availability: 'coming-soon' },
  { code: 'EG', name: 'Egypt', region: 'Middle East & Africa', currency: 'EGP', timezone: 'Africa/Cairo', dateFormat: 'dd/mm/yyyy', numberFormat: 'comma-dot', fiscalYearStart: 7, weekStart: 'sunday', availability: 'coming-soon' },

  { code: 'PK', name: 'Pakistan', region: 'Asia Pacific', currency: 'PKR', timezone: 'Asia/Karachi', dateFormat: 'dd/mm/yyyy', numberFormat: 'indian', fiscalYearStart: 7, weekStart: 'monday', availability: 'beta' },
  { code: 'IN', name: 'India', region: 'Asia Pacific', currency: 'INR', timezone: 'Asia/Kolkata', dateFormat: 'dd/mm/yyyy', numberFormat: 'indian', fiscalYearStart: 4, weekStart: 'monday', availability: 'coming-soon' },
  { code: 'BD', name: 'Bangladesh', region: 'Asia Pacific', currency: 'BDT', timezone: 'Asia/Dhaka', dateFormat: 'dd/mm/yyyy', numberFormat: 'indian', fiscalYearStart: 7, weekStart: 'sunday', availability: 'coming-soon' },
  { code: 'LK', name: 'Sri Lanka', region: 'Asia Pacific', currency: 'LKR', timezone: 'Asia/Colombo', dateFormat: 'yyyy-mm-dd', numberFormat: 'comma-dot', fiscalYearStart: 1, weekStart: 'monday', availability: 'coming-soon' },
  { code: 'MY', name: 'Malaysia', region: 'Asia Pacific', currency: 'MYR', timezone: 'Asia/Kuala_Lumpur', dateFormat: 'dd/mm/yyyy', numberFormat: 'comma-dot', fiscalYearStart: 1, weekStart: 'monday', availability: 'coming-soon' },
  { code: 'SG', name: 'Singapore', region: 'Asia Pacific', currency: 'SGD', timezone: 'Asia/Singapore', dateFormat: 'dd/mm/yyyy', numberFormat: 'comma-dot', fiscalYearStart: 1, weekStart: 'monday', availability: 'coming-soon' },
  { code: 'ID', name: 'Indonesia', region: 'Asia Pacific', currency: 'IDR', timezone: 'Asia/Jakarta', dateFormat: 'dd/mm/yyyy', numberFormat: 'dot-comma', fiscalYearStart: 1, weekStart: 'monday', availability: 'coming-soon' },
  { code: 'PH', name: 'Philippines', region: 'Asia Pacific', currency: 'PHP', timezone: 'Asia/Manila', dateFormat: 'mm/dd/yyyy', numberFormat: 'comma-dot', fiscalYearStart: 1, weekStart: 'sunday', availability: 'coming-soon' },
  { code: 'AU', name: 'Australia', region: 'Asia Pacific', currency: 'AUD', timezone: 'Australia/Sydney', dateFormat: 'dd/mm/yyyy', numberFormat: 'comma-dot', fiscalYearStart: 7, weekStart: 'monday', availability: 'coming-soon' },
  { code: 'NZ', name: 'New Zealand', region: 'Asia Pacific', currency: 'NZD', timezone: 'Pacific/Auckland', dateFormat: 'dd/mm/yyyy', numberFormat: 'comma-dot', fiscalYearStart: 4, weekStart: 'monday', availability: 'coming-soon' },
];

export const REGION_ORDER = ['Europe', 'Americas', 'Middle East & Africa', 'Asia Pacific'] as const;

/** Section 71: these are configured independently and need not match each other. */
export const LOCALE_AXES = [
  {
    title: 'Country',
    body: 'Sets the address format, phone format and the regional defaults a company starts from.',
  },
  {
    title: 'Language',
    body: 'Chosen per user and defaulted per workspace. The interface is built to hold right-to-left languages without breaking.',
  },
  {
    title: 'Currency',
    body: 'The currency a company works in. It does not have to match the country of registration.',
  },
  {
    title: 'Time zone',
    body: 'Drives timestamps, audit entries and scheduling. Set per company, independent of country.',
  },
];

/** Currencies ERPFY can configure a company in. Independent of country (section 71). */
export const CURRENCIES: { code: string; name: string }[] = [
  { code: 'AED', name: 'UAE dirham' },
  { code: 'AUD', name: 'Australian dollar' },
  { code: 'BDT', name: 'Bangladeshi taka' },
  { code: 'BRL', name: 'Brazilian real' },
  { code: 'CAD', name: 'Canadian dollar' },
  { code: 'EGP', name: 'Egyptian pound' },
  { code: 'EUR', name: 'Euro' },
  { code: 'GBP', name: 'Pound sterling' },
  { code: 'IDR', name: 'Indonesian rupiah' },
  { code: 'INR', name: 'Indian rupee' },
  { code: 'KES', name: 'Kenyan shilling' },
  { code: 'LKR', name: 'Sri Lankan rupee' },
  { code: 'MXN', name: 'Mexican peso' },
  { code: 'MYR', name: 'Malaysian ringgit' },
  { code: 'NGN', name: 'Nigerian naira' },
  { code: 'NZD', name: 'New Zealand dollar' },
  { code: 'PHP', name: 'Philippine peso' },
  { code: 'PKR', name: 'Pakistani rupee' },
  { code: 'QAR', name: 'Qatari riyal' },
  { code: 'SAR', name: 'Saudi riyal' },
  { code: 'SGD', name: 'Singapore dollar' },
  { code: 'USD', name: 'US dollar' },
  { code: 'ZAR', name: 'South African rand' },
];

/** Countries a company can be created in today. */
export function selectableCountries(): Country[] {
  return COUNTRIES.filter((country) => country.availability !== 'unavailable');
}

export function findCountry(code: string): Country | undefined {
  return COUNTRIES.find((country) => country.code === code.toUpperCase());
}

export function isSupportedCurrency(code: string): boolean {
  return CURRENCIES.some((currency) => currency.code === code.toUpperCase());
}
