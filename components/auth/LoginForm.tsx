'use client';

/**
 * PUB-015a — Sign-in form, including the second-factor step.
 * Authority: ERPFY-MASTER-PLAN.md sections 50, 51, 88.
 */

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

import { ErpfyCheckbox, ErpfyInput } from '@/lib/design-system';

type Stage =
  | { name: 'credentials' }
  | { name: 'second-factor'; challengeToken: string; useRecoveryCode: boolean };

export function LoginForm() {
  const router = useRouter();
  const [stage, setStage] = useState<Stage>({ name: 'credentials' });
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [trustDevice, setTrustDevice] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const codeFieldRef = useRef<HTMLInputElement>(null);

  // Move focus to the code field when the second step appears: the person has just
  // submitted, and entering the code is the only thing left to do.
  useEffect(() => {
    if (stage.name === 'second-factor') codeFieldRef.current?.focus();
  }, [stage.name]);

  async function submitCredentials() {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const payload = (await response.json()) as {
        signedIn?: boolean;
        secondFactorRequired?: boolean;
        challengeToken?: string;
        error?: string;
      };
      if (!response.ok)
        throw new Error(payload.error ?? 'Could not sign you in.');

      if (payload.secondFactorRequired && payload.challengeToken) {
        // Clear the password from memory as soon as it is no longer needed.
        setPassword('');
        setStage({
          name: 'second-factor',
          challengeToken: payload.challengeToken,
          useRecoveryCode: false,
        });
        return;
      }
      router.push('/account');
      router.refresh();
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : 'Could not sign you in.',
      );
    } finally {
      setBusy(false);
    }
  }

  async function submitSecondFactor(
    challengeToken: string,
    useRecoveryCode: boolean,
  ) {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch('/api/auth/login/second-factor', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          challengeToken,
          code,
          useRecoveryCode,
          trustDevice,
        }),
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok)
        throw new Error(payload.error ?? 'That code was not accepted.');
      router.push('/account');
      router.refresh();
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : 'That code was not accepted.',
      );
    } finally {
      setBusy(false);
    }
  }

  if (stage.name === 'second-factor') {
    return (
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void submitSecondFactor(stage.challengeToken, stage.useRecoveryCode);
        }}
        className="erpfy-card p-6"
      >
        <h2 className="text-base font-bold">
          {stage.useRecoveryCode
            ? 'Enter a recovery code'
            : 'Enter your authenticator code'}
        </h2>
        <p className="mt-1.5 text-sm leading-6 text-[var(--erpfy-ink-muted)]">
          {stage.useRecoveryCode
            ? 'Each recovery code works once. Using one does not turn off two-factor authentication.'
            : 'Open your authenticator app and enter the 6-digit code for ERPFY.'}
        </p>

        <div className="mt-5 space-y-4">
          <ErpfyInput
            id="login-code"
            label={
              stage.useRecoveryCode ? 'Recovery code' : 'Authenticator code'
            }
            value={code}
            onChange={(event) => setCode(event.target.value)}
            inputMode={stage.useRecoveryCode ? 'text' : 'numeric'}
            ref={codeFieldRef}
            autoComplete="one-time-code"
            maxLength={stage.useRecoveryCode ? 20 : 6}
            placeholder={stage.useRecoveryCode ? 'XXXXX-XXXXX' : '123456'}
          />

          <ErpfyCheckbox
            id="login-trust"
            label="Trust this device for 30 days"
            description="Skip the code on this device only. Any trusted device can be revoked from Sessions."
            checked={trustDevice}
            onChange={(event) => setTrustDevice(event.target.checked)}
          />
        </div>

        {error && <ErrorLine message={error} />}

        <button
          type="submit"
          disabled={busy || code.length === 0}
          className="primary-button mt-5 w-full"
        >
          {busy ? 'Checking…' : 'Verify and sign in'}
        </button>

        <div className="mt-4 flex flex-wrap justify-between gap-3 text-sm">
          <button
            type="button"
            onClick={() => {
              setCode('');
              setError(null);
              setStage({ ...stage, useRecoveryCode: !stage.useRecoveryCode });
            }}
            className="font-semibold text-[var(--erpfy-ink)] underline underline-offset-2"
          >
            {stage.useRecoveryCode
              ? 'Use an authenticator code'
              : 'Use a recovery code instead'}
          </button>
          <button
            type="button"
            onClick={() => {
              setCode('');
              setError(null);
              setStage({ name: 'credentials' });
            }}
            className="text-[var(--erpfy-ink-muted)] underline underline-offset-2"
          >
            Start again
          </button>
        </div>
      </form>
    );
  }

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        void submitCredentials();
      }}
      className="erpfy-card p-6"
    >
      <div className="space-y-4">
        <ErpfyInput
          id="login-email"
          label="Email address"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="you@company.com"
          required
        />
        <ErpfyInput
          id="login-password"
          label="Password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="Your password"
          required
        />
      </div>

      {error && <ErrorLine message={error} />}

      <button
        type="submit"
        disabled={busy}
        className="primary-button mt-5 w-full"
      >
        {busy ? 'Signing in…' : 'Log in'}
      </button>
    </form>
  );
}

function ErrorLine({ message }: { message: string }) {
  return (
    <p
      role="alert"
      className="mt-4 rounded-[12px] border border-[var(--erpfy-line)] bg-[var(--erpfy-status-critical-bg)] px-4 py-3 text-sm font-semibold text-[var(--erpfy-status-critical-ink)]"
    >
      {message}
    </p>
  );
}
