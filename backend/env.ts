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

export function getAdminToken(): string | undefined {
  return readEnvValue('ADMIN_TOKEN');
}
