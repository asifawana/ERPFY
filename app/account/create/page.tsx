import type { Metadata } from 'next';
import Link from 'next/link';
import { LogIn, ArrowLeft } from 'lucide-react';

import { loadAccount } from '@/lib/core/page-data';
import { OnboardingFrame } from '@/components/onboarding/OnboardingFrame';
import { CreateErpWizard } from '@/components/onboarding/CreateErpWizard';

export const metadata: Metadata = {
  title: 'Create ERP Workspace · ERPFY',
  description: 'Set up your company ERP workspace in under two minutes.',
};

export default async function CreateErpPage() {
  const data = await loadAccount();

  if (data.status === 'signed-out') {
    return (
      <div className="grid min-h-screen place-items-center bg-[#F3F4F6] px-4 py-16">
        <div className="w-full max-w-md rounded-xl border border-[#E5E7EB] bg-white p-8 text-center shadow-xs">
          <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-[#F3F4F6] text-[#4B5563]">
            <LogIn className="size-5" aria-hidden />
          </span>
          <h1 className="mt-5 text-lg font-bold tracking-tight text-[#111827]">
            Sign in to create an ERP
          </h1>
          <p className="mt-2 text-sm leading-7 text-[#4B5563]">
            You need to be signed in to your personal ERPFY account to set up a new company workspace.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            <Link
              href="/login?returnTo=/account/create"
              className="primary-button"
            >
              Sign In
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (data.status === 'unavailable') {
    return (
      <div className="grid min-h-screen place-items-center bg-[#F3F4F6] px-4 py-16">
        <div className="w-full max-w-md rounded-xl border border-[#E5E7EB] bg-white p-8 text-center shadow-xs">
          <h1 className="text-lg font-bold tracking-tight text-[#111827]">
            Account storage is unavailable
          </h1>
          <p className="mt-2 text-sm leading-7 text-[#4B5563]">{data.message}</p>
        </div>
      </div>
    );
  }

  return (
    <OnboardingFrame
      topRight={
        <Link
          href="/account"
          className="soft-button inline-flex items-center gap-1.5 text-xs font-medium"
        >
          <ArrowLeft className="size-3.5" />
          Exit to My ERPs
        </Link>
      }
    >
      <CreateErpWizard
        userEmail={data.profile.email}
        userDisplayName={data.profile.displayName}
      />
    </OnboardingFrame>
  );
}
