// Shared identity validation for operator registration.
// CSC / Digital Seva ID is always a 12-digit number. We only strip spaces and
// hyphens (users often type "1234 5678 9012") before checking — everything else
// must be digits. This blocks junk like "123", "abc" or "CSC-UP-12345" without
// adding any extra step for a genuine operator.

const CSC_ID_PATTERN = /^\d{12}$/;
const CSC_ID_ERROR = 'CSC ID exactly 12 digit ka number hona chahiye (Digital Seva ID). Example: 123456789012';
const NAME_ERROR = 'Operator ka proper naam likhein — kam se kam 3 letters. 123 ya random characters allowed nahi hain.';

export function normalizeCscId(value: unknown): string {
  return String(value ?? '').replace(/[\s-]/g, '');
}

export function isValidCscId(value: unknown): boolean {
  return CSC_ID_PATTERN.test(normalizeCscId(value));
}

// Real names only: 3-50 chars, no digits, at least 3 letters and at least two
// different letters (so "aaa"/"..." fail). Works for Hindi/other scripts too.
export function isValidPersonName(value: unknown): boolean {
  const name = String(value ?? '').trim();
  if (name.length < 3 || name.length > 50) return false;
  if (/\d/.test(name)) return false;
  const letters = name.match(/\p{L}/gu) || [];
  if (letters.length < 3) return false;
  const unique = new Set(letters.map(letter => letter.toLowerCase()));
  return unique.size >= 2;
}

export function cscIdValidationError(): string {
  return CSC_ID_ERROR;
}

export function personNameValidationError(): string {
  return NAME_ERROR;
}
