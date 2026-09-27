export interface StoredFileRecord {
  id: string;
  companyId: string;
  namespace: string; // e.g. 'products', 'themes', 'plugins', 'invoices', 'avatars'
  filename: string;
  path: string;
  mimeType: string;
  sizeBytes: number;
  provider: 'local' | 's3' | 'r2';
  url: string;
  createdAt: string;
}

export interface StorageProviderAdapter {
  name: 'local' | 's3' | 'r2';
  isProduction: boolean;

  uploadFile(options: {
    companyId: string;
    namespace: string;
    filename: string;
    content: Buffer | Uint8Array;
    mimeType: string;
  }): Promise<StoredFileRecord>;

  getFile(options: {
    companyId: string;
    namespace: string;
    filename: string;
  }): Promise<{ content: Buffer; mimeType: string } | null>;

  deleteFile(options: {
    companyId: string;
    namespace: string;
    filename: string;
  }): Promise<boolean>;

  listFiles(options: {
    companyId: string;
    namespace?: string;
  }): Promise<StoredFileRecord[]>;

  getPublicUrl(record: StoredFileRecord): string;
}
