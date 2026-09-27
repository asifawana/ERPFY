'use client';

/**
 * ERPFY Design System v1.0 — primitives.
 * Contracts are defined in DESIGN.md section 6. Screens compose these; screens do
 * not invent their own styling. Adding a primitive requires checking DESIGN.md first.
 */

import type {
  ComponentPropsWithoutRef,
  ComponentPropsWithRef,
  ReactNode,
} from 'react';
import { useState } from 'react';
import { ChevronDown, Eye, EyeOff } from 'lucide-react';
import { cn } from '@/lib/utils';

/* ------------------------------------------------------------------ *
 * Buttons
 * ------------------------------------------------------------------ */

export type ButtonTone = 'primary' | 'secondary' | 'danger' | 'ghost';

const toneClass: Record<ButtonTone, string> = {
  primary: 'primary-button',
  secondary: 'soft-button',
  danger: 'danger-button',
  ghost: 'ghost-button',
};

export function ErpfyButton({
  tone = 'secondary',
  className,
  type = 'button',
  ...props
}: ComponentPropsWithoutRef<'button'> & { tone?: ButtonTone }) {
  return (
    <button type={type} className={cn(toneClass[tone], className)} {...props} />
  );
}

export function ErpfyIconButton({
  label,
  onDark = false,
  className,
  type = 'button',
  ...props
}: ComponentPropsWithoutRef<'button'> & { label: string; onDark?: boolean }) {
  return (
    <button
      type={type}
      aria-label={label}
      title={label}
      className={cn(
        'icon-button',
        onDark ? '' : 'icon-button-light',
        className,
      )}
      {...props}
    />
  );
}

/* ------------------------------------------------------------------ *
 * Form controls
 * ------------------------------------------------------------------ */

function FieldShell({
  label,
  hint,
  error,
  htmlFor,
  children,
}: {
  label?: string;
  hint?: string;
  error?: string;
  htmlFor?: string;
  children: ReactNode;
}) {
  return (
    <div>
      {label && (
        <label className="erpfy-label" htmlFor={htmlFor}>
          {label}
        </label>
      )}
      {children}
      {error ? (
        <p className="erpfy-error-text">{error}</p>
      ) : hint ? (
        <p className="erpfy-hint">{hint}</p>
      ) : null}
    </div>
  );
}

export function ErpfyInput({
  label,
  hint,
  error,
  className,
  id,
  type,
  ...props
}: ComponentPropsWithRef<'input'> & {
  label?: string;
  hint?: string;
  error?: string;
}) {
  const [showPassword, setShowPassword] = useState(false);
  const isPassword = type === 'password';
  const effectiveType = isPassword ? (showPassword ? 'text' : 'password') : type;

  return (
    <FieldShell label={label} hint={hint} error={error} htmlFor={id}>
      <div className={cn(isPassword && 'relative')}>
        <input
          id={id}
          type={effectiveType}
          aria-invalid={error ? true : undefined}
          className={cn(
            'erpfy-field',
            isPassword && 'pr-10',
            error && 'erpfy-field-error',
            className,
          )}
          {...props}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShowPassword((prev) => !prev)}
            aria-label={showPassword ? 'Hide password' : 'Show password'}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6B7280] hover:text-[#111827] focus:outline-hidden"
          >
            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        )}
      </div>
    </FieldShell>
  );
}

export function ErpfyTextarea({
  label,
  hint,
  error,
  className,
  id,
  rows = 4,
  ...props
}: ComponentPropsWithoutRef<'textarea'> & {
  label?: string;
  hint?: string;
  error?: string;
}) {
  return (
    <FieldShell label={label} hint={hint} error={error} htmlFor={id}>
      <textarea
        id={id}
        rows={rows}
        aria-invalid={error ? true : undefined}
        className={cn(
          'erpfy-field resize-y',
          error && 'erpfy-field-error',
          className,
        )}
        {...props}
      />
    </FieldShell>
  );
}

export function ErpfySelect({
  label,
  hint,
  error,
  className,
  id,
  children,
  ...props
}: ComponentPropsWithoutRef<'select'> & {
  label?: string;
  hint?: string;
  error?: string;
}) {
  return (
    <FieldShell label={label} hint={hint} error={error} htmlFor={id}>
      <div className="relative">
        <select
          id={id}
          aria-invalid={error ? true : undefined}
          className={cn(
            'erpfy-field appearance-none pe-9',
            error && 'erpfy-field-error',
            className,
          )}
          {...props}
        >
          {children}
        </select>
        <ChevronDown
          className="pointer-events-none absolute end-3 top-1/2 size-4 -translate-y-1/2 text-[var(--erpfy-ink-muted)]"
          aria-hidden
        />
      </div>
    </FieldShell>
  );
}

