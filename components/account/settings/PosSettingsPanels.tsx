'use client';

import { useState } from 'react';
import { AlertCircle, Wifi } from 'lucide-react';

import type { AccountSystemSettings } from '@/lib/account-system-settings';
import {
  ErpfyButton,
  ErpfyCheckbox,
  ErpfyInput,
  ErpfyPanel,
  ErpfySelect,
  ErpfyTextarea,
} from '@/lib/design-system';

export function PosSettingsPanels({
  section,
  settings,
  onChange,
}: {
  section: string;
  settings: AccountSystemSettings;
  onChange: (settings: AccountSystemSettings) => void;
}) {
  const [printStatus, setPrintStatus] = useState<string | null>(null);

  const update = <K extends keyof AccountSystemSettings>(
    key: K,
    value: AccountSystemSettings[K],
  ) => onChange({ ...settings, [key]: value });

  function testPrinterConnection() {
    setPrintStatus(
      'Printer service not configured. No network printer bridge is active in this browser environment.',
    );
  }

  // 1. POS Settings
  if (section === 'pos-settings') {
    return (
      <div className="space-y-4">
        <ErpfyPanel
          title="Point of Sale Configuration"
          description="Configure barcode scanning hardware, audio feedback, cash drawer relays, and offline terminal behavior."
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-[var(--erpfy-line-soft)] p-3">
              <ErpfyCheckbox
                id="pos-beep"
                checked={settings.posSoundBeep}
                label="Audio Feedback on Scan"
                description="Play an audible chime when barcode scanner successfully recognizes an item."
                onChange={(e) => update('posSoundBeep', e.target.checked)}
              />
            </div>
            <div className="rounded-xl border border-[var(--erpfy-line-soft)] p-3">
              <ErpfyCheckbox
                id="pos-autoprint"
                checked={settings.posAutoPrintReceipt}
                label="Auto Print Receipt on Sale"
                description="Immediately trigger thermal printer when payment is completed."
                onChange={(e) =>
                  update('posAutoPrintReceipt', e.target.checked)
                }
              />
            </div>
            <div className="rounded-xl border border-[var(--erpfy-line-soft)] p-3">
              <ErpfyCheckbox
                id="pos-offline"
                checked={settings.posOfflineSync}
                label="Offline Mode & IndexedDB Cache"
                description="Allow ringing up sales when internet drops; automatically sync queue upon reconnection."
                onChange={(e) => update('posOfflineSync', e.target.checked)}
              />
            </div>
          </div>

          <div className="mt-4 grid gap-4 border-t border-[var(--erpfy-line-soft)] pt-4 sm:grid-cols-2">
            <ErpfySelect
              id="pos-scanner-mode"
              label="Barcode Scanner Mode"
              value={settings.posBarcodeScannerMode}
              onChange={(e) =>
                update(
                  'posBarcodeScannerMode',
                  e.target
                    .value as AccountSystemSettings['posBarcodeScannerMode'],
                )
              }
            >
              <option value="automatic">
                Automatic (Auto-add immediately to cart)
              </option>
              <option value="manual">
                Manual (Prompt for quantity verification)
              </option>
            </ErpfySelect>
            <ErpfyInput
              id="pos-default-cust"
              label="Default POS Customer"
              value={settings.posDefaultCustomer}
              onChange={(e) => update('posDefaultCustomer', e.target.value)}
            />
            <div className="sm:col-span-2">
              <ErpfyInput
                id="pos-drawer-cmd"
                label="Cash Drawer Kick-Out Command (Hex / ESC/POS)"
                value={settings.posCashDrawerCommand}
                onChange={(e) => update('posCashDrawerCommand', e.target.value)}
                hint="Standard Epson/Star code: ESC p 0 25 250 (ASCII: 27, 112, 0, 25, 250)"
              />
            </div>
          </div>
        </ErpfyPanel>
      </div>
    );
  }

  // 2. POS Receipt
  if (section === 'pos-receipt') {
    return (
      <div className="space-y-4">
        <ErpfyPanel
          title="Thermal POS Receipt"
          description="Design the layout, store metadata, return policy terms, and barcode printed on 58mm or 80mm roll paper."
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <ErpfySelect
              id="receipt-width"
              label="Thermal Paper Roll Width"
              value={settings.receiptPaperWidth}
              onChange={(e) =>
                update(
                  'receiptPaperWidth',
                  e.target.value as AccountSystemSettings['receiptPaperWidth'],
                )
              }
            >
              <option value="80mm">Standard 80mm (Wide Receipt)</option>
              <option value="58mm">
                Compact 58mm (Mobile POS / Taxi Roll)
              </option>
            </ErpfySelect>
            <ErpfyInput
              id="receipt-store"
              label="Header Store Name"
              value={settings.receiptStoreName}
              onChange={(e) => update('receiptStoreName', e.target.value)}
            />
            <ErpfyInput
              id="receipt-phone"
              label="Store Contact Phone"
              value={settings.receiptPhone}
              onChange={(e) => update('receiptPhone', e.target.value)}
            />
            <ErpfyInput
              id="receipt-vat"
              label="VAT / Tax Registration Number"
              value={settings.receiptVatNumber}
              onChange={(e) => update('receiptVatNumber', e.target.value)}
            />
            <div className="sm:col-span-2">
              <ErpfyInput
                id="receipt-addr"
                label="Store Physical Address"
                value={settings.receiptAddress}
                onChange={(e) => update('receiptAddress', e.target.value)}
              />
            </div>
            <div className="sm:col-span-2">
              <ErpfyTextarea
                id="receipt-footer"
                label="Receipt Footer / Return Policy"
                rows={2}
                value={settings.receiptFooterText}
                onChange={(e) => update('receiptFooterText', e.target.value)}
              />
            </div>
          </div>

          <div className="mt-4 grid gap-3 border-t border-[var(--erpfy-line-soft)] pt-4 sm:grid-cols-2">
            <div className="rounded-xl border border-[var(--erpfy-line-soft)] p-3">
              <ErpfyCheckbox
                id="receipt-tax"
                checked={settings.receiptShowTaxBreakdown}
                label="Itemized Tax Breakdown"
                description="Print line-by-line VAT rate and taxable subtotal before grand total."
                onChange={(e) =>
                  update('receiptShowTaxBreakdown', e.target.checked)
                }
              />
            </div>
            <div className="rounded-xl border border-[var(--erpfy-line-soft)] p-3">
              <ErpfyCheckbox
                id="receipt-barcode"
                checked={settings.receiptShowBarcode}
                label="Print Receipt Barcode / QR Code"
                description="Allow fast returns and lookup by scanning invoice reference directly."
                onChange={(e) => update('receiptShowBarcode', e.target.checked)}
              />
            </div>
          </div>
        </ErpfyPanel>

        {/* Live Thermal Receipt Mockup */}
        <div className="erpfy-card overflow-hidden p-5">
          <p className="mb-3 text-xs font-bold uppercase tracking-wider text-[var(--erpfy-ink-muted)]">
            Thermal Slip Simulation ({settings.receiptPaperWidth})
          </p>
          <div
            className="mx-auto rounded-md border border-neutral-300 bg-white p-5 font-mono text-xs shadow-sm"
            style={{
              maxWidth:
                settings.receiptPaperWidth === '58mm' ? '260px' : '340px',
            }}
          >
            <div className="text-center">
              <p className="font-bold text-sm">{settings.receiptStoreName}</p>
              <p className="text-[11px] text-neutral-600">
                {settings.receiptAddress}
              </p>
              <p className="text-[11px] text-neutral-600">
                Tel: {settings.receiptPhone}
              </p>
              <p className="text-[11px] text-neutral-600">
                Tax ID: {settings.receiptVatNumber}
              </p>
              <p className="my-2 border-b border-dashed border-neutral-400 pb-1 text-[10px]">
                {new Date().toLocaleDateString()}{' '}
                {new Date().toLocaleTimeString()}
              </p>
            </div>
            <div className="my-2 space-y-1">
              <div className="flex justify-between">
                <span>1x Wireless Scanner</span>
                <span>$85.00</span>
              </div>
              <div className="flex justify-between">
                <span>2x POS Thermal Paper</span>
                <span>$18.00</span>
              </div>
            </div>
            <div className="border-t border-dashed border-neutral-400 pt-2 space-y-1">
              <div className="flex justify-between font-bold">
                <span>TOTAL:</span>
                <span>$103.00</span>
              </div>
              <div className="flex justify-between text-[11px] text-neutral-600">
                <span>CASH TENDERED:</span>
                <span>$110.00</span>
              </div>
              <div className="flex justify-between text-[11px] text-neutral-600">
                <span>CHANGE DUE:</span>
                <span>$7.00</span>
              </div>
            </div>
            {settings.receiptShowTaxBreakdown && (
              <p className="mt-2 text-center text-[10px] text-neutral-500 border-t border-dotted pt-1">
                Tax (5%): $5.15 | Net: $97.85
              </p>
            )}
            <div className="mt-4 text-center text-[10px] text-neutral-600 border-t border-dashed pt-2">
              <p>{settings.receiptFooterText}</p>
              {settings.receiptShowBarcode && (
                <div className="my-2 grid place-items-center">
                  <div className="h-6 w-3/4 bg-neutral-800" />
                  <span className="text-[9px]">||| || ||| || |||| |||</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 3. Direct Network Printing
  if (section === 'network-printing') {
    return (
      <div className="space-y-4">
        <ErpfyPanel
          title="Direct ESC/POS Network Printing"
          description="Send print commands directly to Ethernet / Wi-Fi receipt printers via raw TCP sockets without browser print dialogs."
        >
          <div className="rounded-xl border border-[var(--erpfy-line-soft)] p-3 mb-4">
            <ErpfyCheckbox
              id="net-print-enabled"
              checked={settings.networkPrinterEnabled}
              label="Enable Direct Network Printing (Silent Print)"
              description="Bypasses standard operating system dialog and prints tickets directly to the thermal device."
              onChange={(e) =>
                update('networkPrinterEnabled', e.target.checked)
              }
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <ErpfyInput
              id="printer-ip"
              label="Printer IP Address"
              value={settings.networkPrinterIp}
              onChange={(e) => update('networkPrinterIp', e.target.value)}
              hint="e.g. 192.168.1.200 (Static IP)"
            />
            <ErpfyInput
              id="printer-port"
              label="Port"
              type="number"
              value={settings.networkPrinterPort}
              onChange={(e) =>
                update('networkPrinterPort', Number(e.target.value))
              }
              hint="Default RAW port: 9100"
            />
            <ErpfySelect
              id="printer-protocol"
              label="Network Protocol"
              value={settings.networkPrintProtocol}
              onChange={(e) =>
                update(
                  'networkPrintProtocol',
                  e.target
                    .value as AccountSystemSettings['networkPrintProtocol'],
                )
              }
            >
              <option value="raw-tcp">Raw Socket (Port 9100)</option>
              <option value="http">Epson ePOS / Star WebPRNT (HTTP)</option>
              <option value="websocket">Local Print Agent (WebSocket)</option>
            </ErpfySelect>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-[var(--erpfy-line-soft)] pt-4">
            <ErpfyButton
              tone="secondary"
              onClick={testPrinterConnection}
            >
              <Wifi className="size-4" />
              Test Printer Connectivity
            </ErpfyButton>
            {printStatus && (
              <span className="flex items-center gap-1.5 text-xs font-semibold text-[var(--erpfy-ink-muted)]">
                <AlertCircle className="size-4 text-neutral-500" />
                {printStatus}
              </span>
            )}
          </div>
        </ErpfyPanel>
      </div>
    );
  }

  return null;
}
