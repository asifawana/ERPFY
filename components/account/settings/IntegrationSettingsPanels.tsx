'use client';

import { useState } from 'react';
import {
  AlertCircle,
  Archive,
  BadgeCheck,
  Banknote,
  CheckCircle2,
  CircleDollarSign,
  CreditCard,
  Globe,
  Inbox,
  Info,
  Landmark,
  Laptop,
  Pencil,
  Plus,
  Send,
  ShieldCheck,
  Smartphone,
  Trash2,
  X,
  Zap,
} from 'lucide-react';

import type {
  AccountSystemSettings,
  CustomFieldItem,
  CustomFieldModule,
  CustomFieldType,
} from '@/lib/account-system-settings';
import {
  ErpfyButton,
  ErpfyCheckbox,
  ErpfyInput,
  ErpfyPanel,
  ErpfySelect,
  ErpfyStatus,
  ErpfyTextarea,
} from '@/lib/design-system';

const CUSTOM_FIELD_MODULES: Array<{ id: CustomFieldModule; label: string }> = [
  { id: 'customers', label: 'Customers' },
  { id: 'suppliers', label: 'Suppliers' },
  { id: 'products', label: 'Products' },
  { id: 'orders', label: 'Orders' },
];

type GatewayId =
  | 'stripe'
  | 'paypal'
  | 'paystack'
  | 'flutterwave'
  | 'razorpay'
  | 'bkash'
  | 'sslcommerz'
  | 'easypaisa'
  | 'jazzcash'
  | 'our-banks'
  | 'offline';