export function ErpfyCheckbox({
  label,
  description,
  className,
  id,
  ...props
}: ComponentPropsWithoutRef<'input'> & {
  label: string;
  description?: string;
}) {
  return (
    <label htmlFor={id} className="flex cursor-pointer items-start gap-3 py-1">
      <input
        id={id}
        type="checkbox"
        className={cn(
          'mt-0.5 size-4 shrink-0 accent-[var(--erpfy-ink)]',
          className,
        )}
        {...props}
      />
      <span>
        <span className="block text-sm font-medium text-[var(--erpfy-ink)]">
          {label}
        </span>
        {description && (
          <span className="mt-0.5 block text-xs text-[var(--erpfy-ink-muted)]">
            {description}
          </span>
        )}
      </span>
    </label>
  );
}

export function ErpfyRadio({
  label,
  description,
  className,
  id,
  ...props
}: ComponentPropsWithoutRef<'input'> & {
  label: string;
  description?: string;
}) {
  return (
    <label htmlFor={id} className="flex cursor-pointer items-start gap-3 py-1">
      <input
        id={id}
        type="radio"
        className={cn(
          'mt-0.5 size-4 shrink-0 accent-[var(--erpfy-ink)]',
          className,
        )}
        {...props}
      />
      <span>
        <span className="block text-sm font-medium text-[var(--erpfy-ink)]">
          {label}
        </span>
        {description && (
          <span className="mt-0.5 block text-xs text-[var(--erpfy-ink-muted)]">
            {description}
          </span>
        )}
      </span>
    </label>
  );
}

