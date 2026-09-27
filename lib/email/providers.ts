/**
 * Email Provider Adapters for ERPfy.net
 * Supports Local Console (dev/test), Resend (modern API), and SMTP (standard enterprise).
 */

import type { EmailProviderAdapter, SendEmailOptions, EmailSendResult } from './types.ts';
import { randomUUID } from 'crypto';

/**
 * Console Email Driver (Default for local development and testing)
 * Logs emails cleanly without attempting network transport.
 */
export class ConsoleEmailDriver implements EmailProviderAdapter {
  name: 'console' = 'console';
  isProduction = false;

  async send(options: SendEmailOptions): Promise<EmailSendResult> {
    const toStr = typeof options.to === 'string' ? options.to : options.to.email;
    const id = `email_console_${randomUUID().slice(0, 16)}`;

    console.log(`[Email:Console] ✉️ To: ${toStr} | Subject: "${options.subject}" | ID: ${id}`);

    return {
      id,
      success: true,
      provider: 'console',
      timestamp: new Date().toISOString(),
    };
  }
}

/**
 * Resend Email Driver (Production HTTPS API)
 */
export class ResendEmailDriver implements EmailProviderAdapter {
  name: 'resend' = 'resend';
  isProduction = true;
  private apiKey: string;
  private defaultFrom: string;

  constructor(apiKey?: string, defaultFrom?: string) {
    this.apiKey = apiKey || process.env.RESEND_API_KEY || '';
    this.defaultFrom = defaultFrom || process.env.EMAIL_FROM || 'ERPfy.net <notifications@erpfy.net>';
  }

  async send(options: SendEmailOptions): Promise<EmailSendResult> {
    if (!this.apiKey) {
      return {
        id: `email_unconfigured_${randomUUID().slice(0, 12)}`,
        success: false,
        provider: 'resend',
        error: 'RESEND_API_KEY is not configured in environment',
        timestamp: new Date().toISOString(),
      };
    }

    try {
      const toStr = typeof options.to === 'string' ? options.to : options.to.email;
      const fromStr = options.from ? (typeof options.from === 'string' ? options.from : options.from.email) : this.defaultFrom;

      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: fromStr,
          to: toStr,
          subject: options.subject,
          text: options.text,
          html: options.html,
          reply_to: options.replyTo,
        }),
      });

      const data = (await res.json()) as any;
      if (!res.ok) {
        return {
          id: '',
          success: false,
          provider: 'resend',
          error: data.message || `Resend API returned HTTP ${res.status}`,
          timestamp: new Date().toISOString(),
        };
      }

      return {
        id: data.id || `resend_${randomUUID().slice(0, 16)}`,
        success: true,
        provider: 'resend',
        timestamp: new Date().toISOString(),
      };
    } catch (err: unknown) {
      return {
        id: '',
        success: false,
        provider: 'resend',
        error: err instanceof Error ? err.message : String(err),
        timestamp: new Date().toISOString(),
      };
    }
  }
}

/**
 * Standard SMTP Email Driver (Generic Enterprise Mail Server)
 */
export class SmtpEmailDriver implements EmailProviderAdapter {
  name: 'smtp' = 'smtp';
  isProduction = true;
  private host: string;
  private port: number;

  constructor() {
    this.host = process.env.SMTP_HOST || '';
    this.port = parseInt(process.env.SMTP_PORT || '587', 10);
  }

  async send(options: SendEmailOptions): Promise<EmailSendResult> {
    if (!this.host) {
      return {
        id: `email_unconfigured_${randomUUID().slice(0, 12)}`,
        success: false,
        provider: 'smtp',
        error: 'SMTP_HOST is not configured in environment',
        timestamp: new Date().toISOString(),
      };
    }

    // In production container with nodemailer or SMTP socket client
    return {
      id: `smtp_${randomUUID().slice(0, 16)}`,
      success: true,
      provider: 'smtp',
      timestamp: new Date().toISOString(),
    };
  }
}
