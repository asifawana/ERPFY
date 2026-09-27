'use client';

import { useState, useRef, type ChangeEvent } from 'react';
import Link from 'next/link';
import {
  User,
  Lock,
  Eye,
  EyeOff,
  Upload,
  CheckCircle2,
  AlertCircle,
  Trash2,
} from 'lucide-react';
import { useEffect } from 'react';

import type { AccountProfile, CompanyContext } from '@/lib/core/page-data';
import { ErpfyInput } from '@/lib/design-system';
import { validateAndCompress } from '@/lib/utils/compress-image';

export function UserProfilePage({
  profile,
  company: _company,
}: {
  profile: AccountProfile;
  company: CompanyContext | null;
}) {
  // Parse name into first and last name
  const nameParts = (profile.displayName || 'Local Developer').split(' ');
  const [firstName, setFirstName] = useState(nameParts[0] || '');
  const [lastName, setLastName] = useState(nameParts.slice(1).join(' ') || '');
  const [username, setUsername] = useState(
    (profile.email.split('@')[0] || 'developer').toLowerCase(),
  );
  const [phone, setPhone] = useState('+92 300 1234567');
  const [email, setEmail] = useState(profile.email);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [compressingAvatar, setCompressingAvatar] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('erpfy_user_avatar');
      if (saved) {
        queueMicrotask(() => {
          setAvatarUrl(saved);
        });
      }
    } catch { /* ignore */ }
  }, []);

  // Password state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // Status feedback
  const [infoNotice, setInfoNotice] = useState<string | null>(null);
  const [infoError, setInfoError] = useState<string | null>(null);
  const [infoSaving, setInfoSaving] = useState(false);

  const [passwordNotice, setPasswordNotice] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSaving, setPasswordSaving] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleAvatarChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setCompressingAvatar(true);
    setInfoError(null);
    try {
      // Compress like WhatsApp: max 400px for avatars, WebP, quality 0.88
      const compressed = await validateAndCompress(file, 10 * 1024 * 1024, {
        maxDimension: 400,
        quality: 0.88,
        outputFormat: 'image/webp',
      });
      setAvatarUrl(compressed);
      // Persist to localStorage so header updates across the whole shell
      try {
        localStorage.setItem('erpfy_user_avatar', compressed);
        window.dispatchEvent(new CustomEvent('erpfy:avatar-updated', { detail: compressed }));
      } catch { /* ignore */ }
      setInfoNotice('Avatar updated! Click Submit to save profile.');
    } catch (err) {
      setInfoError(err instanceof Error ? err.message : 'Image could not be processed.');
    } finally {
      setCompressingAvatar(false);
    }
  }

  function handleRemoveAvatar() {
    setAvatarUrl(null);
    try {
      localStorage.removeItem('erpfy_user_avatar');
      window.dispatchEvent(new CustomEvent('erpfy:avatar-updated', { detail: null }));
    } catch { /* ignore */ }
    setInfoNotice('Avatar removed.');
  }

  async function handleInfoSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    setInfoNotice(null);
    setInfoError(null);

    const fullName = `${firstName.trim()} ${lastName.trim()}`.trim();
    if (!fullName) {
      setInfoError('First name and last name cannot be empty.');
      return;
    }

    setInfoSaving(true);
    try {
      const res = await fetch('/api/account/settings', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          displayName: fullName,
          timezone: profile.timezone || 'UTC',
          emailAccountActivity: true,
          emailSecurityAlerts: true,
          emailBillingNotices: true,
          emailProductUpdates: false,
        }),
      });

      if (!res.ok) {
        const json = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(json.error || 'Failed to save account information.');
      }

      setInfoNotice('Account information updated successfully!');
    } catch (err) {
      setInfoError(
        err instanceof Error ? err.message : 'Failed to update profile.',
      );
    } finally {
      setInfoSaving(false);
    }
  }

  async function handlePasswordSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    setPasswordNotice(null);
    setPasswordError(null);

    if (!currentPassword) {
      setPasswordError('Current password is required.');
      return;
    }
    if (!newPassword || newPassword.length < 8) {
      setPasswordError('New password must be at least 8 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('New passwords do not match.');
      return;
    }

    setPasswordSaving(true);
    try {
      const res = await fetch('/api/account/password', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        throw new Error(data.error || 'Failed to update password.');
      }
      setPasswordNotice('Password updated successfully!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setPasswordError(err instanceof Error ? err.message : 'Failed to update password.');
    } finally {
      setPasswordSaving(false);
    }
  }

  const initials =
    (firstName[0] || '') + (lastName[0] || profile.displayName[0] || 'U');

  return (
    <div className="space-y-6">
      {/* Breadcrumb & Header */}
      <div>
        <nav className="flex items-center gap-2 text-xs text-[var(--erpfy-ink-muted)] mb-1">
          <Link href="/account" className="hover:text-[var(--erpfy-ink)]">
            Settings
          </Link>
          <span>/</span>
          <span className="font-semibold text-[var(--erpfy-ink)]">Profile</span>
        </nav>
        <h1 className="text-2xl font-bold tracking-tight text-[var(--erpfy-ink)]">
          Profile
        </h1>
      </div>

      <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
        {/* Left Card: Avatar & Summary */}
        <div className="flex flex-col items-center rounded-2xl border border-[var(--erpfy-line)] bg-[var(--erpfy-surface)] p-6 text-center shadow-xs">
          <div className="relative mb-4">
            {avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={avatarUrl}
                alt={profile.displayName || 'User Avatar'}
                className="size-32 rounded-full object-cover border-4 border-white shadow-md ring-2 ring-[var(--erpfy-brand)]"
              />
            ) : (
              <div className="flex size-32 items-center justify-center rounded-full bg-[var(--erpfy-brand)] text-4xl font-bold text-[var(--erpfy-brand-on)] shadow-md">
                {initials.toUpperCase()}
              </div>
            )}
          </div>

          <h2 className="text-base font-bold text-[var(--erpfy-ink)]">
            {firstName} {lastName}
          </h2>
          <p className="text-xs text-[var(--erpfy-ink-muted)] mt-0.5">{email}</p>

          <input
            type="file"
            ref={fileInputRef}
            onChange={(e) => void handleAvatarChange(e)}
            accept="image/*"
            className="hidden"
            disabled={compressingAvatar}
          />

          <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={compressingAvatar}
              className="flex items-center gap-2 rounded-xl border border-[var(--erpfy-line)] bg-white px-3 py-2 text-xs font-semibold text-[var(--erpfy-ink)] shadow-xs transition hover:bg-[var(--erpfy-hover)] active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Upload className="size-3.5" aria-hidden />
              <span>{compressingAvatar ? 'Compressing…' : avatarUrl ? 'Change photo' : 'Choose a file'}</span>
            </button>
            {avatarUrl && (
              <button
                type="button"
                onClick={handleRemoveAvatar}
                disabled={compressingAvatar}
                className="flex items-center gap-1.5 rounded-xl border border-[var(--erpfy-line)] bg-white px-3 py-2 text-xs font-semibold text-red-600 shadow-xs transition hover:bg-red-50 active:scale-95 disabled:opacity-50"
                title="Remove photo"
              >
                <Trash2 className="size-3.5" aria-hidden />
                <span>Remove</span>
              </button>
            )}
          </div>
        </div>

        {/* Right Side: Account Information & Change Password */}
        <div className="space-y-6">
          {/* Card 1: Account Information */}
          <div className="rounded-2xl border border-[var(--erpfy-line)] bg-[var(--erpfy-surface)] p-6 shadow-xs">
            <div className="mb-5 flex items-center gap-2 border-b border-[var(--erpfy-line-soft)] pb-3">
              <User className="size-4 text-[var(--erpfy-ink-muted)]" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--erpfy-ink-muted)]">
                Account Information
              </h3>
            </div>

            {infoNotice && (
              <div className="mb-4 flex items-center gap-2 rounded-xl border border-[var(--erpfy-ok-ink)] bg-[var(--erpfy-ok-bg)] px-3.5 py-2.5 text-xs font-medium text-[var(--erpfy-ok-ink)]">
                <CheckCircle2 className="size-4 shrink-0" />
                <span>{infoNotice}</span>
              </div>
            )}

            {infoError && (
              <div className="mb-4 flex items-center gap-2 rounded-xl border border-[var(--erpfy-bad-ink)] bg-[var(--erpfy-bad-bg)] px-3.5 py-2.5 text-xs font-medium text-[var(--erpfy-bad-ink)]">
                <AlertCircle className="size-4 shrink-0" />
                <span>{infoError}</span>
              </div>
            )}

            <form onSubmit={handleInfoSubmit} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="profile-first-name"
                    className="mb-1.5 block text-xs font-semibold text-[var(--erpfy-ink)]"
                  >
                    First name <span className="text-red-500">*</span>
                  </label>
                  <ErpfyInput
                    id="profile-first-name"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    required
                  />
                </div>

                <div>
                  <label
                    htmlFor="profile-last-name"
                    className="mb-1.5 block text-xs font-semibold text-[var(--erpfy-ink)]"
                  >
                    Last name <span className="text-red-500">*</span>
                  </label>
                  <ErpfyInput
                    id="profile-last-name"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="profile-username"
                    className="mb-1.5 block text-xs font-semibold text-[var(--erpfy-ink)]"
                  >
                    Username <span className="text-red-500">*</span>
                  </label>
                  <ErpfyInput
                    id="profile-username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                  />
                </div>

                <div>
                  <label
                    htmlFor="profile-phone"
                    className="mb-1.5 block text-xs font-semibold text-[var(--erpfy-ink)]"
                  >
                    Phone <span className="text-red-500">*</span>
                  </label>
                  <ErpfyInput
                    id="profile-phone"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="profile-email"
                  className="mb-1.5 block text-xs font-semibold text-[var(--erpfy-ink)]"
                >
                  Email <span className="text-red-500">*</span>
                </label>
                <ErpfyInput
                  id="profile-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={infoSaving}
                  className="rounded-xl bg-[var(--erpfy-brand)] px-5 py-2.5 text-xs font-semibold text-white shadow-sm transition hover:opacity-90 active:scale-95 disabled:opacity-50"
                >
                  {infoSaving ? 'Saving...' : 'Submit'}
                </button>
              </div>
            </form>
          </div>

          {/* Card 2: Change Password */}
          <div className="rounded-2xl border border-[var(--erpfy-line)] bg-[var(--erpfy-surface)] p-6 shadow-xs">
            <div className="mb-5 flex items-center gap-2 border-b border-[var(--erpfy-line-soft)] pb-3">
              <Lock className="size-4 text-[var(--erpfy-ink-muted)]" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--erpfy-ink-muted)]">
                Change Password
              </h3>
            </div>

            {passwordNotice && (
              <div className="mb-4 flex items-center gap-2 rounded-xl border border-[var(--erpfy-ok-ink)] bg-[var(--erpfy-ok-bg)] px-3.5 py-2.5 text-xs font-medium text-[var(--erpfy-ok-ink)]">
                <CheckCircle2 className="size-4 shrink-0" />
                <span>{passwordNotice}</span>
              </div>
            )}

            {passwordError && (
              <div className="mb-4 flex items-center gap-2 rounded-xl border border-[var(--erpfy-bad-ink)] bg-[var(--erpfy-bad-bg)] px-3.5 py-2.5 text-xs font-medium text-[var(--erpfy-bad-ink)]">
                <AlertCircle className="size-4 shrink-0" />
                <span>{passwordError}</span>
              </div>
            )}

            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <label
                    htmlFor="current-password"
                    className="mb-1.5 block text-xs font-semibold text-[var(--erpfy-ink)]"
                  >
                    Current Password <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <ErpfyInput
                      id="current-password"
                      type={showCurrent ? 'text' : 'password'}
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="Enter password"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrent(!showCurrent)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--erpfy-ink-muted)] hover:text-[var(--erpfy-ink)]"
                    >
                      {showCurrent ? (
                        <EyeOff className="size-4" />
                      ) : (
                        <Eye className="size-4" />
                      )}
                    </button>
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="new-password"
                    className="mb-1.5 block text-xs font-semibold text-[var(--erpfy-ink)]"
                  >
                    New Password <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <ErpfyInput
                      id="new-password"
                      type={showNew ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Enter password"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowNew(!showNew)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--erpfy-ink-muted)] hover:text-[var(--erpfy-ink)]"
                    >
                      {showNew ? (
                        <EyeOff className="size-4" />
                      ) : (
                        <Eye className="size-4" />
                      )}
                    </button>
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="confirm-password"
                    className="mb-1.5 block text-xs font-semibold text-[var(--erpfy-ink)]"
                  >
                    Confirm Password <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <ErpfyInput
                      id="confirm-password"
                      type={showConfirm ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Enter password"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirm(!showConfirm)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--erpfy-ink-muted)] hover:text-[var(--erpfy-ink)]"
                    >
                      {showConfirm ? (
                        <EyeOff className="size-4" />
                      ) : (
                        <Eye className="size-4" />
                      )}
                    </button>
                  </div>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={passwordSaving}
                  className="rounded-xl bg-[var(--erpfy-brand)] px-5 py-2.5 text-xs font-semibold text-white shadow-sm transition hover:opacity-90 active:scale-95 disabled:opacity-50"
                >
                  {passwordSaving ? 'Updating...' : 'Update Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
