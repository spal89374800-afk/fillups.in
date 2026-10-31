import nodemailer from 'nodemailer';
import { readEnvValue } from '../env.ts';

export interface SendEmailInput {
  to: string;
  subject: string;
  text: string;
  html?: string;
  senderName?: string;
}

export interface SendEmailResult {
  ok: boolean;
  via?: string;
  error?: string;
}

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

// Brevo ne apna naam Sendinblue se badla hai, aur dashboard/logs me key kabhi
// BREVO_KEY / SENDINBLUE_API_KEY naam se bhi milti hai. Dono accept karte hain.
export function getBrevoApiKey(): string | undefined {
  return readEnvValue('BREVO_API_KEY') ||
    readEnvValue('BREVO_KEY') ||
    readEnvValue('SENDINBLUE_API_KEY');
}

// Verified sender hona chahiye. SMTP_USER (xxx@smtp-brevo.com) sirf relay
// username hai, API sender nahi — isliye SMTP_FROM ko pehle try karte hain.
export function getEmailSender(): string | undefined {
  return readEnvValue('BREVO_FROM') ||
    readEnvValue('SENDGRID_FROM') ||
    readEnvValue('SMTP_FROM') ||
    readEnvValue('SMTP_USER');
}

export function isEmailConfigured(): boolean {
  return Boolean(
    getBrevoApiKey() ||
    readEnvValue('RESEND_API_KEY') ||
    readEnvValue('SENDGRID_API_KEY') ||
    (readEnvValue('SMTP_USER') && readEnvValue('SMTP_PASS'))
  );
}

/**
 * Real transactional email delivery.
 * Order: Brevo → Resend → SendGrid (HTTPS, Render-safe) → SMTP fallback.
 * Returns ok:false when nothing is configured or every channel fails, so the
 * caller can store a truthful `notificationsSent` flag instead of a fake one.
 */
export async function sendTransactionalEmail(input: SendEmailInput): Promise<SendEmailResult> {
  const to = String(input.to || '').trim().toLowerCase();
  if (!isValidEmail(to)) {
    return { ok: false, error: 'Invalid recipient email address.' };
  }

  const subject = input.subject;
  const text = input.text;
  const senderName = input.senderName || 'DigiSeva Pro';
  const errors: string[] = [];

  const timeoutSignal = () => AbortSignal.timeout(15_000);

  // 1) Brevo (recommended on Render free — SMTP ports are blocked there)
  const brevoKey = getBrevoApiKey();
  const brevoFrom = getEmailSender();
  if (brevoKey && brevoFrom) {
    try {
      const response = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        signal: timeoutSignal(),
        headers: {
          'api-key': brevoKey,
          'content-type': 'application/json',
          accept: 'application/json'
        },
        body: JSON.stringify({
          sender: { name: senderName, email: brevoFrom },
          to: [{ email: to }],
          subject,
          textContent: text,
          ...(input.html ? { htmlContent: input.html } : {})
        })
      });
      if (!response.ok) {
        const body = await response.text().catch(() => '');
        throw new Error(`Brevo HTTP ${response.status}${body ? `: ${body.slice(0, 200)}` : ''}`);
      }
      return { ok: true, via: 'Brevo' };
    } catch (error) {
      errors.push(`Brevo: ${error instanceof Error ? error.message : 'failed'}`);
    }
  }

  // 2) Resend
  const resendKey = readEnvValue('RESEND_API_KEY');
  if (resendKey) {
    const resendFrom = readEnvValue('RESEND_FROM') || 'DigiSeva Pro <onboarding@resend.dev>';
    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        signal: timeoutSignal(),
        headers: {
          Authorization: `Bearer ${resendKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from: resendFrom,
          to: [to],
          subject,
          text,
          ...(input.html ? { html: input.html } : {})
        })
      });
      if (!response.ok) {
        const body = await response.text().catch(() => '');
        throw new Error(`Resend HTTP ${response.status}${body ? `: ${body.slice(0, 200)}` : ''}`);
      }
      return { ok: true, via: 'Resend' };
    } catch (error) {
      errors.push(`Resend: ${error instanceof Error ? error.message : 'failed'}`);
    }
  }

  // 3) SendGrid
  const sendgridKey = readEnvValue('SENDGRID_API_KEY');
  const sendgridFrom = getEmailSender();
  if (sendgridKey && sendgridFrom) {
    try {
      const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
        method: 'POST',
        signal: timeoutSignal(),
        headers: {
          Authorization: `Bearer ${sendgridKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          personalizations: [{ to: [{ email: to }] }],
          from: { email: sendgridFrom, name: senderName },
          subject,
          content: [
            { type: 'text/plain', value: text },
            ...(input.html ? [{ type: 'text/html', value: input.html }] : [])
          ]
        })
      });
      if (!response.ok) {
        const body = await response.text().catch(() => '');
        throw new Error(`SendGrid HTTP ${response.status}${body ? `: ${body.slice(0, 200)}` : ''}`);
      }
      return { ok: true, via: 'SendGrid' };
    } catch (error) {
      errors.push(`SendGrid: ${error instanceof Error ? error.message : 'failed'}`);
    }
  }

  // 4) SMTP fallback (works locally / on paid hosts that allow SMTP)
  const smtpUser = readEnvValue('SMTP_USER');
  const smtpPass = readEnvValue('SMTP_PASS');
  if (smtpUser && smtpPass) {
    const configuredPort = Number(readEnvValue('SMTP_PORT') || 465);
    const portsToTry = [...new Set([configuredPort, 587, 465, 2525])].filter(port => Number.isFinite(port));
    for (const port of portsToTry) {
      try {
        const transporter = nodemailer.createTransport({
          host: readEnvValue('SMTP_HOST') || 'smtp.gmail.com',
          port,
          secure: port === 465,
          auth: { user: smtpUser, pass: smtpPass },
          connectionTimeout: 10_000,
          greetingTimeout: 10_000,
          socketTimeout: 15_000
        });
        const mailFrom = readEnvValue('SMTP_FROM') || readEnvValue('BREVO_FROM') || smtpUser;
        await transporter.sendMail({
          from: `"${senderName}" <${mailFrom}>`,
          to,
          subject,
          text,
          ...(input.html ? { html: input.html } : {})
        });
        return { ok: true, via: `SMTP:${port}` };
      } catch (error) {
        errors.push(`SMTP ${port}: ${error instanceof Error ? error.message : 'failed'}`);
      }
    }
  }

  const error = errors.length
    ? errors.join(' | ')
    : 'No email provider configured (set BREVO_API_KEY / RESEND_API_KEY / SENDGRID_API_KEY or SMTP_USER + SMTP_PASS).';
  console.error('[email] delivery failed:', error);
  return { ok: false, error };
}
