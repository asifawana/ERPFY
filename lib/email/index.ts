/**
 * Email Subsystem Entry Point for ERPfy.net
 * Resolves active provider based on environment configuration.
 */

import type { EmailProviderAdapter, SendEmailOptions, EmailSendResult } from './types.ts';
import { ConsoleEmailDriver, ResendEmailDriver, SmtpEmailDriver } from './providers.ts';

let defaultProvider: EmailProviderAdapter | null = null;

export function getEmailProvider(): EmailProviderAdapter {
  if (defaultProvider) {
    return defaultProvider;
  }

  const driver = (process.env.EMAIL_DRIVER || '').toLowerCase();

  if (driver === 'resend' || process.env.RESEND_API_KEY) {
    defaultProvider = new ResendEmailDriver();
  } else if (driver === 'smtp' || process.env.SMTP_HOST) {
    defaultProvider = new SmtpEmailDriver();
  } else {
    // Default to Console driver for safe local dev & testing
    defaultProvider = new ConsoleEmailDriver();
  }

  return defaultProvider;
}

export async function sendEmail(options: SendEmailOptions): Promise<EmailSendResult> {
  const provider = getEmailProvider();
  return await provider.send(options);
}

export * from './types.ts';
export * from './templates.ts';
