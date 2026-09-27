'use client';

import { useState, useRef, useEffect, type ChangeEvent, type DragEvent } from 'react';
import {
  X,
  Upload,
  FileCheck2,
  AlertCircle,
  CheckCircle2,
  Package,
  ShieldCheck,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ─── Robust ZIP manifest extractor (pure browser, no external dependencies) ───
// Parses both Central Directory and Local File Headers to extract manifest.json.
// Handles WinRAR, 7-Zip, Windows, macOS, and Linux ZIP formats (STORED and DEFLATE).
async function extractManifestFromZip(buffer: ArrayBuffer): Promise<string> {
  const bytes = new Uint8Array(buffer);
  const view  = new DataView(buffer);

  // Strategy 1: Search for End of Central Directory (EOCD: 0x06054b50)
  let eocdOffset = -1;
  const maxSearch = Math.min(bytes.length, 65536 + 22);
  for (let i = bytes.length - 22; i >= bytes.length - maxSearch; i--) {
    if (
      bytes[i] === 0x50 &&
      bytes[i + 1] === 0x4b &&
      bytes[i + 2] === 0x05 &&
      bytes[i + 3] === 0x06
    ) {
      eocdOffset = i;
      break;
    }
  }

  if (eocdOffset !== -1) {
    const cdOffset = view.getUint32(eocdOffset + 16, true);
    const totalEntries = view.getUint16(eocdOffset + 10, true);

    let cdPos = cdOffset;
    for (let entry = 0; entry < totalEntries && cdPos + 46 <= bytes.length; entry++) {
      const sig = view.getUint32(cdPos, true);
      if (sig !== 0x02014b50) break; // Central directory entry signature

      const method = view.getUint16(cdPos + 10, true);
      const compressedSize = view.getUint32(cdPos + 20, true);
      const fileNameLength = view.getUint16(cdPos + 28, true);
      const extraLength = view.getUint16(cdPos + 30, true);
      const commentLength = view.getUint16(cdPos + 32, true);
      const localHeaderOffset = view.getUint32(cdPos + 42, true);

      const fileNameBytes = bytes.slice(cdPos + 46, cdPos + 46 + fileNameLength);
      const fileName = new TextDecoder().decode(fileNameBytes).replace(/\\/g, '/');

      if (
        fileName === 'manifest.json' ||
        fileName.endsWith('/manifest.json')
      ) {
        if (localHeaderOffset + 30 <= bytes.length) {
          const localSig = view.getUint32(localHeaderOffset, true);
          if (localSig === 0x04034b50) {
            const localFileNameLen = view.getUint16(localHeaderOffset + 26, true);
            const localExtraLen = view.getUint16(localHeaderOffset + 28, true);
            const dataStart = localHeaderOffset + 30 + localFileNameLen + localExtraLen;
            const compressedData = bytes.slice(dataStart, dataStart + compressedSize);

            if (method === 0) {
              return new TextDecoder().decode(compressedData);
            } else if (method === 8) {
              return await decompressDeflate(compressedData);
            }
          }
        }
      }

      cdPos += 46 + fileNameLength + extraLength + commentLength;
    }
  }

  // Strategy 2: Fallback to scanning local file headers
  let offset = 0;
  while (offset + 30 < bytes.length) {
    const sig = view.getUint32(offset, true);
    if (sig !== 0x04034b50) break;

    const method = view.getUint16(offset + 8, true);
    const compressedSize = view.getUint32(offset + 18, true);
    const fileNameLength = view.getUint16(offset + 26, true);
    const extraLength = view.getUint16(offset + 28, true);

    const fileNameBytes = bytes.slice(offset + 30, offset + 30 + fileNameLength);
    const fileName = new TextDecoder().decode(fileNameBytes).replace(/\\/g, '/');
    const dataOffset = offset + 30 + fileNameLength + extraLength;

    if (
      fileName === 'manifest.json' ||
      fileName.endsWith('/manifest.json')
    ) {
      if (compressedSize > 0) {
        const compressedData = bytes.slice(dataOffset, dataOffset + compressedSize);
        if (method === 0) {
          return new TextDecoder().decode(compressedData);
        } else if (method === 8) {
          return await decompressDeflate(compressedData);
        }
      }
    }

    if (compressedSize === 0) {
      let nextSig = dataOffset + 1;
      while (nextSig + 4 < bytes.length) {
        if (
          bytes[nextSig] === 0x50 &&
          bytes[nextSig + 1] === 0x4b &&
          (bytes[nextSig + 2] === 0x03 || bytes[nextSig + 2] === 0x01)
        ) {
          break;
        }
        nextSig++;
      }
      offset = nextSig;
    } else {
      offset = dataOffset + compressedSize;
    }
  }

  throw new Error(
    'manifest.json not found inside the ZIP archive. Make sure your package contains a manifest.json at the root or in a subdirectory.',
  );
}

async function decompressDeflate(compressedData: Uint8Array): Promise<string> {
  const ds = new DecompressionStream('deflate-raw');
  const writer = ds.writable.getWriter();
  const reader = ds.readable.getReader();
  void writer.write(compressedData as unknown as BufferSource);
  void writer.close();

  const chunks: Uint8Array[] = [];
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
  }
  const total = chunks.reduce((n, c) => n + c.length, 0);
  const merged = new Uint8Array(total);
  let pos = 0;
  for (const chunk of chunks) {
    merged.set(chunk, pos);
    pos += chunk.length;
  }
  return new TextDecoder().decode(merged);
}

