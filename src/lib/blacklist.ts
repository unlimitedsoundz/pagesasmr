/**
 * The Pink Room - Blacklist & Banning Engine
 * Enforces multi-layered IP, device, phone model, and identity banning.
 */

// Permanent Blacklisted User IDs (Olivia, Loveth, Mulan)
export const BLACKLISTED_USER_IDS: readonly string[] = [
  'db2e55d8-bbb4-4fe4-acb4-0036f5df7ff1', // Olivia
  '6d8fa840-effc-4f02-8549-2b98e3c667ce', // Loveth onome
  '63285e80-b8e9-410f-aacd-22c99c376872', // Mulan ASMR (Yemisi Olugbemi)
] as const;

// Permanent Blacklisted Emails
export const BLACKLISTED_EMAILS: readonly string[] = [
  'preciousolivia184@gmail.com',
  'lucylovethonome@gmail.com',
  'copywithyemi@gmail.com',
] as const;

// Permanent Blacklisted Bank & Mobile Money Accounts
export const BLACKLISTED_BANK_ACCOUNTS: readonly string[] = [
  '1632024222', // Access Bank (Ovwiedo Victory Ogheneriode)
  '9065277585', // OPay / Access Bank (VICTORY OGHENERIODE OVWIEDO)
  '8107287339', // Palmpay (ONOME LOVETH OVWIEDO)
  '8065539969', // OPay (Yemisi Tosin Olugbemi / Mulan ASMR)
  '211393277871', // Lead Bank ACH (Yemisi Olugbemi)
] as const;

// Permanent Blacklisted Phone Numbers (any variation)
export const BLACKLISTED_PHONE_NUMBERS: readonly string[] = [
  '9065277585',
  '8107287339',
  '09065277585',
  '08107287339',
  '2349065277585',
  '2348107287339',
  '+2349065277585',
  '+2348107287339',
  '8065539969',
  '08065539969',
  '2348065539969',
  '+2348065539969',
] as const;

// Permanent Blacklisted Names / Beneficiaries
export const BLACKLISTED_NAMES: readonly string[] = [
  'victory ogheneriode ovwiedo',
  'onome loveth ovwiedo',
  'loveth onome',
  'precious olivia',
  'ovwiedo victory ogheneriode',
  'ovwiedo victory',
  'victory ovwiedo',
  'onome loveth',
  'loveth ovwiedo',
  'yemisi olugbemi',
  'yemisi tosin olugbemi',
  'olugbemi yemisi tosin',
  'mulan asmr',
] as const;

// Hardware signatures extracted from uploads (Loveth's Tecno Spark Go 2024 / KM4)
export const BLACKLISTED_HARDWARE_SIGNATURES: readonly string[] = [
  'TECNO KM4',
  'TECNO-KM4',
  'TECNO_KM4',
  'KM4 Build',
  'TECNO KM4h',
] as const;

/**
 * Check if a user ID is explicitly blacklisted
 */
export function isUserBlacklisted(userId?: string | null): boolean {
  if (!userId) return false;
  return BLACKLISTED_USER_IDS.some((id) => id === userId);
}

/**
 * Normalizes strings by lowercasing, removing excess spaces and special characters.
 */
export function normalizeString(str?: string | null): string {
  if (!str) return '';
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Check if an email is blacklisted
 */
export function isEmailBlacklisted(email?: string | null): boolean {
  if (!email) return false;
  const normalized = email.toLowerCase().trim();
  return BLACKLISTED_EMAILS.some((b) => b.toLowerCase() === normalized);
}

/**
 * Check if a name or beneficiary name matches blacklisted persons
 */
export function isNameBlacklisted(name?: string | null): boolean {
  if (!name) return false;
  const normalized = normalizeString(name);
  if (!normalized) return false;

  // Check exact or partial phrase containment
  return BLACKLISTED_NAMES.some((b) => {
    const normB = normalizeString(b);
    return normalized.includes(normB) || normB.includes(normalized);
  });
}

/**
 * Check if a bank account number or NUBAN matches blacklisted records
 */
export function isBankAccountBlacklisted(accountNumber?: string | null): boolean {
  if (!accountNumber) return false;
  const digits = accountNumber.replace(/\D/g, '');
  if (!digits) return false;
  return BLACKLISTED_BANK_ACCOUNTS.some((b) => digits.includes(b) || b.includes(digits));
}

/**
 * Check if a phone number matches blacklisted records
 */
export function isPhoneNumberBlacklisted(phone?: string | null): boolean {
  if (!phone) return false;
  const digits = phone.replace(/\D/g, '');
  if (!digits) return false;
  return BLACKLISTED_PHONE_NUMBERS.some((b) => {
    const bDigits = b.replace(/\D/g, '');
    return digits.endsWith(bDigits) || bDigits.endsWith(digits);
  });
}

/**
 * Check if a User-Agent or device string contains banned phone hardware models
 */
export function isHardwareSignatureBanned(userAgent?: string | null): boolean {
  if (!userAgent) return false;
  return BLACKLISTED_HARDWARE_SIGNATURES.some((sig) =>
    userAgent.toLowerCase().includes(sig.toLowerCase())
  );
}

/**
 * Helper to safely extract client IP from Next.js request headers
 */
export function extractClientIp(headers: { get(name: string): string | null }): string {
  const forwarded = headers.get('x-forwarded-for');
  if (forwarded) {
    const first = forwarded.split(',')[0].trim();
    if (first && first !== 'unknown') return first;
  }
  const realIp = headers.get('x-real-ip');
  if (realIp && realIp.trim()) return realIp.trim();

  const cfIp = headers.get('cf-connecting-ip');
  if (cfIp && cfIp.trim()) return cfIp.trim();

  const trueClientIp = headers.get('true-client-ip');
  if (trueClientIp && trueClientIp.trim()) return trueClientIp.trim();

  return '';
}

/**
 * Comprehensive registration blocker to prevent banned users from returning with another email
 */
export function checkRegistrationAgainstBlacklist(details: {
  email?: string;
  fullName?: string;
  displayName?: string;
  bankAccount?: string;
  phone?: string;
  userAgent?: string;
}): { blocked: boolean; reason?: string } {
  if (isEmailBlacklisted(details.email)) {
    return { blocked: true, reason: 'This email is permanently banned from the platform.' };
  }

  if (isNameBlacklisted(details.fullName) || isNameBlacklisted(details.displayName)) {
    return {
      blocked: true,
      reason: 'This identity is permanently banned from accessing or registering on The Pink Room.',
    };
  }

  if (isBankAccountBlacklisted(details.bankAccount)) {
    return {
      blocked: true,
      reason: 'The specified payment account has been blacklisted for platform policy violations.',
    };
  }

  if (isPhoneNumberBlacklisted(details.phone)) {
    return {
      blocked: true,
      reason: 'The specified phone number has been blacklisted for platform policy violations.',
    };
  }

  if (isHardwareSignatureBanned(details.userAgent)) {
    return {
      blocked: true,
      reason: 'Access from this device model is blocked due to active security sanctions.',
    };
  }

  return { blocked: false };
}