export function IntegrationSettingsPanels({
  section,
  settings,
  onChange,
}: {
  section: string;
  settings: AccountSystemSettings;
  onChange: (settings: AccountSystemSettings) => void;
}) {
  const [testEmailStatus, setTestEmailStatus] = useState<string | null>(null);
  const [backupMessage, setBackupMessage] = useState<string | null>(null);

  // Custom Fields state matching Stocky
  const [activeCustomModule, setActiveCustomModule] =
    useState<CustomFieldModule>('customers');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingFieldId, setEditingFieldId] = useState<string | null>(null);
  const [formFieldName, setFormFieldName] = useState('');
  const [formFieldType, setFormFieldType] = useState<CustomFieldType>('text');
  const [formOptions, setFormOptions] = useState('');
  const [formSortOrder, setFormSortOrder] = useState(0);
  const [formDefaultValue, setFormDefaultValue] = useState('');
  const [formRequired, setFormRequired] = useState(false);

  // Payment Gateway state matching Stocky
  const [selectedGateway, setSelectedGateway] = useState<GatewayId>('stripe');
  const [gatewaySavedMsg, setGatewaySavedMsg] = useState<string | null>(null);

  const update = <K extends keyof AccountSystemSettings>(
    key: K,
    value: AccountSystemSettings[K],
  ) => onChange({ ...settings, [key]: value });

  function sendTestEmail() {
    if (!settings.mailHost || settings.mailHost === '127.0.0.1' || !settings.mailUsername) {
      setTestEmailStatus(
        'Mail provider not configured. Configure valid SMTP host, port, username, and password above before testing outbound email.',
      );
    } else {
      setTestEmailStatus(
        'Mail service not configured. Direct outbound SMTP probe requires platform mail worker integration.',
      );
    }
  }

  function openCreateModal() {
    setEditingFieldId(null);
    setFormFieldName('');
    setFormFieldType('text');
    setFormOptions('');
    setFormSortOrder(0);
    setFormDefaultValue('');
    setFormRequired(false);
    setIsModalOpen(true);
  }

  function openEditModal(item: CustomFieldItem) {
    setEditingFieldId(item.id);
    setFormFieldName(item.fieldName);
    setFormFieldType(item.fieldType);
    setFormOptions(item.options || '');
    setFormSortOrder(item.sortOrder);
    setFormDefaultValue(item.defaultValue || '');
    setFormRequired(item.required);
    setIsModalOpen(true);
  }

  function handleSaveField() {
    if (!formFieldName.trim()) return;

    if (editingFieldId) {
      update(
        'customFields',
        settings.customFields.map((item) =>
          item.id === editingFieldId
            ? {
                ...item,
                fieldName: formFieldName.trim(),
                fieldType: formFieldType,
                options: formOptions,
                sortOrder: formSortOrder,
                defaultValue: formDefaultValue,
                required: formRequired,
              }
            : item,
        ),
      );
    } else {
      const newItem: CustomFieldItem = {
        id: `cf-${Date.now()}`,
        module: activeCustomModule,
        fieldName: formFieldName.trim(),
        fieldType: formFieldType,
        options: formOptions,
        sortOrder: formSortOrder,
        defaultValue: formDefaultValue,
        required: formRequired,
      };
      update('customFields', [...settings.customFields, newItem]);
    }

    setIsModalOpen(false);
  }

  function removeCustomField(id: string) {
    update(
      'customFields',
      settings.customFields.filter((item) => item.id !== id),
    );
  }

  function createBackupSnapshot() {
    setBackupMessage(
      'Backup service not configured. Automated snapshots are managed by platform operations.',
    );
  }

  async function revokeDevice(id: string) {
    try {
      const res = await fetch('/api/account/sessions/revoke', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ sessionId: id }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        throw new Error(data.error || 'Failed to revoke session.');
      }
      update(
        'loginDevices',
        settings.loginDevices.filter((item) => item.id !== id),
      );
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to revoke session.');
    }
  }

  // 1. PWA
  if (section === 'pwa') {
    return (
      <div className="space-y-4">
        <ErpfyPanel
          title="Progressive Web App (PWA)"
          description="Configure installable offline web app manifest, mobile homescreen shortcuts, and status bar coloring."
        >
          <div className="mb-4 rounded-xl border border-[var(--erpfy-line-soft)] p-3">
            <ErpfyCheckbox
              id="pwa-enable"
              checked={settings.pwaEnabled}
              label="Enable PWA Installability"
              description="Expose service worker and webmanifest for installation on iOS, Android, and Desktop Chrome."
              onChange={(e) => update('pwaEnabled', e.target.checked)}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <ErpfyInput
              id="pwa-name"
              label="Application Full Name"
              value={settings.pwaAppName}
              onChange={(e) => update('pwaAppName', e.target.value)}
            />
            <ErpfyInput
              id="pwa-short"
              label="Homescreen Short Name"
              value={settings.pwaShortName}
              onChange={(e) => update('pwaShortName', e.target.value)}
            />
            <ErpfyInput
              id="pwa-theme-col"
              label="Theme Color (Hex)"
              value={settings.pwaThemeColor}
              onChange={(e) => update('pwaThemeColor', e.target.value)}
            />
            <ErpfyInput
              id="pwa-bg-col"
              label="Splash Background (Hex)"
              value={settings.pwaBgColor}
              onChange={(e) => update('pwaBgColor', e.target.value)}
            />
            <ErpfySelect
              id="pwa-display"
              label="Display Mode"
              value={settings.pwaDisplayMode}
              onChange={(e) =>
                update(
                  'pwaDisplayMode',
                  e.target.value as AccountSystemSettings['pwaDisplayMode'],
                )
              }
            >
              <option value="standalone">
                Standalone (Full App Experience, No Browser Bar)
              </option>
              <option value="fullscreen">Fullscreen (Immersive)</option>
              <option value="minimal-ui">Minimal UI</option>
            </ErpfySelect>
          </div>
        </ErpfyPanel>
      </div>
    );
  }

  // 2. Mobile App
  if (section === 'mobile-app') {
    return (
      <div className="space-y-4">
        <ErpfyPanel
          title="Mobile Companion App"
          description="Link ERPFY handheld devices with biometric authentication and push notifications."
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <ErpfyInput
                id="mobile-api-url"
                label="Mobile Gateway API Endpoint"
                value={settings.mobileAppApiUrl}
                onChange={(e) => update('mobileAppApiUrl', e.target.value)}
              />
            </div>
            <ErpfySelect
              id="mobile-push-prov"
              label="Push Notifications Service"
              value={settings.mobilePushProvider}
              onChange={(e) =>
                update(
                  'mobilePushProvider',
                  e.target.value as AccountSystemSettings['mobilePushProvider'],
                )
              }
            >
              <option value="fcm">Google Firebase Cloud Messaging (FCM)</option>
              <option value="apns">
                Apple Push Notification Service (APNs)
              </option>
              <option value="onesignal">OneSignal Mobile Platform</option>
            </ErpfySelect>
            <ErpfyInput
              id="mobile-min-ver"
              label="Minimum Required App Version"
              value={settings.mobileMinVersion}
              onChange={(e) => update('mobileMinVersion', e.target.value)}
              hint="Older builds will prompt the user to update."
            />
          </div>

          <div className="mt-4 grid gap-3 border-t border-[var(--erpfy-line-soft)] pt-4 sm:grid-cols-2">
            <div className="rounded-xl border border-[var(--erpfy-line-soft)] p-3">
              <ErpfyCheckbox
                id="mob-push"
                checked={settings.mobilePushEnabled}
                label="Push Alerts on Low Stock & Order Fulfillment"
                onChange={(e) => update('mobilePushEnabled', e.target.checked)}
              />
            </div>
            <div className="rounded-xl border border-[var(--erpfy-line-soft)] p-3">
              <ErpfyCheckbox
                id="mob-bio"
                checked={settings.mobileBiometricLogin}
                label="Allow FaceID / Biometric Fast Login"
                onChange={(e) =>
                  update('mobileBiometricLogin', e.target.checked)
                }
              />
            </div>
          </div>
        </ErpfyPanel>
      </div>
    );
  }

  // 3. Mail
  if (section === 'mail') {
    return (
      <div className="space-y-4">
        <ErpfyPanel
          title="SMTP Email Configuration"
          description="Outgoing server settings for sending invoice PDFs, password resets, stock alerts, and customer notifications."
        >
          <div className="grid gap-4 sm:grid-cols-3">
            <ErpfySelect
              id="mail-driver"
              label="Mail Transport Driver"
              value={settings.mailDriver}
              onChange={(e) =>
                update(
                  'mailDriver',
                  e.target.value as AccountSystemSettings['mailDriver'],
                )
              }
            >
              <option value="smtp">Custom SMTP Server</option>
              <option value="mailpit">Mailpit / Mailhog (Local Dev)</option>
              <option value="sendgrid">SendGrid API</option>
              <option value="mailgun">Mailgun HTTP</option>
              <option value="ses">Amazon SES</option>
            </ErpfySelect>
            <ErpfyInput
              id="mail-host"
              label="SMTP Host"
              value={settings.mailHost}
              onChange={(e) => update('mailHost', e.target.value)}
              hint="e.g. smtp.gmail.com or 127.0.0.1"
            />
            <ErpfyInput
              id="mail-port"
              label="Port"
              type="number"
              value={settings.mailPort}
              onChange={(e) => update('mailPort', Number(e.target.value))}
              hint="587 (TLS), 465 (SSL), or 1025 (Dev)"
            />
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            <ErpfyInput
              id="mail-user"
              label="SMTP Username"
              value={settings.mailUsername}
              onChange={(e) => update('mailUsername', e.target.value)}
            />
            <ErpfyInput
              id="mail-pass"
              label="SMTP Password"
              type="password"
              value={settings.mailPassword}
              onChange={(e) => update('mailPassword', e.target.value)}
            />
            <ErpfySelect
              id="mail-enc"
              label="Encryption Type"
              value={settings.mailEncryption}
              onChange={(e) =>
                update(
                  'mailEncryption',
                  e.target.value as AccountSystemSettings['mailEncryption'],
                )
              }
            >
              <option value="none">None (Plain)</option>
              <option value="tls">STARTTLS</option>
              <option value="ssl">SSL / TLS</option>
            </ErpfySelect>
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <ErpfyInput
              id="mail-from"
              label="Default Sender Email"
              type="email"
              value={settings.mailFromAddress}
              onChange={(e) => update('mailFromAddress', e.target.value)}
            />
            <ErpfyInput
              id="mail-name"
              label="Sender Display Name"
              value={settings.mailFromName}
              onChange={(e) => update('mailFromName', e.target.value)}
            />
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-[var(--erpfy-line-soft)] pt-4">
            <ErpfyButton
              tone="secondary"
              onClick={sendTestEmail}
            >
              <Send className="size-4" />
              Send Test Email
            </ErpfyButton>
            {testEmailStatus && (
              <span className="flex items-center gap-1.5 text-xs font-semibold text-[var(--erpfy-ok-ink)]">
                <CheckCircle2 className="size-4" />
                {testEmailStatus}
              </span>
            )}
          </div>
        </ErpfyPanel>
      </div>
    );
  }

  // 4. SMS
  if (section === 'sms') {
    return (
      <div className="space-y-4">
        <ErpfyPanel
          title="SMS Gateway Integration"
          description="Send automated text messages for order confirmation, order pickup alerts, and OTP verification."
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <ErpfySelect
              id="sms-prov"
              label="SMS Service Provider"
              value={settings.smsProvider}
              onChange={(e) =>
                update(
                  'smsProvider',
                  e.target.value as AccountSystemSettings['smsProvider'],
                )
              }
            >
              <option value="twilio">Twilio Cloud API</option>
              <option value="infobip">Infobip Enterprise</option>
              <option value="vonage">Vonage / Nexmo</option>
              <option value="generic-http">Generic HTTP Webhook</option>
            </ErpfySelect>
            <ErpfyInput
              id="sms-sender"
              label="Sender ID / Alpha Tag"
              value={settings.smsSenderId}
              onChange={(e) => update('smsSenderId', e.target.value)}
              hint="Max 11 characters (e.g. ERPFY)"
            />
            <ErpfyInput
              id="sms-key"
              label="API Key / Account SID"
              value={settings.smsApiKey}
              onChange={(e) => update('smsApiKey', e.target.value)}
            />
            <ErpfyInput
              id="sms-sec"
              label="API Secret / Auth Token"
              type="password"
              value={settings.smsApiSecret}
              onChange={(e) => update('smsApiSecret', e.target.value)}
            />
          </div>

          <div className="mt-4 border-t border-[var(--erpfy-line-soft)] pt-4">
            <div className="rounded-xl border border-[var(--erpfy-line-soft)] p-3">
              <ErpfyCheckbox
                id="sms-cust-alerts"
                checked={settings.smsCustomerNotifications}
                label="Automatically SMS Customer When Order Ships"
                description="Sends tracking number and tracking link to customer phone number."
                onChange={(e) =>
                  update('smsCustomerNotifications', e.target.checked)
                }
              />
            </div>
          </div>
        </ErpfyPanel>
      </div>
    );
  }

  // 5. Payment Gateway (Matching Stocky with info alert, 2-column sidebar list, card detail, and toggle)
  if (section === 'payment-gateway') {
    const GATEWAYS: Array<{
      id: GatewayId;
      label: string;
      icon: typeof CreditCard;
      enabled: boolean;
    }> = [
      {
        id: 'stripe',
        label: 'Stripe',
        icon: CreditCard,
        enabled: settings.stripeEnabled,
      },
      {
        id: 'paypal',
        label: 'PayPal',
        icon: CircleDollarSign,
        enabled: settings.paypalEnabled,
      },
      {
        id: 'paystack',
        label: 'Paystack',
        icon: Landmark,
        enabled: settings.paystackEnabled,
      },
      {
        id: 'flutterwave',
        label: 'Flutterwave',
        icon: Globe,
        enabled: settings.flutterwaveEnabled,
      },
      {
        id: 'razorpay',
        label: 'Razorpay',
        icon: Zap,
        enabled: settings.razorpayEnabled,
      },
      {
        id: 'bkash',
        label: 'bKash',
        icon: Smartphone,
        enabled: settings.bkashEnabled,
      },
      {
        id: 'sslcommerz',
        label: 'SSLCommerz',
        icon: ShieldCheck,
        enabled: settings.sslcommerzEnabled,
      },
      {
        id: 'easypaisa',
        label: 'Easypaisa',
        icon: Smartphone,
        enabled: settings.easypaisaEnabled,
      },
      {
        id: 'jazzcash',
        label: 'JazzCash',
        icon: Smartphone,
        enabled: settings.jazzcashEnabled,
      },
      {
        id: 'our-banks',
        label: 'Our Banks',
        icon: Landmark,
        enabled: settings.offlineBankTransferEnabled,
      },
      {
        id: 'offline',
        label: 'Offline Payments',
        icon: Banknote,
        enabled: settings.offlineCashEnabled || settings.codEnabled,
      },
    ];

    const currentGatewayConfig =
      GATEWAYS.find((g) => g.id === selectedGateway) ?? GATEWAYS[0];
    const isCurrentEnabled = currentGatewayConfig.enabled;

    function toggleSelectedGateway() {
      if (selectedGateway === 'stripe')
        update('stripeEnabled', !settings.stripeEnabled);
      if (selectedGateway === 'paypal')
        update('paypalEnabled', !settings.paypalEnabled);
      if (selectedGateway === 'paystack')
        update('paystackEnabled', !settings.paystackEnabled);
      if (selectedGateway === 'flutterwave')
        update('flutterwaveEnabled', !settings.flutterwaveEnabled);
      if (selectedGateway === 'razorpay')
        update('razorpayEnabled', !settings.razorpayEnabled);
      if (selectedGateway === 'bkash')
        update('bkashEnabled', !settings.bkashEnabled);
      if (selectedGateway === 'sslcommerz')
        update('sslcommerzEnabled', !settings.sslcommerzEnabled);
      if (selectedGateway === 'easypaisa')
        update('easypaisaEnabled', !settings.easypaisaEnabled);
      if (selectedGateway === 'jazzcash')
        update('jazzcashEnabled', !settings.jazzcashEnabled);
      if (selectedGateway === 'our-banks')
        update(
          'offlineBankTransferEnabled',
          !settings.offlineBankTransferEnabled,
        );
      if (selectedGateway === 'offline') {
        const next = !settings.offlineCashEnabled;
        onChange({ ...settings, offlineCashEnabled: next, codEnabled: next });
      }
    }

    function saveGatewayChanges() {
      setGatewaySavedMsg(
        `${currentGatewayConfig.label} payment settings updated. Choose Save changes to apply them.`,
      );
      setTimeout(() => setGatewaySavedMsg(null), 3000);
    }

    const GatewayIcon = currentGatewayConfig.icon;

    const hasStoredKey =
      (selectedGateway === 'stripe' &&
        Boolean(settings.stripePublishableKey)) ||
      (selectedGateway === 'paypal' && Boolean(settings.paypalClientId)) ||
      (selectedGateway === 'paystack' && Boolean(settings.paystackPublicKey)) ||
      (selectedGateway === 'flutterwave' &&
        Boolean(settings.flutterwavePublicKey)) ||
      (selectedGateway === 'razorpay' && Boolean(settings.razorpayKeyId)) ||
      (selectedGateway === 'bkash' && Boolean(settings.bkashAppKey)) ||
      (selectedGateway === 'sslcommerz' &&
        Boolean(settings.sslcommerzStoreId)) ||
      (selectedGateway === 'easypaisa' && Boolean(settings.easypaisaStoreId)) ||
      (selectedGateway === 'jazzcash' &&
        Boolean(settings.jazzcashMerchantId)) ||
      (selectedGateway === 'our-banks' &&
        Boolean(
          settings.offlineBankTransferEnabled && settings.offlineBankDetails,
        )) ||
      (selectedGateway === 'offline' &&
        Boolean(settings.offlineCashEnabled || settings.codEnabled));

    return (
      <div className="space-y-4">
        {/* Top Info Banner matching Stocky */}
        <div className="flex items-start gap-3 rounded-2xl border border-sky-200 bg-sky-50/70 p-4 text-xs leading-5 text-sky-900 shadow-xs">
          <Info className="mt-0.5 size-5 shrink-0 text-sky-600" />
          <div className="space-y-1">
            <p className="font-semibold text-sky-950">
              Easypaisa, JazzCash, PayPal, Paystack, Flutterwave, Razorpay,
              bKash and SSLCommerz can be enabled for online checkout.
            </p>
            <p className="text-sky-800">
              Stripe keys are shared globally (admin and online store use the
              same Stripe integration). Our Banks shows your own Pakistani bank
              transfer instructions; Offline Payments holds cash and COD.
            </p>
          </div>
        </div>

        {/* 2-Column Master-Detail Layout */}
        <div className="grid grid-cols-1 items-start gap-5 md:grid-cols-[210px_minmax(0,1fr)]">
          {/* Left Gateway List */}
          <div className="erpfy-card divide-y divide-[var(--erpfy-line-soft)] overflow-hidden rounded-xl border border-[var(--erpfy-line-soft)] bg-white">
            {GATEWAYS.map((gw) => {
              const isSelected = selectedGateway === gw.id;
              const Icon = gw.icon;
              return (
                <button
                  key={gw.id}
                  type="button"
                  onClick={() => {
                    setSelectedGateway(gw.id);
                    setGatewaySavedMsg(null);
                  }}
                  className={`flex w-full items-center justify-between gap-2.5 px-3.5 py-3 text-left text-xs font-semibold transition-colors ${
                    isSelected
                      ? 'border-r-3 border-[var(--erpfy-brand)] bg-[var(--erpfy-brand-soft)] text-[var(--erpfy-brand-soft-ink)]'
                      : 'text-neutral-700 hover:bg-neutral-50'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span
                      className={`size-2 rounded-full shrink-0 ${
                        gw.enabled
                          ? 'bg-emerald-500 ring-2 ring-emerald-100'
                          : 'bg-neutral-300'
                      }`}
                    />
                    <Icon className="size-4 shrink-0 text-neutral-500" />
                    <span className="truncate">{gw.label}</span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Right Selected Gateway Configuration Card */}
          <div className="erpfy-card space-y-5 rounded-xl border border-[var(--erpfy-line-soft)] bg-white p-5 shadow-xs">
            {/* Header with Icon, Name, Disabled/Enabled badge and Switch */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--erpfy-line-soft)] pb-4">
              <div className="flex items-center gap-3">
                <div className="grid size-12 place-items-center rounded-xl bg-[var(--erpfy-brand)] text-white shadow-xs">
                  <GatewayIcon className="size-6" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-neutral-900">
                    {currentGatewayConfig.label}
                  </h2>
                  <p className="text-xs text-[var(--erpfy-ink-muted)]">
                    Store — Payment Gateway
                  </p>
                </div>
              </div>

              {/* Status Badge & Toggle Switch */}
              <div className="flex items-center gap-3">
                <span className="text-xs font-semibold text-neutral-500">
                  {isCurrentEnabled ? 'Enabled' : 'Disabled'}
                </span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={isCurrentEnabled}
                  aria-label={`Toggle ${currentGatewayConfig.label}`}
                  onClick={toggleSelectedGateway}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full transition-colors duration-200 ease-in-out ${
                    isCurrentEnabled
                      ? 'bg-[var(--erpfy-brand)]'
                      : 'bg-neutral-300'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block size-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                      isCurrentEnabled ? 'translate-x-5' : 'translate-x-0.5'
                    } mt-0.5`}
                  />
                </button>
              </div>
            </div>

            {/* Gateway Credential Inputs */}
            {selectedGateway === 'stripe' && (
              <div className="space-y-4">
                <div>
                  <label
                    className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-neutral-700"
                    htmlFor="gw-stripe-key"
                  >
                    Stripe Key
                  </label>
                  <ErpfyInput
                    id="gw-stripe-key"
                    placeholder="Please leave this field blank if you haven't changed it"
                    value={settings.stripePublishableKey}
                    onChange={(e) =>
                      update('stripePublishableKey', e.target.value)
                    }
                  />
                  <p className="mt-1 text-[11px] text-neutral-400">
                    Please leave this field blank if you haven&apos;t changed it
                  </p>
                </div>
                <div>
                  <label
                    className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-neutral-700"
                    htmlFor="gw-stripe-secret"
                  >
                    Stripe Secret
                  </label>
                  <ErpfyInput
                    id="gw-stripe-secret"
                    type="password"
                    placeholder="Please leave this field blank if you haven't changed it"
                    value={settings.stripeSecretKey}
                    onChange={(e) => update('stripeSecretKey', e.target.value)}
                  />
                  <p className="mt-1 text-[11px] text-neutral-400">
                    Please leave this field blank if you haven&apos;t changed it
                  </p>
                </div>
              </div>
            )}

            {selectedGateway === 'paypal' && (
              <div className="space-y-4">
                <div>
                  <label
                    className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-neutral-700"
                    htmlFor="gw-paypal-client"
                  >
                    PayPal Client ID
                  </label>
                  <ErpfyInput
                    id="gw-paypal-client"
                    placeholder="Enter PayPal REST Client ID"
                    value={settings.paypalClientId}
                    onChange={(e) => update('paypalClientId', e.target.value)}
                  />
                </div>
                <div>
                  <label
                    className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-neutral-700"
                    htmlFor="gw-paypal-secret"
                  >
                    PayPal Client Secret
                  </label>
                  <ErpfyInput
                    id="gw-paypal-secret"
                    type="password"
                    placeholder="Enter PayPal Secret"
                    value={settings.paypalSecret}
                    onChange={(e) => update('paypalSecret', e.target.value)}
                  />
                </div>
                <div className="max-w-xs">
                  <ErpfySelect
                    id="gw-paypal-mode"
                    label="Environment Mode"
                    value={settings.paypalMode}
                    onChange={(e) =>
                      update('paypalMode', e.target.value as 'sandbox' | 'live')
                    }
                  >
                    <option value="sandbox">Sandbox (Testing)</option>
                    <option value="live">Live (Production)</option>
                  </ErpfySelect>
                </div>
              </div>
            )}

            {selectedGateway === 'paystack' && (
              <div className="space-y-4">
                <div>
                  <label
                    className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-neutral-700"
                    htmlFor="gw-paystack-pub"
                  >
                    Paystack Public Key
                  </label>
                  <ErpfyInput
                    id="gw-paystack-pub"
                    placeholder="pk_live_..."
                    value={settings.paystackPublicKey}
                    onChange={(e) =>
                      update('paystackPublicKey', e.target.value)
                    }
                  />
                </div>
                <div>
                  <label
                    className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-neutral-700"
                    htmlFor="gw-paystack-sec"
                  >
                    Paystack Secret Key
                  </label>
                  <ErpfyInput
                    id="gw-paystack-sec"
                    type="password"
                    placeholder="sk_live_..."
                    value={settings.paystackSecretKey}
                    onChange={(e) =>
                      update('paystackSecretKey', e.target.value)
                    }
                  />
                </div>
              </div>
            )}

            {selectedGateway === 'flutterwave' && (
              <div className="space-y-4">
                <div>
                  <label
                    className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-neutral-700"
                    htmlFor="gw-flw-pub"
                  >
                    Flutterwave Public Key
                  </label>
                  <ErpfyInput
                    id="gw-flw-pub"
                    placeholder="FLWPUBK-..."
                    value={settings.flutterwavePublicKey}
                    onChange={(e) =>
                      update('flutterwavePublicKey', e.target.value)
                    }
                  />
                </div>
                <div>
                  <label
                    className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-neutral-700"
                    htmlFor="gw-flw-sec"
                  >
                    Flutterwave Secret Key
                  </label>
                  <ErpfyInput
                    id="gw-flw-sec"
                    type="password"
                    placeholder="FLWSECK-..."
                    value={settings.flutterwaveSecretKey}
                    onChange={(e) =>
                      update('flutterwaveSecretKey', e.target.value)
                    }
                  />
                </div>
              </div>
            )}

            {selectedGateway === 'razorpay' && (
              <div className="space-y-4">
                <div>
                  <label
                    className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-neutral-700"
                    htmlFor="gw-rzp-key"
                  >
                    Razorpay Key ID
                  </label>
                  <ErpfyInput
                    id="gw-rzp-key"
                    placeholder="rzp_live_..."
                    value={settings.razorpayKeyId}
                    onChange={(e) => update('razorpayKeyId', e.target.value)}
                  />
                </div>
                <div>
                  <label
                    className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-neutral-700"
                    htmlFor="gw-rzp-sec"
                  >
                    Razorpay Key Secret
                  </label>
                  <ErpfyInput
                    id="gw-rzp-sec"
                    type="password"
                    placeholder="Enter Razorpay Secret"
                    value={settings.razorpayKeySecret}
                    onChange={(e) =>
                      update('razorpayKeySecret', e.target.value)
                    }
                  />
                </div>
              </div>
            )}

            {selectedGateway === 'bkash' && (
              <div className="space-y-4">
                <div>
                  <label
                    className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-neutral-700"
                    htmlFor="gw-bkash-app"
                  >
                    bKash App Key
                  </label>
                  <ErpfyInput
                    id="gw-bkash-app"
                    placeholder="bKash Merchant App Key"
                    value={settings.bkashAppKey}
                    onChange={(e) => update('bkashAppKey', e.target.value)}
                  />
                </div>
                <div>
                  <label
                    className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-neutral-700"
                    htmlFor="gw-bkash-sec"
                  >
                    bKash App Secret
                  </label>
                  <ErpfyInput
                    id="gw-bkash-sec"
                    type="password"
                    placeholder="bKash Merchant App Secret"
                    value={settings.bkashAppSecret}
                    onChange={(e) => update('bkashAppSecret', e.target.value)}
                  />
                </div>
              </div>
            )}

            {selectedGateway === 'sslcommerz' && (
              <div className="space-y-4">
                <div>
                  <label
                    className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-neutral-700"
                    htmlFor="gw-ssl-store"
                  >
                    SSLCommerz Store ID
                  </label>
                  <ErpfyInput
                    id="gw-ssl-store"
                    placeholder="Enter Store ID"
                    value={settings.sslcommerzStoreId}
                    onChange={(e) =>
                      update('sslcommerzStoreId', e.target.value)
                    }
                  />
                </div>
                <div>
                  <label
                    className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-neutral-700"
                    htmlFor="gw-ssl-pass"
                  >
                    SSLCommerz Store Password
                  </label>
                  <ErpfyInput
                    id="gw-ssl-pass"
                    type="password"
                    placeholder="Enter Store Password"
                    value={settings.sslcommerzStorePassword}
                    onChange={(e) =>
                      update('sslcommerzStorePassword', e.target.value)
                    }
                  />
                </div>
              </div>
            )}

            {selectedGateway === 'easypaisa' && (
              <div className="space-y-4">
                <ErpfyInput
                  id="gw-easypaisa-store"
                  label="Easypaisa Store ID"
                  placeholder="Enter merchant Store ID"
                  value={settings.easypaisaStoreId}
                  onChange={(e) => update('easypaisaStoreId', e.target.value)}
                />
                <ErpfyInput
                  id="gw-easypaisa-hash"
                  label="Easypaisa Hash Key"
                  type="password"
                  placeholder="Enter merchant Hash Key"
                  value={settings.easypaisaHashKey}
                  onChange={(e) => update('easypaisaHashKey', e.target.value)}
                  hint="Stored as an encrypted company credential."
                />
              </div>
            )}

            {selectedGateway === 'jazzcash' && (
              <div className="space-y-4">
                <ErpfyInput
                  id="gw-jazzcash-merchant"
                  label="JazzCash Merchant ID"
                  placeholder="Enter merchant ID"
                  value={settings.jazzcashMerchantId}
                  onChange={(e) => update('jazzcashMerchantId', e.target.value)}
                />
                <div className="grid gap-4 sm:grid-cols-2">
                  <ErpfyInput
                    id="gw-jazzcash-password"
                    label="Merchant Password"
                    type="password"
                    placeholder="Enter merchant password"
                    value={settings.jazzcashPassword}
                    onChange={(e) => update('jazzcashPassword', e.target.value)}
                  />
                  <ErpfyInput
                    id="gw-jazzcash-salt"
                    label="Integrity Salt"
                    type="password"
                    placeholder="Enter integrity salt"
                    value={settings.jazzcashIntegritySalt}
                    onChange={(e) =>
                      update('jazzcashIntegritySalt', e.target.value)
                    }
                  />
                </div>
                <div className="max-w-xs">
                  <ErpfySelect
                    id="gw-jazzcash-mode"
                    label="Environment Mode"
                    value={settings.jazzcashMode}
                    onChange={(e) =>
                      update(
                        'jazzcashMode',
                        e.target.value as 'sandbox' | 'live',
                      )
                    }
                  >
                    <option value="sandbox">Sandbox (Testing)</option>
                    <option value="live">Live (Production)</option>
                  </ErpfySelect>
                </div>
                <p className="text-xs text-[var(--erpfy-ink-muted)]">
                  Password and integrity salt are stored as encrypted company
                  credentials.
                </p>
              </div>
            )}

            {selectedGateway === 'our-banks' && (
              <div className="space-y-4">
                <ErpfyTextarea
                  id="gw-our-banks-details"
                  label="Pakistani Bank Accounts & Instructions"
                  rows={7}
                  placeholder={
                    'Bank name\nAccount title\nAccount number\nIBAN\nPayment verification instructions'
                  }
                  value={settings.offlineBankDetails}
                  onChange={(e) => update('offlineBankDetails', e.target.value)}
                  hint="Shown to customers who select Our Banks at checkout. Add one or more company accounts."
                />
              </div>
            )}

            {selectedGateway === 'offline' && (
              <div className="space-y-4">
                <div className="rounded-xl border border-[var(--erpfy-line-soft)] p-3">
                  <ErpfyCheckbox
                    id="gw-offline-cod"
                    checked={settings.codEnabled}
                    label="Cash on Delivery (COD) / Pay in Store"
                    description="Allow customers to place orders online and pay cash upon delivery or pickup."
                    onChange={(e) => {
                      onChange({
                        ...settings,
                        codEnabled: e.target.checked,
                        offlineCashEnabled: e.target.checked,
                      });
                    }}
                  />
                </div>
              </div>
            )}

            {/* Warning Callout when keys are not stored, matching Stocky */}
            {!hasStoredKey &&
              selectedGateway !== 'offline' &&
              selectedGateway !== 'our-banks' && (
                <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50/80 p-4 text-xs text-amber-900 shadow-xs">
                  <AlertCircle className="mt-0.5 size-5 shrink-0 text-amber-600" />
                  <div>
                    <p className="font-bold text-amber-950">
                      No {currentGatewayConfig.label} key stored
                    </p>
                    <p className="mt-0.5 text-amber-800">
                      Enter your {currentGatewayConfig.label} key and secret to
                      start accepting payments in the online store.
                    </p>
                  </div>
                </div>
              )}

            {hasStoredKey &&
              selectedGateway !== 'offline' &&
              selectedGateway !== 'our-banks' && (
                <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50/70 p-3 text-xs font-semibold text-emerald-800">
                  <CheckCircle2 className="size-4 shrink-0" />
                  <span>
                    {currentGatewayConfig.label} credentials configured and
                    active.
                  </span>
                </div>
              )}

            {gatewaySavedMsg && (
              <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs font-semibold text-emerald-800">
                <CheckCircle2 className="size-4 shrink-0" />
                <span>{gatewaySavedMsg}</span>
              </div>
            )}

            {/* Submit Button */}
            <div className="border-t border-[var(--erpfy-line-soft)] pt-3">
              <ErpfyButton tone="primary" onClick={saveGatewayChanges}>
                Submit
              </ErpfyButton>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 6. ZATCA
  if (section === 'zatca') {
    return (
      <div className="space-y-4">
        <ErpfyPanel
          title="ZATCA E-Invoicing (Fatoorah Compliance)"
          description="Official integration with Saudi Arabia Zakat, Tax and Customs Authority e-invoicing platform."
        >
          <div className="mb-4 flex items-center gap-2 rounded-xl bg-emerald-50 p-3 text-xs font-semibold text-emerald-800">
            <BadgeCheck className="size-5 shrink-0" />
            <span>
              Cryptographic Stamp Identifier (CSID): {settings.zatcaCsidStatus}
            </span>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <ErpfySelect
              id="zatca-phase"
              label="Compliance Mandate Phase"
              value={settings.zatcaPhase}
              onChange={(e) =>
                update('zatcaPhase', e.target.value as 'phase-1' | 'phase-2')
              }
            >
              <option value="phase-1">
                Phase 1: Generation Phase (QR Codes & Offline)
              </option>
              <option value="phase-2">
                Phase 2: Integration Phase (Direct ZATCA Clearance)
              </option>
            </ErpfySelect>
            <ErpfySelect
              id="zatca-env"
              label="ZATCA Portal Environment"
              value={settings.zatcaEnvironment}
              onChange={(e) =>
                update(
                  'zatcaEnvironment',
                  e.target.value as AccountSystemSettings['zatcaEnvironment'],
                )
              }
            >
              <option value="sandbox">Developer Sandbox (Simulation)</option>
              <option value="simulation">Pre-Production Simulation</option>
              <option value="production">Live Core Production</option>
            </ErpfySelect>
            <ErpfyInput
              id="zatca-vat"
              label="Taxpayer 15-digit VAT Identification"
              value={settings.zatcaVatNumber}
              onChange={(e) => update('zatcaVatNumber', e.target.value)}
            />
            <div className="flex items-center self-end p-2">
              <ErpfyCheckbox
                id="zatca-autoreport"
                checked={settings.zatcaAutoReport}
                label="Auto-Clear B2B Invoices within 24h"
                onChange={(e) => update('zatcaAutoReport', e.target.checked)}
              />
            </div>
          </div>
        </ErpfyPanel>
      </div>
    );
  }

  // 7. Custom Fields (Matching Stocky layout with Sub-Tabs, + Create button, Modal Popup, and Sort order)
  if (section === 'custom-fields') {
    const currentFields = settings.customFields
      .filter((f) => f.module === activeCustomModule)
      .sort((a, b) => a.sortOrder - b.sortOrder);

    return (
      <div className="space-y-4">
        <ErpfyPanel
          title="Custom fields"
          description="Extra fields on customers, suppliers and documents."
        >
          {/* Top Bar: Module Sub-Tabs (Customers, Suppliers, Products, Orders) and + Create Button */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--erpfy-line-soft)] pb-3">
            <div className="flex items-center gap-6">
              {CUSTOM_FIELD_MODULES.map((tab) => {
                const isActive = activeCustomModule === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveCustomModule(tab.id)}
                    className={`pb-1 text-sm font-medium transition-colors ${
                      isActive
                        ? 'border-b-2 border-[var(--erpfy-brand)] font-bold text-[var(--erpfy-brand)]'
                        : 'text-[var(--erpfy-ink-muted)] hover:text-[var(--erpfy-ink)]'
                    }`}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>

            <ErpfyButton tone="primary" onClick={openCreateModal}>
              <Plus className="size-4" /> Create
            </ErpfyButton>
          </div>

          {/* Active Fields Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-[var(--erpfy-line-soft)] bg-neutral-50/70 text-[var(--erpfy-ink-muted)]">
                <tr>
                  <th className="p-3 font-semibold">Field Name</th>
                  <th className="p-3 font-semibold">Field Type</th>
                  <th className="p-3 font-semibold">Required</th>
                  <th className="p-3 font-semibold">Sort</th>
                  <th className="p-3 text-right font-semibold">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--erpfy-line-soft)] bg-white">
                {currentFields.map((field) => (
                  <tr key={field.id} className="hover:bg-neutral-50/50">
                    <td className="p-3 font-semibold text-neutral-800">
                      {field.fieldName}
                      {field.defaultValue && (
                        <span className="block text-[10px] text-neutral-400 font-normal">
                          Default: {field.defaultValue}
                        </span>
                      )}
                    </td>
                    <td className="p-3 capitalize text-neutral-600">
                      {field.fieldType}
                    </td>
                    <td className="p-3">
                      <ErpfyStatus
                        tone={field.required ? 'critical' : 'neutral'}
                      >
                        {field.required ? 'Yes' : 'No'}
                      </ErpfyStatus>
                    </td>
                    <td className="p-3 font-mono text-neutral-600">
                      {field.sortOrder}
                    </td>
                    <td className="p-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => openEditModal(field)}
                          className="text-neutral-500 hover:text-[var(--erpfy-brand)]"
                          aria-label={`Edit ${field.fieldName}`}
                          title="Edit custom field"
                        >
                          <Pencil className="size-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => removeCustomField(field.id)}
                          className="text-red-500 hover:text-red-700"
                          aria-label={`Delete ${field.fieldName}`}
                          title="Delete custom field"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Empty State matching Stocky */}
            {currentFields.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="mb-2 grid size-12 place-items-center rounded-full bg-neutral-100 text-neutral-400">
                  <Inbox className="size-6" />
                </div>
                <p className="text-sm font-semibold text-neutral-500">
                  No data Available
                </p>
                <p className="mt-1 text-xs text-neutral-400">
                  Click &ldquo;+ Create&rdquo; to add custom fields for{' '}
                  {activeCustomModule}.
                </p>
              </div>
            )}
          </div>
        </ErpfyPanel>

        {/* Modal Dialog matching Stocky's Create / Edit Form */}
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs">
            <div className="erpfy-card w-full max-w-md overflow-hidden bg-white shadow-xl animate-in fade-in zoom-in-95 duration-150">
              {/* Modal Header */}
              <div className="flex items-center justify-between border-b border-[var(--erpfy-line-soft)] p-4">
                <h3 className="text-base font-bold text-neutral-900">
                  {editingFieldId ? 'Edit Custom Field' : 'Create Custom Field'}
                </h3>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-md p-1 text-neutral-400 hover:text-neutral-600"
                  aria-label="Close dialog"
                >
                  <X className="size-4" />
                </button>
              </div>

              {/* Modal Form */}
              <div className="space-y-4 p-4">
                <ErpfyInput
                  id="modal-field-name"
                  label="Field Name *"
                  placeholder="Enter field label"
                  value={formFieldName}
                  onChange={(e) => setFormFieldName(e.target.value)}
                />

                <ErpfySelect
                  id="modal-field-type"
                  label="Field Type *"
                  value={formFieldType}
                  onChange={(e) =>
                    setFormFieldType(e.target.value as CustomFieldType)
                  }
                >
                  <option value="text">Text (Single Line)</option>
                  <option value="textarea">Textarea (Multi Line)</option>
                  <option value="number">Number</option>
                  <option value="date">Date</option>
                  <option value="select">Select (Dropdown Choice)</option>
                  <option value="checkbox">Checkbox</option>
                </ErpfySelect>

                {/* Conditional textarea when select is chosen, exactly like Stocky */}
                {formFieldType === 'select' && (
                  <ErpfyTextarea
                    id="modal-field-options"
                    label="Enter options, one per line *"
                    placeholder={`Option 1\nOption 2\nOption 3`}
                    rows={3}
                    value={formOptions}
                    onChange={(e) => setFormOptions(e.target.value)}
                  />
                )}

                <div className="grid grid-cols-2 gap-3">
                  <ErpfyInput
                    id="modal-sort-order"
                    label="Sort Order"
                    type="number"
                    value={formSortOrder}
                    onChange={(e) => setFormSortOrder(Number(e.target.value))}
                    hint="Display sequence"
                  />
                  <ErpfyInput
                    id="modal-default-val"
                    label="Default Value"
                    placeholder="Optional default"
                    value={formDefaultValue}
                    onChange={(e) => setFormDefaultValue(e.target.value)}
                  />
                </div>

                <div className="pt-1">
                  <ErpfyCheckbox
                    id="modal-required"
                    checked={formRequired}
                    label="Required"
                    description="Enforce value before saving record"
                    onChange={(e) => setFormRequired(e.target.checked)}
                  />
                </div>
              </div>

              {/* Modal Footer */}
              <div className="flex items-center justify-end gap-2 border-t border-[var(--erpfy-line-soft)] bg-neutral-50 px-4 py-3">
                <ErpfyButton
                  tone="secondary"
                  onClick={() => setIsModalOpen(false)}
                >
                  Cancel
                </ErpfyButton>
                <ErpfyButton
                  tone="primary"
                  disabled={!formFieldName.trim()}
                  onClick={handleSaveField}
                >
                  Submit
                </ErpfyButton>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // 8. Backup Archives
  if (section === 'backup-archives') {
    return (
      <div className="space-y-4">
        <ErpfyPanel
          title="Database Backup Snapshots"
          description="Generate full SQL database dumps, download offline archives, and safeguard store historical data."
        >
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--erpfy-line-soft)] bg-neutral-50 p-4">
            <div>
              <p className="text-sm font-bold">Manual Backup Generator</p>
              <p className="text-xs text-[var(--erpfy-ink-muted)]">
                Creates an immutable gzip compressed SQL snapshot.
              </p>
            </div>
            <ErpfyButton
              tone="primary"
              onClick={createBackupSnapshot}
            >
              <Archive className="size-4" />
              Generate Backup Now
            </ErpfyButton>
          </div>

          {backupMessage && (
            <div className="mb-4 flex items-center gap-2 rounded-xl bg-emerald-50 p-3 text-xs font-semibold text-emerald-800">
              <CheckCircle2 className="size-4" />
              {backupMessage}
            </div>
          )}

          {settings.backupArchives.length === 0 ? (
            <div className="rounded-xl border border-[var(--erpfy-line-soft)] bg-neutral-50/60 p-8 text-center">
              <Archive className="mx-auto mb-2 size-8 text-neutral-300" />
              <p className="font-semibold text-neutral-800 text-sm">
                No backup archives generated yet
              </p>
              <p className="mt-1 text-xs text-[var(--erpfy-ink-muted)]">
                Automated backup snapshots and downloadable dumps will appear here once executed.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-[var(--erpfy-line-soft)]">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-[var(--erpfy-line-soft)] bg-neutral-50 text-[var(--erpfy-ink-muted)]">
                  <tr>
                    <th className="p-3">Archive Filename</th>
                    <th className="p-3">Size</th>
                    <th className="p-3">Created At</th>
                    <th className="p-3">Type</th>
                    <th className="p-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--erpfy-line-soft)] bg-white">
                  {settings.backupArchives.map((b) => (
                    <tr key={b.id}>
                      <td className="p-3 font-mono font-medium text-neutral-800">
                        {b.name}
                      </td>
                      <td className="p-3 text-neutral-600">{b.size}</td>
                      <td className="p-3 text-neutral-600">{b.createdAt}</td>
                      <td className="p-3">
                        <ErpfyStatus
                          tone={b.type === 'full' ? 'info' : 'success'}
                        >
                          {b.type.toUpperCase()}
                        </ErpfyStatus>
                      </td>
                      <td className="p-3 text-right">
                        <span className="text-xs text-neutral-400">
                          Unavailable
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </ErpfyPanel>
      </div>
    );
  }

  // 9. Login Devices
  if (section === 'login-devices') {
    return (
      <div className="space-y-4">
        <ErpfyPanel
          title="Authorized Sessions & Devices"
          description="Review computers, tablets, and POS terminals currently authenticated into your ERPFY workspace."
        >
          <div className="space-y-3">
            {settings.loginDevices.map((dev) => (
              <div
                key={dev.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--erpfy-line-soft)] bg-white p-4 shadow-xs"
              >
                <div className="flex items-start gap-3">
                  <div className="grid size-9 place-items-center rounded-lg bg-neutral-100 text-neutral-700">
                    <Laptop className="size-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-bold text-neutral-900">
                        {dev.device}
                      </p>
                      {dev.current && (
                        <ErpfyStatus tone="success">
                          Current Session
                        </ErpfyStatus>
                      )}
                    </div>
                    <p className="text-xs text-neutral-500">
                      {dev.browser} • IP: {dev.ip} • {dev.location}
                    </p>
                    <p className="mt-0.5 text-[11px] text-neutral-400">
                      Last activity: {dev.lastActive}
                    </p>
                  </div>
                </div>
                {!dev.current && (
                  <ErpfyButton
                    tone="danger"
                    onClick={() => revokeDevice(dev.id)}
                  >
                    Revoke Session
                  </ErpfyButton>
                )}
              </div>
            ))}
          </div>
        </ErpfyPanel>
      </div>
    );
  }

  return null;
}
