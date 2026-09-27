/**
 * ERPFY Plugin Registry & Loader
 *
 * Equivalent to wp-content/plugins/ management.
 * Discovers, registers, and activates modular ERP plugins.
 */

export interface PluginManifest {
  id: string;
  name: string;
  version: string;
  description: string;
  author: string;
  icon?: string;
  category: string;
  requires?: string[];
  capabilities?: string[];
  status: 'active' | 'inactive' | 'locked';
}

/** Registry of available first-party and private plugins */
export const REGISTERED_PLUGINS: Record<string, PluginManifest> = {
  'erpfy.contacts_crm': {
    id: 'erpfy.contacts_crm',
    name: 'Contacts & CRM Foundation',
    version: '1.0.0',
    description: 'Universal contacts, customer directory, leads, and CRM interactions.',
    author: 'ERPFY Core Team',
    category: 'CRM & Sales',
    capabilities: ['contacts.read', 'contacts.write', 'contacts.export'],
    status: 'active',
  },
  'erpfy.accounting': {
    id: 'erpfy.accounting',
    name: 'Accounting Core',
    version: '1.0.0',
    description: 'Authoritative ledger, journals, invoices, bills, payments, AR/AP, and close.',
    author: 'ERPFY Finance Team',
    category: 'Finance & Accounting',
    capabilities: ['accounting.ledger', 'accounting.invoices', 'accounting.journals'],
    status: 'active',
  },
};

export function getAvailablePlugins(): PluginManifest[] {
  return Object.values(REGISTERED_PLUGINS);
}

export function getPluginById(id: string): PluginManifest | undefined {
  return REGISTERED_PLUGINS[id];
}
