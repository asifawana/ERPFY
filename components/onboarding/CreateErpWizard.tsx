'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Check,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Building2,
  Globe2,
  Sparkles,
  ArrowRight,
  ArrowLeft,
} from 'lucide-react';

import { OnboardingCard, OnboardingProgress } from './OnboardingFrame';
import { SECTORS } from '@/lib/content/industries';
import { COUNTRIES } from '@/lib/content/regions';

type WizardData = {
  name: string;
  slug: string;
  countryCode: string;
  currency: string;
  timezone: string;
  language: string;
  sectorSlug: string;
  industrySlug: string;
  subIndustrySlug: string;
  businessType: string;
  businessModels: string[];
  employeeBand: string;
  expectedUsers: number;
  branchCount: number;
  requestKey: string;
};

const BUSINESS_MODELS = [
  'B2B (Business to Business)',
  'B2C (Business to Consumer)',
  'D2C (Direct to Consumer)',
  'Wholesale & Distribution',
  'Retail Store / POS',
  'Manufacturing & Assembly',
  'Services & Consulting',
  'Contract & Projects',
];

const EMPLOYEE_BANDS = [
  '1–5 employees',
  '6–20 employees',
  '21–50 employees',
  '51–200 employees',
  '201–500 employees',
  '500+ employees',
];

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 35);
}

