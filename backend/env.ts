import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Resolve env files relative to this backend folder so they load correctly
// whether the process is started from the project root or from backend/.
dotenv.config({ path: [path.resolve(__dirname, '.env.local'), path.resolve(__dirname, '.env')] });

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