export function ErpfySwitch({
  checked,
  onCheckedChange,
  label,
  description,
  disabled,
}: {
  checked: boolean;
  onCheckedChange: (next: boolean) => void;
  label: string;
  description?: string;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-4 py-1">
      <span>
        <span className="block text-sm font-medium text-[var(--erpfy-ink)]">
          {label}
        </span>
        {description && (
          <span className="mt-0.5 block text-xs text-[var(--erpfy-ink-muted)]">
            {description}
          </span>
        )}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        disabled={disabled}
        onClick={() => onCheckedChange(!checked)}
        className={cn(
          'relative h-6 w-11 shrink-0 rounded-full transition-colors duration-150',
          checked ? 'bg-[var(--erpfy-ink)]' : 'bg-[#d8d8d4]',
          disabled && 'cursor-not-allowed opacity-50',
        )}
      >
        <span
          className={cn(
            'absolute top-0.5 size-5 rounded-full bg-white shadow-sm transition-[left] duration-150',
            checked ? 'left-[22px]' : 'left-0.5',
          )}
        />
      </button>
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Status and labelling
 * ------------------------------------------------------------------ */

export type StatusTone =
  | 'success'
  | 'attention'
  | 'critical'
  | 'info'
  | 'neutral';

const statusClass: Record<StatusTone, string> = {
  success: 'status-success',
  attention: 'status-attention',
  critical: 'status-critical',
  info: 'status-info',
  neutral: 'status-neutral',
};

export function ErpfyStatus({
  tone = 'neutral',
  children,
  className,
}: {
  tone?: StatusTone;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span className={cn('status-pill', statusClass[tone], className)}>
      {children}
    </span>
  );
}

/**
 * Release status labels from master-plan section 99. Never present an unreleased
 * capability as operational — use one of these.
 */
export type ReleaseState =
  | 'available'
  | 'beta'
  | 'planned'
  | 'coming-soon'
  | 'limited'
  | 'private-pilot'
  | 'unavailable';

const releaseCopy: Record<ReleaseState, { label: string; tone: StatusTone }> = {
  available: { label: 'Available', tone: 'success' },
  beta: { label: 'Beta', tone: 'info' },
  planned: { label: 'Planned', tone: 'neutral' },
  'coming-soon': { label: 'Coming soon', tone: 'neutral' },
  limited: { label: 'Limited', tone: 'attention' },
  'private-pilot': { label: 'Private pilot', tone: 'attention' },
  unavailable: { label: 'Unavailable', tone: 'critical' },
};

export function ErpfyReleaseTag({
  state,
  className,
}: {
  state: ReleaseState;
  className?: string;
}) {
  const { label, tone } = releaseCopy[state];
  return (
    <ErpfyStatus tone={tone} className={className}>
      {label}
    </ErpfyStatus>
  );
}

export function ErpfyAvatar({
  name,
  size = 32,
  accent = false,
  circle = false,
  className,
}: {
  name: string;
  size?: number;
  accent?: boolean;
  circle?: boolean;
  className?: string;
}) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');

  return (
    <span
      aria-hidden
      style={{ height: size, width: size, fontSize: Math.round(size * 0.38) }}
      className={cn(
        'grid shrink-0 place-items-center font-extrabold',
        circle ? 'rounded-full' : 'rounded-lg',
        accent
          ? 'bg-[var(--erpfy-accent)] text-[var(--erpfy-accent-ink)] dark:bg-[var(--erpfy-brand)] dark:text-[var(--erpfy-brand-on)]'
          : 'bg-[var(--erpfy-status-neutral-bg)] text-[var(--erpfy-ink)] dark:bg-[var(--erpfy-hover)] dark:text-[var(--erpfy-ink-strong)] dark:border dark:border-[var(--erpfy-line)]',
        className,
      )}
    >
      {initials || '?'}
    </span>
  );
}

/* ------------------------------------------------------------------ *
 * Surfaces
 * ------------------------------------------------------------------ */

export function ErpfyPanel({
  title,
  description,
  action,
  padded = true,
  className,
  children,
}: {
  title?: string;
  description?: string;
  action?: ReactNode;
  padded?: boolean;
  className?: string;
  children?: ReactNode;
}) {
  return (
    <section className={cn('erpfy-card overflow-hidden', className)}>
      {(title || action) && (
        <div className="erpfy-card-header">
          <div className="min-w-0">
            {title && <h2 className="truncate text-base font-bold">{title}</h2>}
            {description && (
              <p className="mt-0.5 text-sm text-[var(--erpfy-ink-muted)]">
                {description}
              </p>
            )}
          </div>
          {action}
        </div>
      )}
      {children && <div className={padded ? 'p-5' : undefined}>{children}</div>}
    </section>
  );
}

export function ErpfyStatCard({
  label,
  value,
  caption,
  tone,
}: {
  label: string;
  value: string;
  caption?: string;
  tone?: StatusTone;
}) {
  return (
    <article className="erpfy-card metric-card p-5">
      <p className="text-xs font-semibold text-[var(--erpfy-ink-muted)]">
        {label}
      </p>
      <p className="mt-2 text-[26px] font-bold tracking-[-0.03em]">{value}</p>
      {caption && (
        <p className="mt-2">
          {tone ? (
            <ErpfyStatus tone={tone}>{caption}</ErpfyStatus>
          ) : (
            <span className="text-xs text-[var(--erpfy-ink-muted)]">
              {caption}
            </span>
          )}
        </p>
      )}
    </article>
  );
}

export function ErpfyRowButton({
  icon,
  label,
  meta,
  onClick,
  disabled,
}: {
  icon?: ReactNode;
  label: string;
  meta?: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="task-row disabled:opacity-50"
    >
      {icon && (
        <span className="grid size-7 shrink-0 place-items-center rounded-full bg-[var(--erpfy-leaf-soft)] text-[var(--erpfy-leaf-ink)]">
          {icon}
        </span>
      )}
      <span className="flex-1 text-left text-sm font-medium">{label}</span>
      {meta}
    </button>
  );
}

/* ------------------------------------------------------------------ *
 * Page header
 * ------------------------------------------------------------------ */

export function ErpfyPageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {eyebrow && (
          <p className="text-[12px] font-bold uppercase tracking-[0.1em] text-[var(--erpfy-ink-faint)]">
            {eyebrow}
          </p>
        )}
        <h1 className="mt-1 text-[28px] font-bold tracking-[-0.045em] md:text-[32px]">
          {title}
        </h1>
        {description && (
          <p className="mt-1 text-sm text-[var(--erpfy-ink-muted)]">
            {description}
          </p>
        )}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Universal page states — master-plan section 80
 * ------------------------------------------------------------------ */

function StateShell({
  icon,
  tint,
  ink,
  title,
  body,
  action,
}: {
  icon: ReactNode;
  tint: string;
  ink: string;
  title: string;
  body: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
      <span
        className="grid size-12 place-items-center rounded-2xl"
        style={{ background: tint, color: ink }}
        aria-hidden
      >
        {icon}
      </span>
      <h3 className="mt-5 text-base font-bold">{title}</h3>
      <p className="mt-1.5 max-w-sm text-sm leading-6 text-[var(--erpfy-ink-muted)]">
        {body}
      </p>
      {action && <div className="mt-5 flex gap-2">{action}</div>}
    </div>
  );
}

export function ErpfyEmptyState(props: {
  icon: ReactNode;
  title: string;
  body: string;
  action?: ReactNode;
}) {
  return (
    <StateShell
      {...props}
      tint="var(--erpfy-leaf)"
      ink="var(--erpfy-leaf-ink)"
    />
  );
}

export function ErpfyErrorState(props: {
  icon: ReactNode;
  title: string;
  body: string;
  action?: ReactNode;
}) {
  return (
    <StateShell
      {...props}
      tint="var(--erpfy-status-critical-bg)"
      ink="var(--erpfy-status-critical-ink)"
    />
  );
}

export function ErpfyPermissionDeniedState({
  icon,
  permission,
}: {
  icon: ReactNode;
  permission: string;
}) {
  return (
    <StateShell
      icon={icon}
      tint="var(--erpfy-status-neutral-bg)"
      ink="var(--erpfy-status-neutral-ink)"
      title="You do not have access to this"
      body={`This area needs the "${permission}" permission. Ask a company owner or administrator to grant it.`}
    />
  );
}

export function ErpfySkeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cn('erpfy-skeleton', className)} />;
}
