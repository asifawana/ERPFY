/**
 * Standardized Email Templates for ERPfy.net
 * Clean HTML and plain text templates for platform and merchant communication.
 */

export function renderWelcomeTemplate(params: { name: string; appUrl: string }) {
  const subject = `Welcome to ERPfy.net, ${params.name}!`;
  const text = `Hi ${params.name},\n\nWelcome to ERPfy.net! Your unified ERP + Online Store account is ready.\n\nAccess your workspace: ${params.appUrl}/account\n\nBest regards,\nThe ERPfy Team`;
  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #1e293b;">
      <h2 style="color: #0f172a;">Welcome to ERPfy.net!</h2>
      <p>Hi ${params.name},</p>
      <p>Your unified ERP and online store account is provisioned and ready.</p>
      <div style="margin: 24px 0;">
        <a href="${params.appUrl}/account" style="background-color: #1e5631; color: #ffffff; padding: 10px 20px; text-decoration: none; border-radius: 6px; font-weight: 600;">Go to My Workspace</a>
      </div>
      <p style="color: #64748b; font-size: 13px;">If you did not sign up for ERPfy, please ignore this email.</p>
    </div>
  `;
  return { subject, text, html };
}

export function renderEmailVerificationTemplate(params: { name: string; verifyUrl: string }) {
  const subject = `Verify your ERPfy email address`;
  const text = `Hi ${params.name},\n\nPlease verify your email address by clicking: ${params.verifyUrl}\n\nThis link expires in 24 hours.`;
  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
      <h2>Verify your email address</h2>
      <p>Hi ${params.name}, please verify your email to unlock all platform features.</p>
      <p><a href="${params.verifyUrl}" style="background-color: #1e5631; color: white; padding: 10px 18px; text-decoration: none; border-radius: 6px;">Verify Email</a></p>
    </div>
  `;
  return { subject, text, html };
}

export function renderPasswordResetTemplate(params: { name: string; resetUrl: string }) {
  const subject = `Reset your ERPfy password`;
  const text = `Hi ${params.name},\n\nReset your password here: ${params.resetUrl}\n\nIf you did not request this, you can safely ignore this email.`;
  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
      <h2>Password Reset Request</h2>
      <p>Click below to choose a new password:</p>
      <p><a href="${params.resetUrl}" style="background-color: #0f172a; color: white; padding: 10px 18px; text-decoration: none; border-radius: 6px;">Reset Password</a></p>
    </div>
  `;
  return { subject, text, html };
}

export function renderSubscriptionConfirmationTemplate(params: { companyName: string; planName: string; amount: string }) {
  const subject = `Subscription Confirmed: ${params.planName} Plan`;
  const text = `Your subscription for ${params.companyName} to the ${params.planName} plan (${params.amount}) is now active.`;
  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
      <h2>Subscription Active: ${params.planName}</h2>
      <p>Thank you for subscribing! <strong>${params.companyName}</strong> is now upgraded to <strong>${params.planName}</strong> (${params.amount}).</p>
    </div>
  `;
  return { subject, text, html };
}

export function renderPaymentReceiptTemplate(params: { invoiceNumber: string; amount: string; date: string }) {
  const subject = `Payment Receipt #${params.invoiceNumber}`;
  const text = `Receipt for payment of ${params.amount} on ${params.date}. Invoice #${params.invoiceNumber}.`;
  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
      <h2>Payment Receipt</h2>
      <p>Invoice: <strong>${params.invoiceNumber}</strong></p>
      <p>Amount Paid: <strong>${params.amount}</strong> on ${params.date}</p>
    </div>
  `;
  return { subject, text, html };
}

export function renderPaymentFailureTemplate(params: { companyName: string; amount: string; updateBillingUrl: string }) {
  const subject = `Action Required: Payment Failed for ${params.companyName}`;
  const text = `We were unable to process your payment of ${params.amount}. Update billing: ${params.updateBillingUrl}`;
  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
      <h2 style="color: #b91c1c;">Payment Failed</h2>
      <p>We could not charge your payment method for ${params.amount}. Please update your billing details:</p>
      <p><a href="${params.updateBillingUrl}">Update Billing Details</a></p>
    </div>
  `;
  return { subject, text, html };
}

export function renderQuotaWarningTemplate(params: { metric: string; current: number; limit: number; upgradeUrl: string }) {
  const subject = `Quota Alert: Approaching ${params.metric} limit`;
  const text = `You have used ${params.current} of ${params.limit} ${params.metric}. Upgrade: ${params.upgradeUrl}`;
  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
      <h2>Quota Alert: ${params.metric}</h2>
      <p>You have reached <strong>${params.current} / ${params.limit}</strong> of your plan's ${params.metric}.</p>
      <p><a href="${params.upgradeUrl}">Upgrade Plan</a></p>
    </div>
  `;
  return { subject, text, html };
}

export function renderDomainVerificationTemplate(params: { domain: string; status: 'verified' | 'failed' }) {
  const subject = `Custom Domain ${params.domain} is ${params.status.toUpperCase()}`;
  const text = `Your domain ${params.domain} verification result: ${params.status}.`;
  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
      <h2>Custom Domain: ${params.domain}</h2>
      <p>Status: <strong>${params.status.toUpperCase()}</strong></p>
    </div>
  `;
  return { subject, text, html };
}

export function renderOrderConfirmationTemplate(params: { orderId: string; total: string; itemsCount: number }) {
  const subject = `Order Confirmation #${params.orderId}`;
  const text = `Thank you for your order #${params.orderId}! Total: ${params.total} (${params.itemsCount} items).`;
  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
      <h2>Order Confirmation #${params.orderId}</h2>
      <p>Thank you for your order! Your total is <strong>${params.total}</strong>.</p>
    </div>
  `;
  return { subject, text, html };
}

export function renderStoreOrderAlertTemplate(params: { orderId: string; customerName: string; total: string }) {
  const subject = `New Store Order #${params.orderId} from ${params.customerName}`;
  const text = `You received a new order #${params.orderId} from ${params.customerName} for ${params.total}.`;
  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
      <h2>New Store Order Received!</h2>
      <p>Order #${params.orderId} by <strong>${params.customerName}</strong> (${params.total}).</p>
    </div>
  `;
  return { subject, text, html };
}

export function renderAppInstallationTemplate(params: { appName: string; companyName: string }) {
  const subject = `App Installed: ${params.appName} on ${params.companyName}`;
  const text = `The app ${params.appName} was successfully installed on ${params.companyName}.`;
  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
      <h2>App Installed</h2>
      <p><strong>${params.appName}</strong> is now active on <strong>${params.companyName}</strong>.</p>
    </div>
  `;
  return { subject, text, html };
}
