export type DomainStatus = 'pending' | 'verified' | 'failed';
export type DomainSslStatus = 'pending' | 'active' | 'error';
export type DnsRecordType = 'CNAME' | 'A';

export interface CustomDomainRecord {
  id: string;
  companyId: string;
  domain: string;
  isPrimary: boolean;
  status: DomainStatus;
  sslStatus: DomainSslStatus;
  dnsRecordType: DnsRecordType;
  dnsExpectedValue: string;
  dnsCurrentValue?: string;
  verificationToken: string;
  verifiedAt?: string;
  createdAt: string;
  updatedAt: string;
  provider?: string;
  isProduction?: boolean;
}

export interface DomainVerificationResult {
  verified: boolean;
  message: string;
  dnsRecordType: DnsRecordType;
  expectedValue: string;
  currentValue?: string;
  sslReady: boolean;
  provider?: string;
  isProduction?: boolean;
}
