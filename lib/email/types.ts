/**
 * Email Subsystem Type Definitions for ERPfy.net
 */

export interface EmailAddress {
  email: string;
  name?: string;
}

export interface SendEmailOptions {
  to: string | EmailAddress;
  from?: string | EmailAddress;
  subject: string;
  text: string;
  html?: string;
  replyTo?: string;
  tags?: Record<string, string>;
}

export interface EmailSendResult {
  id: string;
  success: boolean;
  provider: 'console' | 'resend' | 'smtp' | 'sendgrid';
  error?: string;
  timestamp: string;
}

export interface EmailProviderAdapter {
  name: 'console' | 'resend' | 'smtp' | 'sendgrid';
  isProduction: boolean;
  send(options: SendEmailOptions): Promise<EmailSendResult>;
}