export function CreateErpWizard({
  userEmail,
  userDisplayName,
}: {
  userEmail: string;
  userDisplayName: string;
}) {
  const router = useRouter();
  const [step, setStep] = useState<number>(1);
  const totalSteps = 5;

  // Form State
  const [formData, setFormData] = useState<WizardData>({
    name: '',
    slug: '',
    countryCode: 'US',
    currency: 'USD',
    timezone: 'America/New_York',
    language: 'en',
    sectorSlug: SECTORS[0]?.slug || '',
    industrySlug: SECTORS[0]?.industries[0]?.slug || '',
    subIndustrySlug: '',
    businessType: '',
    businessModels: ['B2B (Business to Business)'],
    employeeBand: '1–5 employees',
    expectedUsers: 3,
    branchCount: 1,
    requestKey: crypto.randomUUID(),
  });

  // Slug verification state
  const [slugStatus, setSlugStatus] = useState<
    'idle' | 'checking' | 'available' | 'taken' | 'invalid'
  >('idle');
  const [slugMessage, setSlugMessage] = useState<string>('');
  const [userManuallyEditedSlug, setUserManuallyEditedSlug] = useState(false);
  const slugCheckDebounceRef = useRef<NodeJS.Timeout | null>(null);

  // Auto-slugify when company name changes if user hasn't edited slug manually
  const handleNameChange = (newName: string) => {
    setFormData((prev) => {
      const next = { ...prev, name: newName };
      if (!userManuallyEditedSlug) {
        next.slug = slugify(newName);
      }
      return next;
    });
  };

  // Check slug availability against backend API
  useEffect(() => {
    if (!formData.slug || formData.slug.length < 3) {
      const timer = setTimeout(() => {
        setSlugStatus('invalid');
        setSlugMessage(
          formData.slug.length === 0 ? '' : 'Handle must be at least 3 characters',
        );
      }, 0);
      return () => clearTimeout(timer);
    }

    const checkTimer = setTimeout(() => {
      setSlugStatus('checking');
      setSlugMessage('Checking availability...');
    }, 0);

    if (slugCheckDebounceRef.current) {
      clearTimeout(slugCheckDebounceRef.current);
    }

    slugCheckDebounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/companies/check-slug?slug=${encodeURIComponent(formData.slug)}`,
        );
        const data = (await res.json()) as { available?: boolean; reason?: string };
        if (data.available) {
          setSlugStatus('available');
          setSlugMessage('Available');
        } else {
          setSlugStatus('taken');
          setSlugMessage(data.reason || 'Handle is already taken');
        }
      } catch {
        setSlugStatus('idle');
        setSlugMessage('');
      }
    }, 350);

    return () => {
      clearTimeout(checkTimer);
      if (slugCheckDebounceRef.current) {
        clearTimeout(slugCheckDebounceRef.current);
      }
    };
  }, [formData.slug]);

  // When country changes, update currency and timezone defaults
  const handleCountryChange = (code: string) => {
    const country = COUNTRIES.find((c) => c.code === code);
    if (!country) return;

    setFormData((prev) => ({
      ...prev,
      countryCode: country.code,
      currency: country.currency || prev.currency,
      timezone: country.timezone || prev.timezone,
    }));
  };

  // Sector and Industry helpers
  const selectedSector =
    SECTORS.find((s) => s.slug === formData.sectorSlug) || SECTORS[0];
  const availableIndustries = selectedSector ? selectedSector.industries : [];

  const handleSectorChange = (sectorSlug: string) => {
    const s = SECTORS.find((item) => item.slug === sectorSlug);
    const firstInd = s?.industries[0]?.slug || '';
    setFormData((prev) => ({
      ...prev,
      sectorSlug,
      industrySlug: firstInd,
      subIndustrySlug: '',
      businessType: '',
    }));
  };

  // Multi-model selection toggle
  const toggleBusinessModel = (model: string) => {
    setFormData((prev) => {
      const exists = prev.businessModels.includes(model);
      const next = exists
        ? prev.businessModels.filter((m) => m !== model)
        : [...prev.businessModels, model];
      return { ...prev, businessModels: next.length > 0 ? next : [model] };
    });
  };

  // Submission & Provisioning State
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [provisionProgressText, setProvisionProgressText] =
    useState('Preparing your workspace...');

  const handleFinalSubmit = async () => {
    setSubmitting(true);
    setSubmitError(null);
    setProvisionProgressText('Validating company handle & credentials...');

    try {
      const timer1 = setTimeout(() => {
        setProvisionProgressText('Allocating isolated database partition...');
      }, 700);

      const timer2 = setTimeout(() => {
        setProvisionProgressText('Setting up Owner administrative privileges...');
      }, 1400);

      const res = await fetch('/api/companies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      clearTimeout(timer1);
      clearTimeout(timer2);

      const json = (await res.json()) as { error?: string; company?: { slug?: string } };
      if (!res.ok) {
        throw new Error(json.error || 'Failed to create company workspace.');
      }

      setProvisionProgressText('Provisioning complete! Launching ERP dashboard...');
      const targetUrl = `/c/${json.company?.slug || formData.slug}`;

      setTimeout(() => {
        router.push(targetUrl);
        router.refresh();
      }, 600);
    } catch (err: unknown) {
      setSubmitError(err instanceof Error ? err.message : 'An unexpected error occurred.');
      setSubmitting(false);
    }
  };

  // Render Steps
  return (
    <div>
      <OnboardingProgress
        position={step}
        total={totalSteps}
        label="Workspace Onboarding"
      />

      {submitError && (
        <div className="mb-4 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700">
          <AlertCircle className="size-5 shrink-0" />
          <span>{submitError}</span>
        </div>
      )}

      {/* STEP 1: Name & Handle */}
      {step === 1 && (
        <OnboardingCard
          question="What is your company or business name?"
          help="This is the primary name your team, customers, and partners will see across ERPFY."
          footer={
            <div className="flex w-full items-center justify-between">
              <Link
                href="/account"
                className="text-sm font-medium text-[var(--erpfy-ink-muted)] hover:underline"
              >
                Cancel & return
              </Link>
              <button
                type="button"
                disabled={
                  !formData.name.trim() ||
                  slugStatus === 'taken' ||
                  slugStatus === 'checking' ||
                  slugStatus === 'invalid'
                }
                onClick={() => setStep(2)}
                className="primary-button inline-flex items-center gap-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Continue
                <ArrowRight className="size-4" />
              </button>
            </div>
          }
        >
          <div className="space-y-5">
            <div>
              <label htmlFor="wizard-company-name" className="block text-xs font-semibold uppercase tracking-wider text-[var(--erpfy-ink-muted)]">
                Company Display Name
              </label>
              <div className="mt-1.5 flex items-center rounded-xl border border-[var(--erpfy-line)] bg-white px-3.5 py-2.5 focus-within:border-[var(--erpfy-brand,#1e5631)] focus-within:ring-2 focus-within:ring-[var(--erpfy-brand,#1e5631)]/15">
                <Building2 className="mr-2.5 size-5 text-[var(--erpfy-ink-muted)]" />
                <input
                  id="wizard-company-name"
                  type="text"
                  required
                  placeholder="e.g. Apex Global Logistics, Prime Mills"
                  value={formData.name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  className="w-full bg-transparent text-base font-medium text-[var(--erpfy-ink)] outline-none placeholder:text-[var(--erpfy-ink-faint)]"
                />
              </div>
            </div>

            <div>
              <label htmlFor="wizard-company-slug" className="block text-xs font-semibold uppercase tracking-wider text-[var(--erpfy-ink-muted)]">
                ERPFY Workspace Handle & URL
              </label>
              <div className="mt-1.5 flex items-center rounded-xl border border-[var(--erpfy-line)] bg-white px-3.5 py-2.5 focus-within:border-[var(--erpfy-brand,#1e5631)] focus-within:ring-2 focus-within:ring-[var(--erpfy-brand,#1e5631)]/15">
                <span className="text-sm font-medium text-[var(--erpfy-ink-muted)]">
                  erpfy.com/c/
                </span>
                <input
                  id="wizard-company-slug"
                  type="text"
                  required
                  value={formData.slug}
                  onChange={(e) => {
                    setUserManuallyEditedSlug(true);
                    setFormData((prev) => ({
                      ...prev,
                      slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''),
                    }));
                  }}
                  className="w-full bg-transparent text-sm font-semibold text-[var(--erpfy-ink)] outline-none"
                  placeholder="your-workspace"
                />
                {slugStatus === 'checking' && (
                  <Loader2 className="size-4 animate-spin text-[var(--erpfy-ink-muted)]" />
                )}
                {slugStatus === 'available' && (
                  <CheckCircle2 className="size-4 text-emerald-600" />
                )}
                {(slugStatus === 'taken' || slugStatus === 'invalid') &&
                  formData.slug.length > 0 && (
                    <AlertCircle className="size-4 text-rose-600" />
                  )}
              </div>
              <div className="mt-1 flex items-center justify-between text-xs">
                <span
                  className={
                    slugStatus === 'available'
                      ? 'text-emerald-700 font-medium'
                      : slugStatus === 'taken' || slugStatus === 'invalid'
                      ? 'text-rose-600 font-medium'
                      : 'text-[var(--erpfy-ink-muted)]'
                  }
                >
                  {slugMessage ||
                    'Lowercase alphanumeric characters and hyphens only.'}
                </span>
              </div>
            </div>
          </div>
        </OnboardingCard>
      )}

      {/* STEP 2: Region, Currency & Timezone */}
      {step === 2 && (
        <OnboardingCard
          question="Where is your company located?"
          help="We will configure fiscal defaults, currency symbols, and local time conventions for your reports and documents."
          footer={
            <div className="flex w-full items-center justify-between">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="soft-button inline-flex items-center gap-1.5 text-sm"
              >
                <ArrowLeft className="size-4" />
                Back
              </button>
              <button
                type="button"
                onClick={() => setStep(3)}
                className="primary-button inline-flex items-center gap-2"
              >
                Continue
                <ArrowRight className="size-4" />
              </button>
            </div>
          }
        >
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label htmlFor="wizard-country-code" className="block text-xs font-semibold uppercase tracking-wider text-[var(--erpfy-ink-muted)]">
                Operating Country
              </label>
              <div className="mt-1.5 flex items-center rounded-xl border border-[var(--erpfy-line)] bg-white px-3 py-2.5">
                <Globe2 className="mr-2.5 size-5 text-[var(--erpfy-ink-muted)]" />
                <select
                  id="wizard-country-code"
                  value={formData.countryCode}
                  onChange={(e) => handleCountryChange(e.target.value)}
                  className="w-full bg-transparent text-sm font-medium text-[var(--erpfy-ink)] outline-none"
                >
                  {COUNTRIES.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.name} ({c.code})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label htmlFor="wizard-currency" className="block text-xs font-semibold uppercase tracking-wider text-[var(--erpfy-ink-muted)]">
                Base Currency
              </label>
              <input
                id="wizard-currency"
                type="text"
                value={formData.currency}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    currency: e.target.value.toUpperCase().slice(0, 4),
                  }))
                }
                className="mt-1.5 w-full rounded-xl border border-[var(--erpfy-line)] bg-white px-3.5 py-2.5 text-sm font-semibold text-[var(--erpfy-ink)] outline-none focus:border-[var(--erpfy-brand,#1e5631)]"
                placeholder="USD, PKR, EUR, GBP"
              />
            </div>

            <div>
              <label htmlFor="wizard-language" className="block text-xs font-semibold uppercase tracking-wider text-[var(--erpfy-ink-muted)]">
                System Language
              </label>
              <select
                id="wizard-language"
                value={formData.language}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, language: e.target.value }))
                }
                className="mt-1.5 w-full rounded-xl border border-[var(--erpfy-line)] bg-white px-3 py-2.5 text-sm font-medium text-[var(--erpfy-ink)] outline-none focus:border-[var(--erpfy-brand,#1e5631)]"
              >
                <option value="en">English (International)</option>
                <option value="ur">Urdu (اردو)</option>
                <option value="ar">Arabic (العربية)</option>
                <option value="es">Spanish (Español)</option>
                <option value="fr">French (Français)</option>
                <option value="de">German (Deutsch)</option>
              </select>
            </div>

            <div className="sm:col-span-2">
              <label htmlFor="wizard-timezone" className="block text-xs font-semibold uppercase tracking-wider text-[var(--erpfy-ink-muted)]">
                Local Timezone
              </label>
              <input
                id="wizard-timezone"
                type="text"
                value={formData.timezone}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, timezone: e.target.value }))
                }
                className="mt-1.5 w-full rounded-xl border border-[var(--erpfy-line)] bg-white px-3.5 py-2.5 text-sm font-medium text-[var(--erpfy-ink)] outline-none focus:border-[var(--erpfy-brand,#1e5631)]"
                placeholder="e.g. Asia/Karachi, America/New_York, Europe/London"
              />
            </div>
          </div>
        </OnboardingCard>
      )}

      {/* STEP 3: Industry & Sector */}
      {step === 3 && (
        <OnboardingCard
          question="Which industry best describes your business?"
          help="Selecting an industry fine-tunes your recommended apps, invoice templates, and product fields. You can change this anytime."
          footer={
            <div className="flex w-full items-center justify-between">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="soft-button inline-flex items-center gap-1.5 text-sm"
              >
                <ArrowLeft className="size-4" />
                Back
              </button>
              <button
                type="button"
                onClick={() => setStep(4)}
                className="primary-button inline-flex items-center gap-2"
              >
                Continue
                <ArrowRight className="size-4" />
              </button>
            </div>
          }
        >
          <div className="space-y-4">
            <div>
              <label htmlFor="wizard-sector" className="block text-xs font-semibold uppercase tracking-wider text-[var(--erpfy-ink-muted)]">
                Economic Sector
              </label>
              <select
                id="wizard-sector"
                value={formData.sectorSlug}
                onChange={(e) => handleSectorChange(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-[var(--erpfy-line)] bg-white px-3.5 py-2.5 text-sm font-semibold text-[var(--erpfy-ink)] outline-none focus:border-[var(--erpfy-brand,#1e5631)]"
              >
                {SECTORS.map((s) => (
                  <option key={s.slug} value={s.slug}>
                    {s.name}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-[var(--erpfy-ink-muted)]">
                {selectedSector?.summary}
              </p>
            </div>

            <div>
              <label htmlFor="wizard-industry" className="block text-xs font-semibold uppercase tracking-wider text-[var(--erpfy-ink-muted)]">
                Specific Industry
              </label>
              <select
                id="wizard-industry"
                value={formData.industrySlug}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    industrySlug: e.target.value,
                  }))
                }
                className="mt-1.5 w-full rounded-xl border border-[var(--erpfy-line)] bg-white px-3.5 py-2.5 text-sm font-semibold text-[var(--erpfy-ink)] outline-none focus:border-[var(--erpfy-brand,#1e5631)]"
              >
                {availableIndustries.map((ind) => (
                  <option key={ind.slug} value={ind.slug}>
                    {ind.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </OnboardingCard>
      )}

      {/* STEP 4: Business Model & Scale */}
      {step === 4 && (
        <OnboardingCard
          question="How do you operate and how large is your team?"
          help="Tell us about your business models and approximate size so ERPFY can pre-configure workflow suggestions."
          footer={
            <div className="flex w-full items-center justify-between">
              <button
                type="button"
                onClick={() => setStep(3)}
                className="soft-button inline-flex items-center gap-1.5 text-sm"
              >
                <ArrowLeft className="size-4" />
                Back
              </button>
              <button
                type="button"
                onClick={() => setStep(5)}
                className="primary-button inline-flex items-center gap-2"
              >
                Continue to Review
                <ArrowRight className="size-4" />
              </button>
            </div>
          }
        >
          <div className="space-y-5">
            <div>
              <p className="block text-xs font-semibold uppercase tracking-wider text-[var(--erpfy-ink-muted)]">
                Business Models (Select all that apply)
              </p>
              <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                {BUSINESS_MODELS.map((model) => {
                  const selected = formData.businessModels.includes(model);
                  return (
                    <button
                      key={model}
                      type="button"
                      onClick={() => toggleBusinessModel(model)}
                      className={`flex items-center gap-2.5 rounded-xl border p-2.5 text-left text-xs font-medium transition-all ${
                        selected
                          ? 'border-[var(--erpfy-brand,#1e5631)] bg-[var(--erpfy-brand-soft,#e9f1ec)] text-[var(--erpfy-brand,#1e5631)]'
                          : 'border-[var(--erpfy-line)] bg-white text-[var(--erpfy-ink)] hover:bg-[var(--erpfy-hover)]'
                      }`}
                    >
                      <span
                        className={`grid size-4 shrink-0 place-items-center rounded border ${
                          selected
                            ? 'border-[var(--erpfy-brand,#1e5631)] bg-[var(--erpfy-brand,#1e5631)] text-white'
                            : 'border-gray-300 bg-white'
                        }`}
                      >
                        {selected && <Check className="size-3 stroke-[3]" />}
                      </span>
                      <span className="truncate">{model}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="wizard-employee-band" className="block text-xs font-semibold uppercase tracking-wider text-[var(--erpfy-ink-muted)]">
                  Company Size
                </label>
                <select
                  id="wizard-employee-band"
                  value={formData.employeeBand}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      employeeBand: e.target.value,
                    }))
                  }
                  className="mt-1.5 w-full rounded-xl border border-[var(--erpfy-line)] bg-white px-3 py-2.5 text-sm font-medium text-[var(--erpfy-ink)] outline-none"
                >
                  {EMPLOYEE_BANDS.map((band) => (
                    <option key={band} value={band}>
                      {band}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="wizard-branch-count" className="block text-xs font-semibold uppercase tracking-wider text-[var(--erpfy-ink-muted)]">
                  Initial Branches / Locations
                </label>
                <select
                  id="wizard-branch-count"
                  value={formData.branchCount}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      branchCount: Number(e.target.value),
                    }))
                  }
                  className="mt-1.5 w-full rounded-xl border border-[var(--erpfy-line)] bg-white px-3 py-2.5 text-sm font-medium text-[var(--erpfy-ink)] outline-none"
                >
                  <option value={1}>1 Main Location (Single Branch)</option>
                  <option value={2}>2–5 Branches</option>
                  <option value={10}>6–20 Branches</option>
                  <option value={50}>21+ Multi-branch Network</option>
                </select>
              </div>
            </div>
          </div>
        </OnboardingCard>
      )}

      {/* STEP 5: Final Review & Provisioning */}
      {step === 5 && (
        <OnboardingCard
          question="Ready to launch your ERP workspace?"
          help="Your 14-day free trial gives you full administrative access to ERPFY Core and all App Store extensions. No credit card required."
          footer={
            <div className="flex w-full items-center justify-between">
              <button
                type="button"
                disabled={submitting}
                onClick={() => setStep(4)}
                className="soft-button inline-flex items-center gap-1.5 text-sm disabled:opacity-50"
              >
                <ArrowLeft className="size-4" />
                Back
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={handleFinalSubmit}
                className="primary-button inline-flex items-center gap-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-75"
              >
                {submitting ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Provisioning...
                  </>
                ) : (
                  <>
                    <Sparkles className="size-4" />
                    Create My ERP
                  </>
                )}
              </button>
            </div>
          }
        >
          {submitting ? (
            <div className="py-8 text-center">
              <div className="relative mx-auto mb-4 flex size-14 items-center justify-center rounded-2xl bg-[var(--erpfy-brand-soft,#e9f1ec)] text-[var(--erpfy-brand,#1e5631)]">
                <Loader2 className="size-8 animate-spin" />
              </div>
              <h3 className="text-base font-bold text-[var(--erpfy-ink)]">
                Setting Up Your Workspace
              </h3>
              <p className="mt-1.5 text-sm font-medium text-[var(--erpfy-brand,#1e5631)]">
                {provisionProgressText}
              </p>
              <p className="mt-4 text-xs text-[var(--erpfy-ink-muted)]">
                Please do not close or refresh this window while we configure your
                isolated tenant instance.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="rounded-xl border border-[var(--erpfy-line)] bg-[#fbfbfb] p-4">
                <div className="flex items-center justify-between border-b border-[var(--erpfy-line-soft)] pb-3">
                  <div>
                    <h4 className="text-base font-bold text-[var(--erpfy-ink)]">
                      {formData.name}
                    </h4>
                    <p className="text-xs text-[var(--erpfy-ink-muted)]">
                      erpfy.com/c/
                      <span className="font-semibold text-[var(--erpfy-ink)]">
                        {formData.slug}
                      </span>
                    </p>
                  </div>
                  <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-800">
                    14-Day Free Trial
                  </span>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-[var(--erpfy-ink-muted)]">Region & Currency:</span>
                    <p className="font-semibold text-[var(--erpfy-ink)]">
                      {COUNTRIES.find((c) => c.code === formData.countryCode)?.name} (
                      {formData.currency})
                    </p>
                  </div>
                  <div>
                    <span className="text-[var(--erpfy-ink-muted)]">Industry:</span>
                    <p className="font-semibold text-[var(--erpfy-ink)]">
                      {availableIndustries.find(
                        (i) => i.slug === formData.industrySlug,
                      )?.name || formData.industrySlug}
                    </p>
                  </div>
                  <div>
                    <span className="text-[var(--erpfy-ink-muted)]">Team Size:</span>
                    <p className="font-semibold text-[var(--erpfy-ink)]">
                      {formData.employeeBand}
                    </p>
                  </div>
                  <div>
                    <span className="text-[var(--erpfy-ink-muted)]">Owner Account:</span>
                    <p className="truncate font-semibold text-[var(--erpfy-ink)]">
                      {userDisplayName || userEmail}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50/70 p-3.5 text-xs text-emerald-900">
                <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-600" />
                <p>
                  <strong>No financial commitment.</strong> Full Core features, Apps, and
                  multibranch support remain completely unlocked during your 14-day trial.
                </p>
              </div>
            </div>
          )}
        </OnboardingCard>
      )}
    </div>
  );
}
