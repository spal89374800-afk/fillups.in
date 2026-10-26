import dotenv from 'dotenv';

dotenv.config({ path: ['.env.local', '.env'] });

const PLACEHOLDER_PATTERN = /^(my_|your-|replace-|fillup_|<)/i;

export function readEnvValue(name: string): string | undefined {
  const value = process.env[name];
  if (!value) return undefined;
  const trimmed = value.trim();
  if (!trimmed || PLACEHOLDER_PATTERN.test(trimmed)) return undefined;
  return trimmed;
}

export function isTestOtpEnabled(): boolean {
  // Allow the test-OTP fallback on live deployments too, but ONLY when no real
  // delivery channel (SMTP/WhatsApp) is configured. This keeps login working on
  // Render even if provider credentials are missing, while normal production
  // traffic with SMTP configured is unaffected.
  return process.env.TEST_OTP_ENABLED === 'true';
}

export function getAdminToken(): string | undefined {
  return readEnvValue('ADMIN_TOKEN');
}
