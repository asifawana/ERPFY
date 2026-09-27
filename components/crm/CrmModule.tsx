'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Users,
  Building2,
  Target,
  Plus,
  Download,
  Search,
  ArrowRight,
  Mail,
  Phone,
  Layers,
} from 'lucide-react';

import { cn } from '@/lib/utils';
import {
  ErpfyButton,
  ErpfyPanel,
  ErpfyStatus,
} from '@/lib/design-system';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import type {
  PartyRecord,
  FullPartyProfile,
  LeadRecord,
  PartyType,
  PartyRoleKey,
} from '@/plugins/erpfy.contacts_crm/src/contracts/types';

export type CrmViewMode = 'overview' | 'contacts' | 'companies' | 'leads' | 'opportunities';

export function CrmModule({
  companyId,
  initialView = 'overview',
  currency = '$',
}: {
  companyId: string;
  companySlug?: string;
  initialView?: CrmViewMode;
  currency?: string;
}) {
  const [viewMode, setViewMode] = useState<CrmViewMode>(initialView);
  const [parties, setParties] = useState<(PartyRecord & { roles: string[] })[]>([]);
  const [leads, setLeads] = useState<LeadRecord[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRole, setSelectedRole] = useState<string>('all');
  const [selectedParty, setSelectedParty] = useState<FullPartyProfile | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  // Add Party Modal
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [formDisplayName, setFormDisplayName] = useState('');
  const [formPartyType, setFormPartyType] = useState<PartyType>('person');
  const [formEmail, setFormEmail] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formRole, setFormRole] = useState<PartyRoleKey>('customer');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Convert Lead Modal
  const [convertingLead, setConvertingLead] = useState<LeadRecord | null>(null);
  const [convertRole, setConvertRole] = useState<PartyRoleKey>('customer');

  const fetchCrmData = useCallback(async () => {
    if (!companyId) return;
    try {
      const [partiesRes, leadsRes] = await Promise.all([
        fetch(`/api/crm/parties?companyId=${encodeURIComponent(companyId)}`),
        fetch(`/api/crm/leads?companyId=${encodeURIComponent(companyId)}`),
      ]);

      if (partiesRes.ok) {
        const pData = (await partiesRes.json()) as { parties?: (PartyRecord & { roles: string[] })[] };
        setParties(pData.parties || []);
      }
      if (leadsRes.ok) {
        const lData = (await leadsRes.json()) as { leads?: LeadRecord[] };
        setLeads(lData.leads || []);
      }
    } catch {
      // Retain previous state on network failure
    }
  }, [companyId]);

  useEffect(() => {
    let active = true;
    const load = async () => {
      if (!companyId || !active) return;
      await fetchCrmData();
    };
    void load();
    return () => {
      active = false;
    };
  }, [companyId, fetchCrmData]);

  const filteredParties = useMemo(() => {
    return parties.filter((p) => {
      if (viewMode === 'companies' && p.partyType !== 'organization') return false;
      const matchesSearch =
        p.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.primaryEmail.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.primaryPhone.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesRole = selectedRole === 'all' || p.roles.includes(selectedRole);
      return matchesSearch && matchesRole;
    });
  }, [parties, viewMode, searchQuery, selectedRole]);

  const metrics = useMemo(() => {
    const totalParties = parties.length;
    const totalPersons = parties.filter((p) => p.partyType === 'person').length;
    const totalOrgs = parties.filter((p) => p.partyType === 'organization').length;
    const totalLeads = leads.length;
    const openLeads = leads.filter((l) => l.status !== 'converted' && l.status !== 'lost').length;
    return { totalParties, totalPersons, totalOrgs, totalLeads, openLeads };
  }, [parties, leads]);

  const handleOpenDetail = async (partyId: string) => {
    try {
      const res = await fetch(`/api/crm/parties/${encodeURIComponent(partyId)}?companyId=${encodeURIComponent(companyId)}`);
      if (res.ok) {
        const data = (await res.json()) as { party?: FullPartyProfile };
        if (data.party) {
          setSelectedParty(data.party);
          setIsDetailOpen(true);
        }
      }
    } catch {}
  };

  const handleCreateParty = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!formDisplayName.trim()) return;

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/crm/parties', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyId,
          displayName: formDisplayName.trim(),
          partyType: formPartyType,
          primaryEmail: formEmail.trim() || undefined,
          primaryPhone: formPhone.trim() || undefined,
          initialRoles: [formRole],
        }),
      });

      if (res.ok) {
        setIsAddOpen(false);
        setFormDisplayName('');
        setFormEmail('');
        setFormPhone('');
        void fetchCrmData();
      }
    } catch {} finally {
      setIsSubmitting(false);
    }
  };

  const handleConvertLead = async () => {
    if (!convertingLead) return;
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/crm/leads/${encodeURIComponent(convertingLead.id)}/convert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyId,
          assignRoles: [convertRole],
          displayName: convertingLead.title,
        }),
      });

      if (res.ok) {
        setConvertingLead(null);
        void fetchCrmData();
      }
    } catch {} finally {
      setIsSubmitting(false);
    }
  };

  const handleExportCsv = () => {
    window.location.href = `/api/crm/export?companyId=${encodeURIComponent(companyId)}`;
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-[#111827] dark:text-white">
              Contacts & CRM Master
            </h1>
            <span className="rounded-full bg-[var(--erpfy-brand-soft)] px-2.5 py-0.5 text-xs font-semibold text-[var(--erpfy-brand-soft-ink)] border border-[var(--erpfy-brand-line,#b7d7c2)]">
              Universal Party Engine
            </span>
          </div>
          <p className="text-sm text-[var(--erpfy-ink-muted)]">
            Canonical identity, multi-role parties, and relationship foundation for ERPFY.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleExportCsv}
            className="inline-flex items-center gap-2 rounded-lg border border-[#E5E7EB] bg-white px-3 py-2 text-sm font-semibold text-[#374151] hover:bg-[#F9FAFB] dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700 transition-colors shadow-2xs cursor-pointer"
          >
            <Download className="h-4 w-4 text-[var(--erpfy-ink-muted)]" />
            Export
          </button>
          <button
            type="button"
            onClick={() => setIsAddOpen(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-[var(--erpfy-brand)] px-3.5 py-2 text-sm font-semibold text-[var(--erpfy-brand-on)] hover:bg-[var(--erpfy-brand-hover,#15803d)] transition-colors shadow-xs cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            Add Party / Contact
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-[#E5E7EB] bg-white p-4 shadow-xs dark:border-gray-800 dark:bg-[#1f2937]">
          <div className="flex items-center justify-between text-[var(--erpfy-ink-muted)] mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Parties</span>
            <span className="grid size-7 place-items-center rounded-lg bg-[var(--erpfy-brand-soft)] text-[var(--erpfy-brand-soft-ink)]">
              <Users className="h-4 w-4" />
            </span>
          </div>
          <div className="text-2xl font-bold text-[#111827] dark:text-white">{metrics.totalParties}</div>
          <div className="mt-1 flex items-center gap-2 text-xs text-[var(--erpfy-ink-muted)]">
            <span>{metrics.totalPersons} Persons</span>
            <span>•</span>
            <span>{metrics.totalOrgs} Organizations</span>
          </div>
        </div>

        <div className="rounded-xl border border-[#E5E7EB] bg-white p-4 shadow-xs dark:border-gray-800 dark:bg-[#1f2937]">
          <div className="flex items-center justify-between text-[var(--erpfy-ink-muted)] mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Active Leads</span>
            <span className="grid size-7 place-items-center rounded-lg bg-sky-50 text-sky-700 dark:bg-sky-950 dark:text-sky-300">
              <Target className="h-4 w-4" />
            </span>
          </div>
          <div className="text-2xl font-bold text-[#111827] dark:text-white">{metrics.openLeads}</div>
          <p className="mt-1 text-xs text-[var(--erpfy-ink-muted)]">Pipeline prospects</p>
        </div>

        <div className="rounded-xl border border-[#E5E7EB] bg-white p-4 shadow-xs dark:border-gray-800 dark:bg-[#1f2937]">
          <div className="flex items-center justify-between text-[var(--erpfy-ink-muted)] mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Organizations</span>
            <span className="grid size-7 place-items-center rounded-lg bg-purple-50 text-purple-700 dark:bg-purple-950 dark:text-purple-300">
              <Building2 className="h-4 w-4" />
            </span>
          </div>
          <div className="text-2xl font-bold text-[#111827] dark:text-white">{metrics.totalOrgs}</div>
          <p className="mt-1 text-xs text-[var(--erpfy-ink-muted)]">Companies, dealers & vendors</p>
        </div>

        <div className="rounded-xl border border-[#E5E7EB] bg-white p-4 shadow-xs dark:border-gray-800 dark:bg-[#1f2937]">
          <div className="flex items-center justify-between text-[var(--erpfy-ink-muted)] mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Party Roles</span>
            <span className="grid size-7 place-items-center rounded-lg bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300">
              <Layers className="h-4 w-4" />
            </span>
          </div>
          <div className="text-2xl font-bold text-[#111827] dark:text-white">
            {parties.reduce((acc, p) => acc + p.roles.length, 0)}
          </div>
          <p className="mt-1 text-xs text-[var(--erpfy-ink-muted)]">Multi-role assignments</p>
        </div>
      </div>

      {/* Sub-Navigation Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#E5E7EB] dark:border-gray-800 pb-3">
        <div className="flex gap-2">
          {(
            [
              { id: 'overview', label: 'Overview', icon: Layers },
              { id: 'contacts', label: 'All Parties & Contacts', icon: Users },
              { id: 'companies', label: 'Organizations', icon: Building2 },
              { id: 'leads', label: 'Leads & Prospects', icon: Target },
            ] as const
          ).map((t) => {
            const Icon = t.icon;
            const active = viewMode === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setViewMode(t.id)}
                className={cn(
                  'inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors cursor-pointer',
                  active
                    ? 'bg-[var(--erpfy-brand-soft)] text-[var(--erpfy-brand-soft-ink)] font-semibold'
                    : 'text-[var(--erpfy-ink-muted)] hover:bg-[#F3F4F6] dark:hover:bg-gray-800 hover:text-[#111827] dark:hover:text-white',
                )}
              >
                <Icon className="h-4 w-4" />
                {t.label}
              </button>
            );
          })}
        </div>

        {/* Search & Filters */}
        <div className="flex items-center gap-2">
          <div className="relative w-64">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-[var(--erpfy-ink-muted)]" />
            <input
              type="text"
              aria-label="Search parties"
              placeholder="Search by name, email, phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-lg border border-[#E5E7EB] bg-white py-1.5 pl-9 pr-3 text-sm text-[#111827] placeholder:text-[var(--erpfy-ink-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--erpfy-focus)] focus:border-[var(--erpfy-brand)] dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            />
          </div>

          <select
            aria-label="Filter by role"
            value={selectedRole}
            onChange={(e) => setSelectedRole(e.target.value)}
            className="rounded-lg border border-[#E5E7EB] bg-white px-3 py-1.5 text-sm text-[#111827] focus:outline-none focus:ring-2 focus:ring-[var(--erpfy-focus)] focus:border-[var(--erpfy-brand)] dark:border-gray-700 dark:bg-gray-800 dark:text-white"
          >
            <option value="all">All Roles</option>
            <option value="customer">Customer</option>
            <option value="supplier">Supplier / Vendor</option>
            <option value="dealer">Dealer</option>
            <option value="distributor">Distributor</option>
            <option value="farmer">Farmer</option>
            <option value="lead">Lead</option>
          </select>
        </div>
      </div>

      {/* Main Content Area */}
      {viewMode === 'leads' ? (
        /* Leads View */
        <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
          <div className="p-4 border-b border-border flex items-center justify-between">
            <h2 className="text-base font-semibold text-foreground">Leads & Relationship Inflow</h2>
            <span className="text-xs text-muted-foreground">{leads.length} recorded leads</span>
          </div>

          {leads.length === 0 ? (
            <div className="p-12 text-center">
              <Target className="mx-auto h-12 w-12 text-muted-foreground/50 mb-3" />
              <h3 className="text-base font-medium text-foreground">No leads recorded yet</h3>
              <p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto">
                Incoming prospective relationships will appear here and can be converted into canonical Parties.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-muted/50 text-xs font-semibold uppercase text-muted-foreground border-b border-border">
                  <tr>
                    <th className="px-4 py-3">Lead Title</th>
                    <th className="px-4 py-3">Source</th>
                    <th className="px-4 py-3">Est. Value</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {leads.map((lead) => (
                    <tr key={lead.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 font-medium text-foreground">{lead.title}</td>
                      <td className="px-4 py-3 text-muted-foreground">{lead.source || 'Direct'}</td>
                      <td className="px-4 py-3 font-semibold text-foreground">
                        {currency} {lead.estimatedValue.toLocaleString()}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={cn(
                            'rounded-full px-2 py-0.5 text-xs font-medium uppercase tracking-wider',
                            lead.status === 'converted'
                              ? 'bg-[var(--erpfy-brand-soft)] text-[var(--erpfy-brand-soft-ink)]'
                              : 'bg-sky-500/10 text-sky-600',
                          )}
                        >
                          {lead.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        {lead.status !== 'converted' && (
                          <button
                            type="button"
                            onClick={() => setConvertingLead(lead)}
                            className="inline-flex items-center gap-1.5 rounded-md border border-[var(--erpfy-brand)] bg-[var(--erpfy-brand-soft)] px-2.5 py-1 text-xs font-semibold text-[var(--erpfy-brand-soft-ink)] hover:bg-[var(--erpfy-brand)] hover:text-[var(--erpfy-brand-on)] transition-colors cursor-pointer"
                          >
                            Convert to Party
                            <ArrowRight className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        /* Parties Table View */
        <div className="rounded-xl border border-[#E5E7EB] bg-white shadow-xs overflow-hidden dark:border-gray-800 dark:bg-[#1f2937]">
          {filteredParties.length === 0 ? (
            <div className="p-12 text-center">
              <Users className="mx-auto h-12 w-12 text-[var(--erpfy-ink-muted)] opacity-50 mb-3" />
              <h3 className="text-base font-bold text-[#111827] dark:text-white">No contacts yet</h3>
              <p className="text-sm text-[var(--erpfy-ink-muted)] mt-1 max-w-sm mx-auto">
                Create a person or organization to start building your unified party directory.
              </p>
              <div className="mt-6 flex items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={() => setIsAddOpen(true)}
                  className="inline-flex items-center gap-2 rounded-lg bg-[var(--erpfy-brand)] px-4 py-2 text-sm font-semibold text-[var(--erpfy-brand-on)] hover:bg-[var(--erpfy-brand-hover,#15803d)] transition-colors shadow-xs cursor-pointer"
                >
                  <Plus className="h-4 w-4" />
                  Add Contact
                </button>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-[#F9FAFB] text-xs font-semibold uppercase text-[var(--erpfy-ink-muted)] border-b border-[#E5E7EB] dark:bg-gray-800/50 dark:border-gray-800">
                  <tr>
                    <th className="px-4 py-3">Party Name</th>
                    <th className="px-4 py-3">Type</th>
                    <th className="px-4 py-3">Roles</th>
                    <th className="px-4 py-3">Contact Details</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F3F4F6] dark:divide-gray-800">
                  {filteredParties.map((party) => (
                    <tr key={party.id} className="hover:bg-[#F9FAFB] dark:hover:bg-gray-800/40 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#F3F4F6] text-[#111827] dark:bg-gray-800 dark:text-white font-bold">
                            {party.partyType === 'organization' ? (
                              <Building2 className="h-4 w-4 text-purple-600" />
                            ) : (
                              <Users className="h-4 w-4 text-[var(--erpfy-brand)]" />
                            )}
                          </div>
                          <div>
                            <div className="font-semibold text-[#111827] dark:text-white">{party.displayName}</div>
                            {party.legalName && party.legalName !== party.displayName && (
                              <div className="text-xs text-[var(--erpfy-ink-muted)]">{party.legalName}</div>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-3 text-xs capitalize text-[var(--erpfy-ink-muted)]">
                        {party.partyType}
                      </td>

                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {party.roles.map((r) => (
                            <span
                              key={r}
                              className="rounded-full bg-[#F3F4F6] px-2 py-0.5 text-xs font-semibold text-[#4B5563] border border-[#E5E7EB] dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700"
                            >
                              {r}
                            </span>
                          ))}
                        </div>
                      </td>

                      <td className="px-4 py-3 text-xs text-[var(--erpfy-ink-muted)] space-y-0.5">
                        {party.primaryEmail && (
                          <div className="flex items-center gap-1.5 text-[#111827] dark:text-gray-200">
                            <Mail className="h-3.5 w-3.5 text-[var(--erpfy-ink-muted)]" />
                            <span>{party.primaryEmail}</span>
                          </div>
                        )}
                        {party.primaryPhone && (
                          <div className="flex items-center gap-1.5 text-[var(--erpfy-ink-muted)]">
                            <Phone className="h-3.5 w-3.5" />
                            <span>{party.primaryPhone}</span>
                          </div>
                        )}
                      </td>

                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--erpfy-brand)]">
                          <span className="h-1.5 w-1.5 rounded-full bg-[var(--erpfy-brand)]" />
                          Active
                        </span>
                      </td>

                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => handleOpenDetail(party.id)}
                          className="rounded-md px-2.5 py-1 text-xs font-semibold text-[var(--erpfy-brand)] hover:bg-[var(--erpfy-brand-soft)] transition-colors cursor-pointer"
                        >
                          View Details
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Add Party Dialog */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Canonical Party</DialogTitle>
            <DialogDescription>
              Create a unified Person or Organization party record.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateParty} className="space-y-4 py-2">
            <div>
              <span className="block text-xs font-medium text-[var(--erpfy-ink-muted)] mb-1">
                Party Type
              </span>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setFormPartyType('person')}
                  className={cn(
                    'flex items-center justify-center gap-2 rounded-lg border py-2 text-sm font-medium transition-colors cursor-pointer',
                    formPartyType === 'person'
                      ? 'border-[var(--erpfy-brand)] bg-[var(--erpfy-brand-soft)] text-[var(--erpfy-brand-soft-ink)] font-semibold'
                      : 'border-[#E5E7EB] text-[var(--erpfy-ink-muted)] hover:bg-[#F9FAFB] dark:border-gray-700 dark:hover:bg-gray-800',
                  )}
                >
                  <Users className="h-4 w-4" /> Person
                </button>
                <button
                  type="button"
                  onClick={() => setFormPartyType('organization')}
                  className={cn(
                    'flex items-center justify-center gap-2 rounded-lg border py-2 text-sm font-medium transition-colors cursor-pointer',
                    formPartyType === 'organization'
                      ? 'border-[var(--erpfy-brand)] bg-[var(--erpfy-brand-soft)] text-[var(--erpfy-brand-soft-ink)] font-semibold'
                      : 'border-[#E5E7EB] text-[var(--erpfy-ink-muted)] hover:bg-[#F9FAFB] dark:border-gray-700 dark:hover:bg-gray-800',
                  )}
                >
                  <Building2 className="h-4 w-4" /> Organization
                </button>
              </div>
            </div>

            <div>
              <label htmlFor="party-name-input" className="block text-xs font-medium text-[var(--erpfy-ink-muted)] mb-1">
                Display Name *
              </label>
              <input
                id="party-name-input"
                type="text"
                required
                placeholder="e.g. XYZ Traders or Muhammad Asif"
                value={formDisplayName}
                onChange={(e) => setFormDisplayName(e.target.value)}
                className="w-full rounded-lg border border-[#E5E7EB] bg-white px-3 py-2 text-sm text-[#111827] focus:outline-none focus:ring-2 focus:ring-[var(--erpfy-focus)] focus:border-[var(--erpfy-brand)] dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="party-email-input" className="block text-xs font-medium text-[var(--erpfy-ink-muted)] mb-1">
                  Primary Email
                </label>
                <input
                  id="party-email-input"
                  type="email"
                  placeholder="name@company.com"
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                  className="w-full rounded-lg border border-[#E5E7EB] bg-white px-3 py-2 text-sm text-[#111827] focus:outline-none focus:ring-2 focus:ring-[var(--erpfy-focus)] focus:border-[var(--erpfy-brand)] dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                />
              </div>
              <div>
                <label htmlFor="party-phone-input" className="block text-xs font-medium text-[var(--erpfy-ink-muted)] mb-1">
                  Primary Phone
                </label>
                <input
                  id="party-phone-input"
                  type="tel"
                  placeholder="+92 300 1234567"
                  value={formPhone}
                  onChange={(e) => setFormPhone(e.target.value)}
                  className="w-full rounded-lg border border-[#E5E7EB] bg-white px-3 py-2 text-sm text-[#111827] focus:outline-none focus:ring-2 focus:ring-[var(--erpfy-focus)] focus:border-[var(--erpfy-brand)] dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                />
              </div>
            </div>

            <div>
              <label htmlFor="party-role-select" className="block text-xs font-medium text-[var(--erpfy-ink-muted)] mb-1">
                Initial Primary Role
              </label>
              <select
                id="party-role-select"
                value={formRole}
                onChange={(e) => setFormRole(e.target.value as PartyRoleKey)}
                className="w-full rounded-lg border border-[#E5E7EB] bg-white px-3 py-2 text-sm text-[#111827] focus:outline-none focus:ring-2 focus:ring-[var(--erpfy-focus)] focus:border-[var(--erpfy-brand)] dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              >
                <option value="customer">Customer</option>
                <option value="supplier">Supplier / Vendor</option>
                <option value="dealer">Dealer</option>
                <option value="distributor">Distributor</option>
                <option value="farmer">Farmer</option>
                <option value="partner">Partner</option>
              </select>
            </div>

            <DialogFooter className="pt-2">
              <button
                type="button"
                onClick={() => setIsAddOpen(false)}
                className="rounded-lg border border-[#E5E7EB] px-4 py-2 text-sm font-semibold text-[#374151] hover:bg-[#F9FAFB] dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="rounded-lg bg-[var(--erpfy-brand)] px-4 py-2 text-sm font-semibold text-[var(--erpfy-brand-on)] hover:bg-[var(--erpfy-brand-hover,#15803d)] disabled:opacity-50 cursor-pointer shadow-xs"
              >
                {isSubmitting ? 'Saving...' : 'Create Party'}
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Convert Lead Dialog */}
      <Dialog open={Boolean(convertingLead)} onOpenChange={(open) => !open && setConvertingLead(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Convert Lead to Party</DialogTitle>
            <DialogDescription>
              Assign a role and convert this prospective relationship into the canonical directory.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="rounded-lg bg-[#F9FAFB] p-3 dark:bg-gray-800">
              <div className="font-semibold text-sm text-[#111827] dark:text-white">{convertingLead?.title}</div>
              <div className="text-xs text-[var(--erpfy-ink-muted)]">Source: {convertingLead?.source || 'Direct'}</div>
            </div>

            <div>
              <label htmlFor="convert-lead-role-select" className="block text-xs font-medium text-[var(--erpfy-ink-muted)] mb-1">
                Assign Party Role
              </label>
              <select
                id="convert-lead-role-select"
                value={convertRole}
                onChange={(e) => setConvertRole(e.target.value as PartyRoleKey)}
                className="w-full rounded-lg border border-[#E5E7EB] bg-white px-3 py-2 text-sm text-[#111827] focus:outline-none focus:ring-2 focus:ring-[var(--erpfy-focus)] focus:border-[var(--erpfy-brand)] dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              >
                <option value="customer">Customer</option>
                <option value="dealer">Dealer</option>
                <option value="distributor">Distributor</option>
                <option value="partner">Partner</option>
              </select>
            </div>

            <DialogFooter className="pt-2">
              <button
                type="button"
                onClick={() => setConvertingLead(null)}
                className="rounded-lg border border-[#E5E7EB] px-4 py-2 text-sm font-semibold text-[#374151] hover:bg-[#F9FAFB] dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConvertLead}
                disabled={isSubmitting}
                className="rounded-lg bg-[var(--erpfy-brand)] px-4 py-2 text-sm font-semibold text-[var(--erpfy-brand-on)] hover:bg-[var(--erpfy-brand-hover,#15803d)] cursor-pointer shadow-xs"
              >
                {isSubmitting ? 'Converting...' : 'Confirm Conversion'}
              </button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* Party Detail Drawer / Modal */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="sm:max-w-xl max-h-[85vh] overflow-y-auto">
          {selectedParty && (
            <div>
              <DialogHeader>
                <div className="flex items-center gap-2 mb-1">
                  <span className="rounded bg-[#F3F4F6] px-2 py-0.5 text-xs font-semibold uppercase text-[#4B5563] dark:bg-gray-800 dark:text-gray-300">
                    {selectedParty.partyType}
                  </span>
                </div>
                <DialogTitle className="text-xl">{selectedParty.displayName}</DialogTitle>
                <DialogDescription>{selectedParty.legalName || 'Canonical Party Record'}</DialogDescription>
              </DialogHeader>

              <div className="space-y-5 py-4">
                {/* Active Roles */}
                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-[var(--erpfy-ink-muted)] mb-2">
                    Active Roles
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedParty.roles.map((r) => (
                      <span
                        key={r.id}
                        className="rounded-full bg-[var(--erpfy-brand-soft)] px-3 py-1 text-xs font-semibold text-[var(--erpfy-brand-soft-ink)] border border-[var(--erpfy-brand-line,#b7d7c2)]"
                      >
                        {r.roleKey}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Primary Contacts */}
                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-[var(--erpfy-ink-muted)] mb-2">
                    Contact Channels
                  </h4>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="rounded-lg border border-[#E5E7EB] p-3 dark:border-gray-800">
                      <span className="text-xs text-[var(--erpfy-ink-muted)] block">Email</span>
                      <span className="font-semibold text-[#111827] dark:text-white">{selectedParty.primaryEmail || 'None'}</span>
                    </div>
                    <div className="rounded-lg border border-[#E5E7EB] p-3 dark:border-gray-800">
                      <span className="text-xs text-[var(--erpfy-ink-muted)] block">Phone</span>
                      <span className="font-semibold text-[#111827] dark:text-white">{selectedParty.primaryPhone || 'None'}</span>
                    </div>
                  </div>
                </div>

                {/* Addresses */}
                {selectedParty.addresses.length > 0 && (
                  <div>
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-[var(--erpfy-ink-muted)] mb-2">
                      Registered Addresses
                    </h4>
                    <div className="space-y-2">
                      {selectedParty.addresses.map((a) => (
                        <div key={a.id} className="rounded-lg border border-[#E5E7EB] p-3 text-sm dark:border-gray-800">
                          <span className="rounded bg-[#F3F4F6] px-1.5 py-0.5 text-xs font-semibold uppercase text-[#4B5563] mr-2 dark:bg-gray-800 dark:text-gray-300">
                            {a.type}
                          </span>
                          <span className="text-[#111827] dark:text-white">
                            {a.line1}, {a.city}, {a.countryCode}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <DialogFooter>
                <button
                  type="button"
                  onClick={() => setIsDetailOpen(false)}
                  className="rounded-lg border border-[#E5E7EB] px-4 py-2 text-sm font-semibold text-[#374151] hover:bg-[#F9FAFB] dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800 cursor-pointer"
                >
                  Close
                </button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