interface ValidationResult {
  valid: boolean;
  appId: string;
  slug: string;
  name: string;
  version: string;
  description: string;
  category: string;
  publisher: string;
  platform: string;
  visibility: string;
  targetCompanyId: string;
  packageHash: string;
  permissions: string[];
  dependencies: { app_id?: string; version?: string; required?: boolean }[];
  navigation: { id?: string; label?: string; group?: string; href?: string }[];
  settings: string[];
  securityStatus: string;
  issues: string[];
  warnings: string[];
}

export function UploadPluginModal({
  isOpen,
  onClose,
  companyId,
  companyName,
  onSuccess,
}: {
  isOpen: boolean;
  onClose: () => void;
  companyId?: string | null;
  companyName?: string | null;
  onSuccess?: () => void;
}) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileContent, setFileContent] = useState<string>('');
  const [uploading, setUploading] = useState(false);
  const [installing, setInstalling] = useState(false);
  const [parsing, setParsing] = useState(false); // reading + extracting zip
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Prevent browser default behavior (which in Firefox prompts to download/open the dropped file)
  useEffect(() => {
    if (!isOpen) return;

    const preventDefault = (e: globalThis.DragEvent) => {
      e.preventDefault();
    };

    window.addEventListener('dragover', preventDefault);
    window.addEventListener('drop', preventDefault);

    return () => {
      window.removeEventListener('dragover', preventDefault);
      window.removeEventListener('drop', preventDefault);
    };
  }, [isOpen]);

  if (!isOpen) return null;

  function resetState() {
    setSelectedFile(null);
    setFileContent('');
    setUploading(false);
    setInstalling(false);
    setParsing(false);
    setIsDragging(false);
    setError(null);
    setSuccess(null);
    setValidation(null);
  }

  function handleClose() {
    resetState();
    onClose();
  }

  function processFile(file: File) {
    setError(null);
    setValidation(null);
    setSelectedFile(file);
    setFileContent('');

    const isZip =
      file.name.toLowerCase().endsWith('.zip') ||
      file.type === 'application/zip' ||
      file.type === 'application/x-zip-compressed';

    if (isZip) {
      // Read zip as binary, extract manifest.json client-side
      setParsing(true);
      const arrayReader = new FileReader();
      arrayReader.onload = async (event) => {
        const buf = event.target?.result;
        if (!(buf instanceof ArrayBuffer)) {
          setError('Failed to read ZIP file.');
          setParsing(false);
          return;
        }
        try {
          const manifestText = await extractManifestFromZip(buf);
          // Validate it parses as JSON before sending
          JSON.parse(manifestText);
          setFileContent(manifestText);
        } catch (err) {
          setError(
            err instanceof Error
              ? err.message
              : 'Could not extract manifest.json from the ZIP package.',
          );
          setSelectedFile(null);
        } finally {
          setParsing(false);
        }
      };
      arrayReader.onerror = () => {
        setError('Failed to read the ZIP file.');
        setParsing(false);
      };
      arrayReader.readAsArrayBuffer(file);
    } else {
      // JSON / .erpfy / .erpfy-plugin — read as text
      const textReader = new FileReader();
      textReader.onload = (event) => {
        const text = event.target?.result;
        if (typeof text === 'string') {
          setFileContent(text);
        }
      };
      textReader.onerror = () => setError('Failed to read selected package file.');
      textReader.readAsText(file);
    }
  }

  function handleFileSelect(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  }

  function handleDragOver(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'copy';
    setIsDragging(true);
  }

  function handleDragEnter(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }

  function handleDragLeave(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    e.stopPropagation();
    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
    setIsDragging(false);
  }

  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const file = e.dataTransfer.files?.[0];
    if (file) {
      processFile(file);
    }
  }

  function formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  }

  async function handleUploadAndValidate() {
    if (!fileContent.trim()) {
      setError('Please select an ERPFY package file (.erpfy, .json, .erpfy-plugin, or .zip).');
      return;
    }
    if (!companyId) {
      setError('No active workspace selected. Switch to a company workspace to upload plugins.');
      return;
    }

    setUploading(true);
    setError(null);
    setValidation(null);

    try {
      const res = await fetch('/api/apps/private-upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyId,
          packageContent: fileContent,
        }),
      });

      const data = (await res.json()) as {
        ok?: boolean;
        error?: string;
        validation?: ValidationResult;
      };
      if (!res.ok || !data.ok) {
        setError(data.error || 'Plugin package validation failed.');
        if (data.validation) {
          setValidation(data.validation);
        }
      } else {
        setValidation(data.validation || null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error occurred during validation.');
    } finally {
      setUploading(false);
    }
  }

  async function handleConfirmInstall() {
    if (!validation || !companyId) return;

    setInstalling(true);
    setError(null);

    try {
      const res = await fetch('/api/apps/private-install', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          appId: validation.appId,
          version: validation.version,
          companyId,
          grantedScopes: validation.permissions,
        }),
      });

      const data = (await res.json()) as {
        success?: boolean;
        error?: string;
        message?: string;
      };
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to install private plugin.');
      }

      setSuccess(`Plugin "${validation.name}" installed successfully!`);
      window.dispatchEvent(
        new CustomEvent('erpfy:apps-changed', { detail: { companyId } }),
      );
      onSuccess?.();
      setTimeout(() => {
        handleClose();
      }, 1200);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Installation failed.');
    } finally {
      setInstalling(false);
    }
  }

  return (
    <dialog
      open
      aria-labelledby="upload-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget && !uploading && !installing) onClose();
      }}
      className="admin-surface fixed inset-0 z-[100] m-0 h-full w-full max-h-none max-w-none border-0 p-4 flex items-center justify-center overflow-y-auto bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
    >
      <div className="relative w-full max-w-[680px] rounded-2xl border border-[var(--erpfy-line)] bg-[var(--erpfy-surface)] text-[var(--erpfy-ink)] shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--erpfy-line-soft)] px-6 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex size-8 items-center justify-center rounded-lg bg-[var(--erpfy-brand-soft)] text-[var(--erpfy-brand)]">
              <Upload className="size-4" />
            </div>
            <div>
              <h2 id="upload-modal-title" className="text-base font-bold text-[var(--erpfy-ink-strong)]">
                Upload Private Plugin
              </h2>
              <p className="text-xs text-[var(--erpfy-ink-muted)]">
                Install custom capability for{' '}
                <span className="font-semibold text-[var(--erpfy-ink-strong)]">
                  {companyName || companyId || 'this company'}
                </span>
                .
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            aria-label="Close"
            className="rounded-lg p-1 text-[var(--erpfy-ink-muted)] hover:bg-[var(--erpfy-hover)] hover:text-[var(--erpfy-ink-strong)] transition cursor-pointer"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="max-h-[70vh] overflow-y-auto p-6 space-y-5">
          {/* Step 1: File Selection (when no validation yet) */}
          {!validation && (
            <div className="space-y-4">
              <div
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    fileInputRef.current?.click();
                  }
                }}
                onClick={() => fileInputRef.current?.click()}
                onDragOver={handleDragOver}
                onDragEnter={handleDragEnter}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={cn(
                  'group flex w-full flex-col items-center justify-center rounded-xl border-2 border-dashed p-8 text-center cursor-pointer transition-all duration-150',
                  isDragging
                    ? 'border-[var(--erpfy-brand)] bg-[var(--erpfy-brand-soft)]/40 scale-[1.01] ring-4 ring-[var(--erpfy-brand)]/20'
                    : selectedFile
                    ? 'border-[var(--erpfy-brand)] bg-[var(--erpfy-brand-soft)]/25'
                    : 'border-[var(--erpfy-line)] hover:border-[var(--erpfy-brand)] hover:bg-[var(--erpfy-hover)]',
                )}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".erpfy,.json,.erpfy-plugin,.zip"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <div className="mb-3 flex size-12 items-center justify-center rounded-full bg-[var(--erpfy-canvas)] shadow-xs border border-[var(--erpfy-line-soft)] group-hover:scale-105 transition-transform">
                  <Package className="size-6 text-[var(--erpfy-brand)]" />
                </div>
                <p className="text-sm font-semibold text-[var(--erpfy-ink-strong)]">
                  {isDragging
                    ? 'Drop your ERPFY package here'
                    : selectedFile
                    ? selectedFile.name
                    : 'Choose or drag & drop an ERPFY plugin package'}
                </p>
                <p className="mt-1 text-xs text-[var(--erpfy-ink-muted)]">
                  Supports standard ERPFY packages (<code>.erpfy</code>, <code>.json</code>,{' '}
                  <code>.erpfy-plugin</code>, <code>.zip</code> up to 5 MB)
                </p>
              </div>

              {selectedFile && (
                <div className="rounded-xl border border-[var(--erpfy-line-soft)] bg-[var(--erpfy-canvas)] p-3.5 space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span className="text-[var(--erpfy-ink-muted)]">Filename:</span>
                    <span className="font-semibold text-[var(--erpfy-ink-strong)] break-all">{selectedFile.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[var(--erpfy-ink-muted)]">Size:</span>
                    <span className="font-medium text-[var(--erpfy-ink)]">{formatBytes(selectedFile.size)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[var(--erpfy-ink-muted)]">Type:</span>
                    <span className="font-medium text-[var(--erpfy-ink)]">{selectedFile.type || 'application/zip'}</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Validation Result UI (Section 5) */}
          {validation && validation.valid && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 rounded-xl bg-[var(--erpfy-brand-soft)]/40 p-3.5 text-xs text-[var(--erpfy-brand)] border border-[var(--erpfy-brand)]/20">
                <ShieldCheck className="size-4 shrink-0" />
                <div>
                  <span className="font-bold">Security Status: Validated</span>
                  <p className="mt-0.5 text-[var(--erpfy-ink-muted)]">
                    Zero-execution static analysis passed. Platform binding verified for ERPFY.
                  </p>
                </div>
              </div>

              <div className="rounded-xl border border-[var(--erpfy-line)] bg-[var(--erpfy-canvas)] divide-y divide-[var(--erpfy-line-soft)] text-xs">
                <div className="flex justify-between p-3">
                  <span className="text-[var(--erpfy-ink-muted)]">Plugin Name:</span>
                  <span className="font-bold text-[var(--erpfy-ink-strong)]">{validation.name}</span>
                </div>
                <div className="flex justify-between p-3">
                  <span className="text-[var(--erpfy-ink-muted)]">Version:</span>
                  <span className="font-semibold text-[var(--erpfy-ink-strong)]">{validation.version}</span>
                </div>
                <div className="flex justify-between p-3">
                  <span className="text-[var(--erpfy-ink-muted)]">Publisher:</span>
                  <span className="font-medium text-[var(--erpfy-ink)]">{validation.publisher}</span>
                </div>
                <div className="flex justify-between p-3">
                  <span className="text-[var(--erpfy-ink-muted)]">Category:</span>
                  <span className="font-medium text-[var(--erpfy-ink)]">{validation.category}</span>
                </div>
                <div className="flex justify-between p-3">
                  <span className="text-[var(--erpfy-ink-muted)]">Platform:</span>
                  <span className="font-bold text-[var(--erpfy-brand)]">{validation.platform}</span>
                </div>
                <div className="flex justify-between p-3">
                  <span className="text-[var(--erpfy-ink-muted)]">Visibility:</span>
                  <span className="rounded-md bg-amber-500/15 px-2 py-0.5 font-bold uppercase tracking-wider text-[10px] text-amber-600 dark:text-amber-400">
                    {validation.visibility}
                  </span>
                </div>
                <div className="flex justify-between p-3">
                  <span className="text-[var(--erpfy-ink-muted)]">Installed For:</span>
                  <span className="font-semibold text-[var(--erpfy-ink-strong)]">{companyName || validation.targetCompanyId}</span>
                </div>
                <div className="p-3 space-y-1">
                  <span className="text-[var(--erpfy-ink-muted)]">Package Hash (SHA-256):</span>
                  <p className="font-mono text-[11px] text-[var(--erpfy-ink)] break-all bg-[var(--erpfy-surface)] p-1.5 rounded border border-[var(--erpfy-line-soft)]">
                    {validation.packageHash}
                  </p>
                </div>
                {validation.permissions.length > 0 && (
                  <div className="p-3 space-y-1.5">
                    <span className="text-[var(--erpfy-ink-muted)]">Requested Permissions:</span>
                    <div className="flex flex-wrap gap-1">
                      {validation.permissions.map((p) => (
                        <span key={p} className="rounded bg-[var(--erpfy-hover)] px-2 py-0.5 font-mono text-[11px] text-[var(--erpfy-ink)] border border-[var(--erpfy-line-soft)]">
                          {p}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {validation.navigation.length > 0 && (
                  <div className="p-3 space-y-1.5">
                    <span className="text-[var(--erpfy-ink-muted)]">Navigation Contributions:</span>
                    <div className="space-y-1">
                      {validation.navigation.map((n) => (
                        <div key={n.id || n.label} className="flex items-center gap-1.5 text-[var(--erpfy-ink)]">
                          <span className="text-[var(--erpfy-ink-muted)]">{n.group || 'Apps'} &gt;</span>
                          <span className="font-medium text-[var(--erpfy-ink-strong)]">{n.label}</span>
                          <span className="font-mono text-[10px] text-[var(--erpfy-ink-muted)]">({n.href})</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {validation.settings.length > 0 && (
                  <div className="p-3 space-y-1">
                    <span className="text-[var(--erpfy-ink-muted)]">Settings Contributions:</span>
                    <p className="font-medium text-[var(--erpfy-ink)]">
                      {validation.settings.join(', ')}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Validation Failed State (Section 6) */}
          {validation && !validation.valid && (
            <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-xs space-y-2">
              <div className="flex items-center gap-2 text-red-600 dark:text-red-400 font-bold">
                <AlertCircle className="size-4" />
                <span>Plugin Validation Failed</span>
              </div>
              <ul className="list-disc pl-5 text-red-700 dark:text-red-300 space-y-1">
                {validation.issues.map((issue, idx) => (
                  <li key={idx}>{issue}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Error notice */}
          {error && !validation && (
            <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-600 dark:text-red-400 flex items-center gap-2">
              <AlertCircle className="size-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Success notice */}
          {success && (
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
              <CheckCircle2 className="size-4 shrink-0" />
              <span>{success}</span>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between border-t border-[var(--erpfy-line-soft)] bg-[var(--erpfy-canvas)] px-6 py-4">
          <button
            type="button"
            onClick={validation ? resetState : handleClose}
            disabled={uploading || installing || parsing}
            className="soft-button"
          >
            {validation ? 'Back / Choose Another' : 'Cancel'}
          </button>

          {!validation ? (
            <button
              type="button"
              onClick={handleUploadAndValidate}
              disabled={!selectedFile || uploading || parsing}
              className="primary-button"
            >
              {parsing ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  <span>Extracting...</span>
                </>
              ) : uploading ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  <span>Validating...</span>
                </>
              ) : (
                <>
                  <FileCheck2 className="size-4" />
                  <span>Upload &amp; Validate</span>
                </>
              )}
            </button>
          ) : validation.valid ? (
            <button
              type="button"
              onClick={handleConfirmInstall}
              disabled={installing}
              className="primary-button"
            >
              {installing ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  <span>Installing...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="size-4" />
                  <span>Install Plugin</span>
                </>
              )}
            </button>
          ) : null}
        </div>
      </div>
    </dialog>
  );
}
