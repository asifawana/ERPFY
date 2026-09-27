'use client';

import { useState } from 'react';
import {
  ChevronDown,
  ChevronRight,
  Eye,
  Info,
  RotateCcw,
} from 'lucide-react';

import type { AccountSystemSettings } from '@/lib/account-system-settings';
import {
  ErpfyButton,
  ErpfyInput,
  ErpfyPanel,
  ErpfySelect,
  ErpfyTextarea,
} from '@/lib/design-system';

function SettingToggleSwitch({
  id,
  label,
  description,
  checked,
  onChange,
}: {
  id?: string;
  label: string;
  description?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border border-[var(--erpfy-line-soft)] p-3.5 transition-colors hover:bg-[var(--erpfy-brand-soft)]/20">
      <div className="min-w-0 pr-3">
        <p className="text-sm font-semibold text-[var(--erpfy-ink)]">{label}</p>
        {description && (
          <p className="mt-0.5 text-xs text-[var(--erpfy-ink-muted)] leading-relaxed">
            {description}
          </p>
        )}
      </div>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-[var(--erpfy-brand)]/30 ${
          checked ? 'bg-[var(--erpfy-brand)]' : 'bg-neutral-300'
        }`}
      >
        <span
          className={`pointer-events-none inline-block size-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
            checked ? 'translate-x-5' : 'translate-x-0'
          }`}
        />
      </button>
    </div>
  );
}

export function SalesSettingsPanels({
  section,
  settings,
  onChange,
  onSave,
}: {
  section: string;
  settings: AccountSystemSettings;
  onChange: (settings: AccountSystemSettings) => void;
  onSave?: () => void;
}) {
  const update = <K extends keyof AccountSystemSettings>(
    key: K,
    value: AccountSystemSettings[K],
  ) => onChange({ ...settings, [key]: value });

  // Accordion states for Invoice PDF
  const [openColors, setOpenColors] = useState(true);
  const [openTypography, setOpenTypography] = useState(true);
  const [openLayout, setOpenLayout] = useState(true);
  const [openDetails, setOpenDetails] = useState(false);

  // 1. Sales Defaults (Matching Stocky with ERPFY Theme)
  if (section === 'sales-defaults') {
    return (
      <div className="space-y-5">
        <ErpfyPanel
          title="Defaults"
          description="Preselected values for new sales, purchases and the POS."
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label
                htmlFor="sales-default-customer"
                className="mb-1.5 block text-xs font-semibold text-[var(--erpfy-ink)]"
              >
                Default Customer
              </label>
              <ErpfySelect
                id="sales-default-customer"
                value={settings.salesDefaultCustomer}
                onChange={(e) => update('salesDefaultCustomer', e.target.value)}
              >
                <option value="walk-in-customer">walk-in-customer</option>
                <option value="Walk-in Customer">Walk-in Customer</option>
                <option value="Registered VIP Buyer">Registered VIP Buyer</option>
              </ErpfySelect>
            </div>

            <div>
              <label
                htmlFor="sales-default-warehouse"
                className="mb-1.5 block text-xs font-semibold text-[var(--erpfy-ink)]"
              >
                Default Warehouse
              </label>
              <ErpfySelect
                id="sales-default-warehouse"
                value={settings.salesDefaultWarehouse}
                onChange={(e) => update('salesDefaultWarehouse', e.target.value)}
              >
                <option value="[DEMO] Main Warehouse">[DEMO] Main Warehouse</option>
                <option value="Main Warehouse (London)">Main Warehouse (London)</option>
                <option value="Distribution Hub B">Distribution Hub B</option>
              </ErpfySelect>
            </div>

            <div>
              <label
                htmlFor="sales-default-account"
                className="mb-1.5 block text-xs font-semibold text-[var(--erpfy-ink)]"
              >
                Default Account
              </label>
              <ErpfySelect
                id="sales-default-account"
                value={settings.salesDefaultAccount}
                onChange={(e) => update('salesDefaultAccount', e.target.value)}
              >
                <option value="">Select an account...</option>
                <option value="Main Cash Register">Main Cash Register</option>
                <option value="Operating Bank Account">Operating Bank Account</option>
                <option value="Petty Cash Drawer">Petty Cash Drawer</option>
              </ErpfySelect>
            </div>

            <div>
              <label
                htmlFor="sales-default-payment-method"
                className="mb-1.5 block text-xs font-semibold text-[var(--erpfy-ink)]"
              >
                Default Payment Method
              </label>
              <ErpfySelect
                id="sales-default-payment-method"
                value={settings.salesDefaultPaymentMethod}
                onChange={(e) =>
                  update('salesDefaultPaymentMethod', e.target.value)
                }
              >
                <option value="">Select payment method..</option>
                <option value="Credit Card">Credit Card</option>
                <option value="Cash">Cash</option>
                <option value="Check">Check</option>
                <option value="TPE">TPE</option>
                <option value="Western Union">Western Union</option>
                <option value="bank transfer">bank transfer</option>
                <option value="other">other</option>
                <option value="Wallet">Wallet</option>
              </ErpfySelect>
            </div>

            <div>
              <label
                htmlFor="sales-default-tax-rate"
                className="mb-1.5 block text-xs font-semibold text-[var(--erpfy-ink)]"
              >
                Default Tax
              </label>
              <div className="relative">
                <ErpfyInput
                  id="sales-default-tax-rate"
                  type="number"
                  value={settings.salesDefaultTaxRate}
                  onChange={(e) =>
                    update('salesDefaultTaxRate', Number(e.target.value))
                  }
                  className="pr-8"
                />
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-[var(--erpfy-ink-muted)]">
                  %
                </span>
              </div>
            </div>

            <div>
              <label
                htmlFor="sales-point-rate"
                className="mb-1.5 block text-xs font-semibold text-[var(--erpfy-ink)]"
              >
                Point to amount rate
              </label>
              <ErpfyInput
                id="sales-point-rate"
                type="number"
                step="0.01"
                value={settings.salesPointToAmountRate}
                onChange={(e) =>
                  update('salesPointToAmountRate', Number(e.target.value))
                }
              />
            </div>

            <div>
              <label
                htmlFor="sales-pos-items-count"
                className="mb-1.5 block text-xs font-semibold text-[var(--erpfy-ink)]"
              >
                How many items do you want to display in POS
              </label>
              <ErpfyInput
                id="sales-pos-items-count"
                type="number"
                value={settings.salesPosItemsCount}
                onChange={(e) =>
                  update('salesPosItemsCount', Number(e.target.value))
                }
              />
            </div>
          </div>

          <div className="mt-6 space-y-3.5 border-t border-[var(--erpfy-line-soft)] pt-5">
            <SettingToggleSwitch
              id="feat-quote-stock"
              label="Create Quotation with Stock"
              description="Quotations check available stock when created."
              checked={settings.createQuotationWithStock}
              onChange={(checked) => update('createQuotationWithStock', checked)}
            />

            <SettingToggleSwitch
              id="feat-show-items-tax"
              label="Show Total Items Tax"
              description="Show the total items tax line on POS receipts."
              checked={settings.showTotalItemsTax}
              onChange={(checked) => update('showTotalItemsTax', checked)}
            />
          </div>

          <div className="mt-6">
            <ErpfyButton tone="primary" onClick={onSave} className="px-6 py-2">
              Submit
            </ErpfyButton>
          </div>
        </ErpfyPanel>
      </div>
    );
  }

  // 2. Sales Features (Matching Stocky with ERPFY Theme)
  if (section === 'sales-features') {
    return (
      <div className="space-y-5">
        <ErpfyPanel
          title="Features"
          description="Turn optional capabilities on or off."
        >
          <div className="space-y-3.5">
            {/* 1. 3 Decimal Pricing */}
            <SettingToggleSwitch
              id="feat-3-decimal"
              label="Enable 3 Decimal Pricing"
              description="When enabled, prices, costs, discounts, taxes and POS totals support up to 3 decimal places (e.g. 0.065) instead of being rounded to 2."
              checked={settings.enable3DecimalPricing}
              onChange={(checked) => update('enable3DecimalPricing', checked)}
            />

            {/* 2. Enable Kitchen Display */}
            <SettingToggleSwitch
              id="feat-kds"
              label="Enable Kitchen Display"
              description="When enabled, the POS shows kitchen routing options (Send to Kitchen / Save Without Sending / Send Later) and the Kitchen Display page becomes available to staff."
              checked={settings.enableKitchenDisplay}
              onChange={(checked) => update('enableKitchenDisplay', checked)}
            />

            {/* 3. Preparation target (minutes) */}
            <div className="rounded-xl border border-[var(--erpfy-line-soft)] p-3.5">
              <div className="max-w-md">
                <label
                  htmlFor="kds-prep-target"
                  className="block text-sm font-semibold text-[var(--erpfy-ink)]"
                >
                  Preparation target (minutes)
                </label>
                <p className="mt-0.5 mb-2 text-xs text-[var(--erpfy-ink-muted)] leading-relaxed">
                  Tickets past half this time turn amber on the Kitchen Display;
                  past the full time they turn red, pulse and jump to the top of
                  their lane. Leave empty to disable.
                </p>
                <ErpfyInput
                  id="kds-prep-target"
                  type="number"
                  placeholder="e.g. 15"
                  value={settings.preparationTargetMinutes || ''}
                  onChange={(e) =>
                    update('preparationTargetMinutes', Number(e.target.value))
                  }
                />
              </div>
            </div>

            {/* 4. Auto-send confirmed online orders */}
            <SettingToggleSwitch
              id="feat-kds-auto"
              label="Auto-send confirmed online orders to the kitchen"
              description="When an online store order is confirmed, a kitchen ticket is created automatically for it."
              checked={settings.autoSendKitchenOrders}
              onChange={(checked) => update('autoSendKitchenOrders', checked)}
            />

            {/* 5. Show Barcode */}
            <SettingToggleSwitch
              id="feat-barcode"
              label="Show Barcode (GTIN, UPC, EAN, ISBN)"
              description="When enabled, the Barcode (GTIN / UPC / EAN / ISBN) field is shown on the product create form. Turn off to hide it."
              checked={settings.showBarcodeFields}
              onChange={(checked) => update('showBarcodeFields', checked)}
            />

            {/* 6. Resize Product Images */}
            <SettingToggleSwitch
              id="feat-resize-images"
              label="Resize Product Images"
              description="Downscale product, variant and gallery images when they are saved. Turn this off to store the uploaded files at their original resolution (larger files, slower pages)."
              checked={settings.resizeProductImages}
              onChange={(checked) =>
                update('resizeProductImages', checked)
              }
            />

            {/* 7. Product Image Max Size */}
            <div className="rounded-xl border border-[var(--erpfy-line-soft)] p-3.5">
              <div className="max-w-md">
                <label
                  htmlFor="product-img-max-size"
                  className="block text-sm font-semibold text-[var(--erpfy-ink)]"
                >
                  Product Image Max Size
                </label>
                <p className="mt-0.5 mb-2 text-xs text-[var(--erpfy-ink-muted)] leading-relaxed">
                  Longest edge, in pixels, that saved product images are fitted
                  into. Aspect ratio is kept and smaller images are never
                  enlarged.
                </p>
                <div className="relative">
                  <ErpfyInput
                    id="product-img-max-size"
                    type="number"
                    value={settings.productImageMaxSize}
                    onChange={(e) =>
                      update('productImageMaxSize', Number(e.target.value))
                    }
                    className="pr-10"
                  />
                  <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-[var(--erpfy-ink-muted)]">
                    px
                  </span>
                </div>
              </div>
            </div>

            {/* 8. Track Serial Number / IMEI */}
            <SettingToggleSwitch
              id="feat-serial-imei"
              label="Track Serial Number / IMEI"
              description="When enabled, each unit of this product requires a unique serial number / IMEI captured at purchase and selected at sale."
              checked={settings.trackSerialNumberImei}
              onChange={(checked) =>
                update('trackSerialNumberImei', checked)
              }
            />

            {/* Additional operational capabilities */}
            <SettingToggleSwitch
              id="feat-multipack"
              label="Multi-Pack & Bundle Selling"
              description="Sell single items in packs, boxes, and bulk cartons with automatic stock deduction."
              checked={settings.enableMultiPackSelling}
              onChange={(checked) => update('enableMultiPackSelling', checked)}
            />

            <SettingToggleSwitch
              id="feat-wholesale"
              label="Wholesale Tiered Pricing"
              description="Apply automatic volume discounts when quantity thresholds are reached."
              checked={settings.wholesalePricingByQuantity}
              onChange={(checked) => update('wholesalePricingByQuantity', checked)}
            />

            <SettingToggleSwitch
              id="feat-multicurrency"
              label="Multi-Currency Transactions"
              description="Allow receiving payments and issuing invoices in secondary international currencies."
              checked={settings.enableMultiCurrency}
              onChange={(checked) => update('enableMultiCurrency', checked)}
            />

            <SettingToggleSwitch
              id="feat-salesperson"
              label="Salesperson Attribution"
              description="Allow cashiers to assign specific commission agents or sales staff per invoice."
              checked={settings.changeSalespersonCheckout}
              onChange={(checked) => update('changeSalespersonCheckout', checked)}
            />

            <SettingToggleSwitch
              id="feat-journals"
              label="Automatic Journal Entries"
              description="Automatically post double-entry general ledger records for sales, costs, and tax."
              checked={settings.automaticJournalEntries}
              onChange={(checked) => update('automaticJournalEntries', checked)}
            />

            <SettingToggleSwitch
              id="feat-oversell"
              label="Allow Negative Stock (Overselling)"
              description="Permit sales transactions even when item on-hand inventory reaches zero."
              checked={settings.allowOverselling}
              onChange={(checked) => update('allowOverselling', checked)}
            />
          </div>

          <div className="mt-6">
            <ErpfyButton tone="primary" onClick={onSave} className="px-6 py-2">
              Submit
            </ErpfyButton>
          </div>
        </ErpfyPanel>
      </div>
    );
  }

  // 3. Prefixes (Matching Stocky with ERPFY Theme)
  if (section === 'prefixes') {
    return (
      <div className="space-y-5">
        <ErpfyPanel
          title="Prefixes"
          description="Reference-number prefixes for each document type."
        >
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <label
                htmlFor="prefix-sales"
                className="mb-1.5 block text-xs font-semibold text-[var(--erpfy-ink)]"
              >
                Sales
              </label>
              <ErpfyInput
                id="prefix-sales"
                value={settings.prefixSales}
                onChange={(e) => update('prefixSales', e.target.value)}
              />
            </div>

            <div>
              <label
                htmlFor="prefix-purchases"
                className="mb-1.5 block text-xs font-semibold text-[var(--erpfy-ink)]"
              >
                Purchases
              </label>
              <ErpfyInput
                id="prefix-purchases"
                value={settings.prefixPurchases}
                onChange={(e) => update('prefixPurchases', e.target.value)}
              />
            </div>

            <div>
              <label
                htmlFor="prefix-quotations"
                className="mb-1.5 block text-xs font-semibold text-[var(--erpfy-ink)]"
              >
                Quotations
              </label>
              <ErpfyInput
                id="prefix-quotations"
                value={settings.prefixQuotations}
                onChange={(e) => update('prefixQuotations', e.target.value)}
              />
            </div>

            <div>
              <label
                htmlFor="prefix-adjustment"
                className="mb-1.5 block text-xs font-semibold text-[var(--erpfy-ink)]"
              >
                Adjustment
              </label>
              <ErpfyInput
                id="prefix-adjustment"
                value={settings.prefixAdjustment}
                onChange={(e) => update('prefixAdjustment', e.target.value)}
              />
            </div>

            <div>
              <label
                htmlFor="prefix-transfer"
                className="mb-1.5 block text-xs font-semibold text-[var(--erpfy-ink)]"
              >
                Transfer
              </label>
              <ErpfyInput
                id="prefix-transfer"
                value={settings.prefixTransfer}
                onChange={(e) => update('prefixTransfer', e.target.value)}
              />
            </div>

            <div>
              <label
                htmlFor="prefix-sales-return"
                className="mb-1.5 block text-xs font-semibold text-[var(--erpfy-ink)]"
              >
                Sales Return
              </label>
              <ErpfyInput
                id="prefix-sales-return"
                value={settings.prefixSalesReturn}
                onChange={(e) => update('prefixSalesReturn', e.target.value)}
              />
            </div>

            <div>
              <label
                htmlFor="prefix-purchases-return"
                className="mb-1.5 block text-xs font-semibold text-[var(--erpfy-ink)]"
              >
                Purchases Return
              </label>
              <ErpfyInput
                id="prefix-purchases-return"
                value={settings.prefixPurchasesReturn}
                onChange={(e) => update('prefixPurchasesReturn', e.target.value)}
              />
            </div>
          </div>

          <div className="mt-6">
            <ErpfyButton tone="primary" onClick={onSave} className="px-6 py-2">
              Submit
            </ErpfyButton>
          </div>
        </ErpfyPanel>
      </div>
    );
  }

  // 4. Invoice PDF (Matching Stocky with ERPFY Theme)
  if (section === 'invoice-pdf') {
    const activeTab = settings.activePdfTab || 'sales-invoice';
    const docTitle =
      activeTab === 'sales-invoice'
        ? 'SALES INVOICE'
        : activeTab === 'quotation'
          ? 'QUOTATION'
          : 'PURCHASE ORDER';
    const docRef =
      activeTab === 'sales-invoice'
        ? `${settings.prefixSales}-2041`
        : activeTab === 'quotation'
          ? `${settings.prefixQuotations}-1084`
          : `${settings.prefixPurchases}-0521`;

    const primaryColor = settings.pdfPrimaryColor || '#1e5631';
    const secondaryColor = settings.pdfSecondaryColor || '#2e7d32';
    const textColor = settings.pdfTextColor || '#0f172a';
    const bgColor = settings.pdfBackgroundColor || '#ffffff';

    const handleReset = () => {
      onChange({
        ...settings,
        pdfPrimaryColor: '#1e5631',
        pdfSecondaryColor: '#2e7d32',
        pdfTextColor: '#0f172a',
        pdfBackgroundColor: '#ffffff',
        pdfFontFamily: 'DejaVu Sans',
        pdfFontSize: 9,
        pdfTopBottomMargin: 10,
        pdfLeftRightMargin: 15,
        invoiceShowLogo: true,
      });
    };

    return (
      <div className="space-y-5">
        <div className="erpfy-card p-5">
          {/* Header & Action buttons */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-[var(--erpfy-line-soft)] pb-4">
            <div>
              <h2 className="text-lg font-bold text-[var(--erpfy-ink)]">
                Invoice PDF
              </h2>
              <p className="text-xs text-[var(--erpfy-ink-muted)]">
                Customize the PDF templates — colors, fonts, layout, sections
                and labels — with a live preview.
              </p>
            </div>
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={handleReset}
                className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--erpfy-line-soft)] bg-white px-3 py-1.5 text-xs font-semibold text-[var(--erpfy-ink)] hover:bg-neutral-50 shadow-2xs transition-colors"
              >
                <RotateCcw className="size-3.5 text-[var(--erpfy-ink-muted)]" />
                Reset to default
              </button>
            </div>
          </div>

          {/* Sub-tabs */}
          <div className="mt-4 flex items-center gap-1.5 border-b border-[var(--erpfy-line-soft)] pb-2 text-xs font-semibold">
            <button
              type="button"
              onClick={() => update('activePdfTab', 'sales-invoice')}
              className={`rounded-lg px-3 py-1.5 transition-colors ${
                activeTab === 'sales-invoice'
                  ? 'bg-[var(--erpfy-brand-soft)] text-[var(--erpfy-brand)] font-bold'
                  : 'text-[var(--erpfy-ink-muted)] hover:text-[var(--erpfy-ink)] hover:bg-neutral-100'
              }`}
            >
              Sales Invoice
            </button>
            <button
              type="button"
              onClick={() => update('activePdfTab', 'quotation')}
              className={`rounded-lg px-3 py-1.5 transition-colors ${
                activeTab === 'quotation'
                  ? 'bg-[var(--erpfy-brand-soft)] text-[var(--erpfy-brand)] font-bold'
                  : 'text-[var(--erpfy-ink-muted)] hover:text-[var(--erpfy-ink)] hover:bg-neutral-100'
              }`}
            >
              Quotation
            </button>
            <button
              type="button"
              onClick={() => update('activePdfTab', 'purchase')}
              className={`rounded-lg px-3 py-1.5 transition-colors ${
                activeTab === 'purchase'
                  ? 'bg-[var(--erpfy-brand-soft)] text-[var(--erpfy-brand)] font-bold'
                  : 'text-[var(--erpfy-ink-muted)] hover:text-[var(--erpfy-ink)] hover:bg-neutral-100'
              }`}
            >
              Purchase
            </button>
          </div>

          {/* Split Two-Column Layout */}
          <div className="mt-5 grid items-start gap-6 lg:grid-cols-[380px_minmax(0,1fr)]">
            {/* Left Controls Accordion */}
            <div className="space-y-3">
              {/* Accordion: Colors */}
              <div className="rounded-xl border border-[var(--erpfy-line-soft)] bg-white overflow-hidden">
                <button
                  type="button"
                  onClick={() => setOpenColors(!openColors)}
                  className="flex w-full items-center justify-between p-3.5 text-left text-xs font-bold uppercase tracking-wider text-[var(--erpfy-ink)] hover:bg-neutral-50"
                >
                  <span className="flex items-center gap-2">
                    {openColors ? (
                      <ChevronDown className="size-4 text-[var(--erpfy-ink-muted)]" />
                    ) : (
                      <ChevronRight className="size-4 text-[var(--erpfy-ink-muted)]" />
                    )}
                    Colors
                  </span>
                </button>
                {openColors && (
                  <div className="space-y-3 border-t border-[var(--erpfy-line-soft)] p-3.5 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-[var(--erpfy-ink)] font-medium">
                        Primary color
                      </span>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={primaryColor}
                          onChange={(e) =>
                            update('pdfPrimaryColor', e.target.value)
                          }
                          className="size-7 cursor-pointer rounded border border-neutral-300 p-0.5"
                        />
                        <span className="w-16 font-mono text-[11px] text-[var(--erpfy-ink-muted)]">
                          {primaryColor}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-[var(--erpfy-ink)] font-medium">
                        Secondary color
                      </span>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={secondaryColor}
                          onChange={(e) =>
                            update('pdfSecondaryColor', e.target.value)
                          }
                          className="size-7 cursor-pointer rounded border border-neutral-300 p-0.5"
                        />
                        <span className="w-16 font-mono text-[11px] text-[var(--erpfy-ink-muted)]">
                          {secondaryColor}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-[var(--erpfy-ink)] font-medium">Text color</span>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={textColor}
                          onChange={(e) =>
                            update('pdfTextColor', e.target.value)
                          }
                          className="size-7 cursor-pointer rounded border border-neutral-300 p-0.5"
                        />
                        <span className="w-16 font-mono text-[11px] text-[var(--erpfy-ink-muted)]">
                          {textColor}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-[var(--erpfy-ink)] font-medium">
                        Background color
                      </span>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={bgColor}
                          onChange={(e) =>
                            update('pdfBackgroundColor', e.target.value)
                          }
                          className="size-7 cursor-pointer rounded border border-neutral-300 p-0.5"
                        />
                        <span className="w-16 font-mono text-[11px] text-[var(--erpfy-ink-muted)]">
                          {bgColor}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Accordion: Typography */}
              <div className="rounded-xl border border-[var(--erpfy-line-soft)] bg-white overflow-hidden">
                <button
                  type="button"
                  onClick={() => setOpenTypography(!openTypography)}
                  className="flex w-full items-center justify-between p-3.5 text-left text-xs font-bold uppercase tracking-wider text-[var(--erpfy-ink)] hover:bg-neutral-50"
                >
                  <span className="flex items-center gap-2">
                    {openTypography ? (
                      <ChevronDown className="size-4 text-[var(--erpfy-ink-muted)]" />
                    ) : (
                      <ChevronRight className="size-4 text-[var(--erpfy-ink-muted)]" />
                    )}
                    Typography
                  </span>
                </button>
                {openTypography && (
                  <div className="space-y-3.5 border-t border-[var(--erpfy-line-soft)] p-3.5 text-xs">
                    <div>
                      <label
                        htmlFor="pdf-font-family"
                        className="mb-1 block font-semibold text-[var(--erpfy-ink)]"
                      >
                        Font family
                      </label>
                      <ErpfySelect
                        id="pdf-font-family"
                        value={settings.pdfFontFamily}
                        onChange={(e) => update('pdfFontFamily', e.target.value)}
                      >
                        <option value="DejaVu Sans">DejaVu Sans</option>
                        <option value="Inter">Inter</option>
                        <option value="Helvetica">Helvetica / Arial</option>
                        <option value="Courier">Courier Mono</option>
                      </ErpfySelect>
                    </div>

                    <div>
                      <label
                        htmlFor="pdf-font-size"
                        className="mb-1 block font-semibold text-[var(--erpfy-ink)]"
                      >
                        Font size (pt)
                      </label>
                      <ErpfyInput
                        id="pdf-font-size"
                        type="number"
                        value={settings.pdfFontSize}
                        onChange={(e) =>
                          update('pdfFontSize', Number(e.target.value))
                        }
                      />
                    </div>

                    <div className="flex items-start gap-2 rounded-lg bg-[var(--erpfy-brand-soft)] p-2.5 text-[var(--erpfy-brand)] border border-[var(--erpfy-brand)]/20">
                      <Info className="size-4 shrink-0 mt-0.5" />
                      <p className="text-[11px] leading-relaxed">
                        PDF fonts are limited to the families the PDF engine
                        embeds (DejaVu has full Arabic support).
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Accordion: Layout & logo */}
              <div className="rounded-xl border border-[var(--erpfy-line-soft)] bg-white overflow-hidden">
                <button
                  type="button"
                  onClick={() => setOpenLayout(!openLayout)}
                  className="flex w-full items-center justify-between p-3.5 text-left text-xs font-bold uppercase tracking-wider text-[var(--erpfy-ink)] hover:bg-neutral-50"
                >
                  <span className="flex items-center gap-2">
                    {openLayout ? (
                      <ChevronDown className="size-4 text-[var(--erpfy-ink-muted)]" />
                    ) : (
                      <ChevronRight className="size-4 text-[var(--erpfy-ink-muted)]" />
                    )}
                    Layout & logo
                  </span>
                </button>
                {openLayout && (
                  <div className="space-y-3.5 border-t border-[var(--erpfy-line-soft)] p-3.5 text-xs">
                    <div>
                      <label
                        htmlFor="pdf-tb-margin"
                        className="mb-1 block font-semibold text-[var(--erpfy-ink)]"
                      >
                        Top/bottom margin (mm)
                      </label>
                      <ErpfyInput
                        id="pdf-tb-margin"
                        type="number"
                        value={settings.pdfTopBottomMargin}
                        onChange={(e) =>
                          update('pdfTopBottomMargin', Number(e.target.value))
                        }
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="pdf-lr-margin"
                        className="mb-1 block font-semibold text-[var(--erpfy-ink)]"
                      >
                        Left/right margin (mm)
                      </label>
                      <ErpfyInput
                        id="pdf-lr-margin"
                        type="number"
                        value={settings.pdfLeftRightMargin}
                        onChange={(e) =>
                          update('pdfLeftRightMargin', Number(e.target.value))
                        }
                      />
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <span className="font-semibold text-[var(--erpfy-ink)]">
                        Show logo
                      </span>
                      <button
                        type="button"
                        role="switch"
                        aria-label="Show logo"
                        aria-checked={settings.invoiceShowLogo}
                        onClick={() =>
                          update('invoiceShowLogo', !settings.invoiceShowLogo)
                        }
                        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-[var(--erpfy-brand)]/30 ${
                          settings.invoiceShowLogo ? 'bg-[var(--erpfy-brand)]' : 'bg-neutral-300'
                        }`}
                      >
                        <span
                          className={`pointer-events-none inline-block size-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                            settings.invoiceShowLogo ? 'translate-x-5' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Accordion: Terms & Notes */}
              <div className="rounded-xl border border-[var(--erpfy-line-soft)] bg-white overflow-hidden">
                <button
                  type="button"
                  onClick={() => setOpenDetails(!openDetails)}
                  className="flex w-full items-center justify-between p-3.5 text-left text-xs font-bold uppercase tracking-wider text-[var(--erpfy-ink)] hover:bg-neutral-50"
                >
                  <span className="flex items-center gap-2">
                    {openDetails ? (
                      <ChevronDown className="size-4 text-[var(--erpfy-ink-muted)]" />
                    ) : (
                      <ChevronRight className="size-4 text-[var(--erpfy-ink-muted)]" />
                    )}
                    Document Details & Notes
                  </span>
                </button>
                {openDetails && (
                  <div className="space-y-3.5 border-t border-[var(--erpfy-line-soft)] p-3.5 text-xs">
                    <div>
                      <label
                        htmlFor="invoice-thankyou"
                        className="mb-1 block font-semibold text-[var(--erpfy-ink)]"
                      >
                        Thank You Note
                      </label>
                      <ErpfyInput
                        id="invoice-thankyou"
                        value={settings.invoiceThankYouNote}
                        onChange={(e) =>
                          update('invoiceThankYouNote', e.target.value)
                        }
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="invoice-terms"
                        className="mb-1 block font-semibold text-[var(--erpfy-ink)]"
                      >
                        Terms & Conditions
                      </label>
                      <ErpfyTextarea
                        id="invoice-terms"
                        rows={3}
                        value={settings.invoiceTerms}
                        onChange={(e) => update('invoiceTerms', e.target.value)}
                      />
                    </div>
                  </div>
                )}

                {onSave && (
                  <div className="pt-2">
                    <ErpfyButton tone="primary" onClick={onSave}>
                      Submit
                    </ErpfyButton>
                  </div>
                )}
              </div>
            </div>

            {/* Right Live Preview (Themed to User's Brand) */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-xs font-semibold text-[var(--erpfy-ink-muted)]">
                <Eye className="size-4" />
                <span>Live preview — updates as you edit</span>
              </div>

              {/* Rendered Invoice Paper Container */}
              <div
                className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm transition-all"
                style={{
                  fontFamily:
                    settings.pdfFontFamily === 'DejaVu Sans'
                      ? 'sans-serif'
                      : settings.pdfFontFamily,
                  fontSize: `${settings.pdfFontSize}pt`,
                  backgroundColor: bgColor,
                  color: textColor,
                  paddingTop: `${Math.max(12, settings.pdfTopBottomMargin * 1.5)}px`,
                  paddingBottom: `${Math.max(12, settings.pdfTopBottomMargin * 1.5)}px`,
                  paddingLeft: `${Math.max(16, settings.pdfLeftRightMargin * 1.5)}px`,
                  paddingRight: `${Math.max(16, settings.pdfLeftRightMargin * 1.5)}px`,
                }}
              >
                {/* Document Top Header */}
                <div className="flex items-start justify-between">
                  {settings.invoiceShowLogo ? (
                    <div className="grid h-10 w-20 place-items-center rounded border border-dashed border-neutral-300 bg-neutral-50 text-[11px] font-bold tracking-widest text-neutral-400">
                      LOGO
                    </div>
                  ) : (
                    <div />
                  )}

                  <div className="text-right">
                    <h3
                      className="text-lg font-black tracking-tight"
                      style={{ color: primaryColor }}
                    >
                      {docTitle}
                    </h3>
                    <p className="mt-0.5 text-[11px] font-mono text-neutral-500">
                      {docRef}
                    </p>
                    <div className="mt-1 flex items-center justify-end gap-1.5">
                      <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[9px] font-extrabold uppercase text-emerald-800">
                        COMPLETED
                      </span>
                      <span className="rounded bg-blue-100 px-1.5 py-0.5 text-[9px] font-extrabold uppercase text-blue-800">
                        PARTIAL
                      </span>
                    </div>
                  </div>
                </div>

                {/* Banner Info Bars: BILL TO & FROM */}
                <div className="mt-5 grid grid-cols-2 gap-3 text-[10.5px]">
                  {/* BILL TO */}
                  <div className="overflow-hidden rounded border border-neutral-200">
                    <div
                      className="px-2.5 py-1 font-bold uppercase tracking-wider text-white"
                      style={{ backgroundColor: primaryColor }}
                    >
                      BILL TO
                    </div>
                    <div className="space-y-0.5 bg-neutral-50/50 p-2.5 text-neutral-700">
                      <p className="font-bold text-neutral-900">Sarah Miller</p>
                      <p>+212 600-000-000 · sarah@mail.com</p>
                      <p>12 Market Street, Casablanca</p>
                    </div>
                  </div>

                  {/* FROM */}
                  <div className="overflow-hidden rounded border border-neutral-200">
                    <div
                      className="px-2.5 py-1 font-bold uppercase tracking-wider text-white"
                      style={{ backgroundColor: primaryColor }}
                    >
                      FROM
                    </div>
                    <div className="space-y-0.5 bg-neutral-50/50 p-2.5 text-neutral-700">
                      <p className="font-bold text-neutral-900">Lahore Auto Parts</p>
                      <p>+92 300-000-0000 · info@company.com</p>
                      <p>1 Business Avenue</p>
                    </div>
                  </div>
                </div>

                {/* Items Table */}
                <div className="mt-5 overflow-hidden rounded border border-neutral-200">
                  <table className="w-full text-left text-[11px]">
                    <thead>
                      <tr
                        className="font-bold uppercase tracking-wider text-white"
                        style={{ backgroundColor: primaryColor }}
                      >
                        <th className="p-2">PRODUCT</th>
                        <th className="p-2 text-right">PRICE</th>
                        <th className="p-2 text-right">QTY</th>
                        <th className="p-2 text-right">TOTAL</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100 bg-white">
                      <tr>
                        <td className="p-2 font-medium text-neutral-900">
                          Wireless Earbuds Pro
                        </td>
                        <td className="p-2 text-right font-mono">240.00</td>
                        <td className="p-2 text-right font-mono">2</td>
                        <td className="p-2 text-right font-mono font-semibold">
                          480.00
                        </td>
                      </tr>
                      <tr>
                        <td className="p-2 font-medium text-neutral-900">
                          Smart Watch S9
                        </td>
                        <td className="p-2 text-right font-mono">640.00</td>
                        <td className="p-2 text-right font-mono">1</td>
                        <td className="p-2 text-right font-mono font-semibold">
                          640.00
                        </td>
                      </tr>
                      <tr>
                        <td className="p-2 font-medium text-neutral-900">
                          Organic Coffee 1kg
                        </td>
                        <td className="p-2 text-right font-mono">80.00</td>
                        <td className="p-2 text-right font-mono">8</td>
                        <td className="p-2 text-right font-mono font-semibold">
                          640.00
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Totals Summary */}
                <div className="mt-3 flex justify-end text-[11px]">
                  <div className="w-56 space-y-1 rounded border border-neutral-100 bg-neutral-50/60 p-2.5">
                    <div className="flex justify-between text-neutral-600">
                      <span>Subtotal</span>
                      <span className="font-mono font-semibold">1,760.00</span>
                    </div>
                    <div className="flex justify-between text-neutral-600">
                      <span>Tax</span>
                      <span className="font-mono font-semibold">176.00</span>
                    </div>
                    <div
                      className="flex justify-between border-t border-neutral-200 pt-1 font-bold"
                      style={{ color: primaryColor }}
                    >
                      <span>TOTAL</span>
                      <span className="font-mono">1,936.00</span>
                    </div>
                  </div>
                </div>

                {/* Notes box */}
                <div className="mt-4 rounded border-l-2 border-neutral-300 bg-neutral-50 p-2.5 text-[10.5px] text-neutral-600">
                  <p className="font-bold text-neutral-800">Notes:</p>
                  <p>Deliver before Friday. Handle with care.</p>
                </div>

                {/* Footer terms & Thank you */}
                <div className="mt-5 border-t border-neutral-200 pt-3 text-center text-[10px] text-neutral-500">
                  <p>Goods sold are not returnable after 7 days.</p>
                  <p
                    className="mt-0.5 font-semibold"
                    style={{ color: primaryColor }}
                  >
                    Thank you for your business!
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 5. Pharmacy
  if (section === 'pharmacy') {
    return (
      <div className="space-y-4">
        <ErpfyPanel
          title="Pharmacy & Regulated Goods Management"
          description="Enforce healthcare compliance, lot/batch tracking, expiry date monitoring, and prescription auditing."
        >
          <div className="space-y-3.5">
            <SettingToggleSwitch
              id="pharm-batch"
              label="Enforce Lot & Batch Tracking"
              description="Require batch identification on supplier intake, stock adjustment, and customer sales."
              checked={settings.pharmacyBatchTracking}
              onChange={(checked) => update('pharmacyBatchTracking', checked)}
            />

            <SettingToggleSwitch
              id="pharm-expiry"
              label="Track Expiry Dates"
              description="Block near-expiry products from being dispensed or sold past safety guidelines."
              checked={settings.pharmacyExpiryTracking}
              onChange={(checked) => update('pharmacyExpiryTracking', checked)}
            />

            <SettingToggleSwitch
              id="pharm-rx"
              label="Prescription Validation"
              description="Prompt cashier for Rx prescription number before finalizing schedule drugs."
              checked={settings.pharmacyRequirePrescription}
              onChange={(checked) => update('pharmacyRequirePrescription', checked)}
            />

            <SettingToggleSwitch
              id="pharm-doc"
              label="Record Prescribing Doctor Info"
              description="Log prescribing physician name and medical license ID in sales records."
              checked={settings.pharmacyDoctorInfoRequired}
              onChange={(checked) => update('pharmacyDoctorInfoRequired', checked)}
            />
          </div>

          <div className="mt-4 border-t border-[var(--erpfy-line-soft)] pt-4">
            <div className="max-w-xs">
              <label
                htmlFor="pharm-alert-days"
                className="mb-1.5 block text-xs font-semibold text-[var(--erpfy-ink)]"
              >
                Expiry Alert Warning (Days)
              </label>
              <ErpfyInput
                id="pharm-alert-days"
                type="number"
                value={settings.pharmacyExpiryAlertDays}
                onChange={(e) =>
                  update('pharmacyExpiryAlertDays', Number(e.target.value))
                }
              />
              <p className="mt-1 text-[11px] text-[var(--erpfy-ink-muted)]">
                Flag stock in red on dashboard when expiration is within this threshold.
              </p>
            </div>
          </div>

          <div className="mt-6">
            <ErpfyButton tone="primary" onClick={onSave} className="px-6 py-2">
              Submit
            </ErpfyButton>
          </div>
        </ErpfyPanel>
      </div>
    );
  }

  return null;
}
