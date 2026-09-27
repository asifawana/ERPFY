/** Exact IDs written by the retired sample-catalog seeder, not real releases. */
export const LEGACY_SAMPLE_APP_IDS = [
  'app_shipping_tracker',
  'app_tax_calculator',
  'app_crm_connect',
] as const;

export function isLegacySampleApp(appId: string): boolean {
  return LEGACY_SAMPLE_APP_IDS.some((sampleId) => sampleId === appId);
}
