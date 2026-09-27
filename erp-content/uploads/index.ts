/**
 * ERPFY Uploads & Media Storage Adapter
 *
 * Equivalent to wp-content/uploads/ in WordPress.
 * Connects to Cloudflare R2 for persistent, company-isolated object storage.
 */

export interface StoredFile {
  id: string;
  companyId: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  r2Key: string;
  publicUrl?: string;
  uploadedAt: number;
}

export interface UploadOptions {
  companyId: string;
  allowedTypes?: string[];
  maxBytes?: number;
}

export const UPLOAD_LIMITS = {
  maxFileSize: 25 * 1024 * 1024, // 25MB
  allowedMimeTypes: [
    'image/jpeg',
    'image/png',
    'image/webp',
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/csv',
  ],
};

export function sanitizeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_').toLowerCase();
}

export function buildCompanyUploadPath(companyId: string, filename: string): string {
  const timestamp = Date.now();
  const clean = sanitizeFileName(filename);
  return `companies/${companyId}/uploads/${timestamp}-${clean}`;
}
