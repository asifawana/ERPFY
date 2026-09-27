'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Building2, Check, ChevronsUpDown, Plus, Search } from 'lucide-react';
import type { CompanyAccess } from '@/lib/core/company';
import { cn } from '@/lib/utils';

export function CompanySwitcher({
  currentCompanySlug,
  currentCompanyName,
  companies = [],
}: {
  currentCompanySlug?: string | null;
  currentCompanyName?: string | null;
  companies?: CompanyAccess[];
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [open]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    }
    if (open) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  const filteredCompanies = companies.filter((c) =>
    c.name.toLowerCase().includes(query.toLowerCase()) ||
    c.slug.toLowerCase().includes(query.toLowerCase()),
  );

  const active = companies.find((c) => c.slug === currentCompanySlug);
  const displayName = active?.name || currentCompanyName || (companies.length > 0 ? companies[0].name : 'Personal Account');

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="flex h-8 max-w-[200px] items-center gap-1.5 rounded-lg border border-white/20 bg-black/20 px-2.5 text-xs font-semibold text-white transition hover:bg-black/30 active:scale-95 sm:max-w-[260px]"
        title={displayName}
        aria-expanded={open}
        aria-label="Switch company workspace"
      >
        <Building2 className="size-3.5 shrink-0 text-white/80" />
        <span className="truncate">{displayName}</span>
        <ChevronsUpDown className="ml-auto size-3 shrink-0 opacity-60" />
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-1.5 w-72 max-w-[calc(100vw-1.5rem)] origin-top-left rounded-2xl border border-[var(--erpfy-line)] bg-[var(--erpfy-surface)] p-2 text-left text-[var(--erpfy-ink)] shadow-2xl z-50 animate-in fade-in-0 zoom-in-95 duration-100">
          <div className="mb-2 px-1">
            <div className="flex items-center gap-2 rounded-xl border border-[var(--erpfy-line)] bg-[var(--erpfy-surface-subtle)] px-2.5 py-1.5">
              <Search className="size-3.5 text-[var(--erpfy-ink-muted)] shrink-0" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search ERPs..."
                className="w-full bg-transparent text-xs text-[var(--erpfy-ink)] placeholder-[var(--erpfy-ink-muted)] outline-hidden"
              />
            </div>
          </div>

          <div className="max-h-56 overflow-y-auto space-y-0.5">
            <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-[var(--erpfy-ink-muted)]">
              Your ERP Workspaces
            </div>

            {filteredCompanies.map((comp) => {
              const isSelected = comp.slug === currentCompanySlug;
              return (
                <button
                  key={comp.id}
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    router.push(`/c/${comp.slug}`);
                  }}
                  className={cn(
                    'flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-xs font-medium text-[var(--erpfy-ink)] transition-colors hover:bg-[var(--erpfy-hover)]',
                    isSelected && 'bg-[var(--erpfy-hover)] font-semibold text-[var(--erpfy-ink-strong)]',
                  )}
                >
                  <span className="grid size-6 shrink-0 place-items-center rounded-md bg-[var(--erpfy-brand-soft)] text-[10px] font-bold text-[var(--erpfy-brand-soft-ink)]">
                    {comp.name[0]?.toUpperCase()}
                  </span>
                  <div className="min-w-0 flex-1 text-left">
                    <p className="truncate text-xs font-semibold">{comp.name}</p>
                    <p className="truncate text-[10px] text-[var(--erpfy-ink-muted)]">
                      {comp.slug} · {comp.role}
                    </p>
                  </div>
                  {isSelected && <Check className="size-3.5 text-[var(--erpfy-brand)] shrink-0" />}
                </button>
              );
            })}

            {filteredCompanies.length === 0 && (
              <div className="px-2 py-4 text-center text-xs text-[var(--erpfy-ink-muted)]">
                No workspaces match &ldquo;{query}&rdquo;
              </div>
            )}
          </div>

          <div className="my-1 border-t border-[var(--erpfy-line-soft)]" />

          <Link
            href="/account"
            onClick={() => setOpen(false)}
            className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-xs font-medium text-[var(--erpfy-ink)] transition-colors hover:bg-[var(--erpfy-hover)]"
          >
            <Building2 className="size-4 text-[var(--erpfy-ink-muted)]" />
            <span>All My ERPs</span>
          </Link>

          <Link
            href="/account/create"
            onClick={() => setOpen(false)}
            className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-xs font-semibold text-[var(--erpfy-brand)] transition-colors hover:bg-[var(--erpfy-hover)]"
          >
            <Plus className="size-4" />
            <span>Create New ERP</span>
          </Link>
        </div>
      )}
    </div>
  );
}
