import crypto from 'crypto';

export const OTP_PURPOSE = 'AUTH';
export const MAX_OTP_ATTEMPTS = 5;

const DEFAULT_OTP_LENGTH = 6;
const DEFAULT_OTP_EXPIRY_MINUTES = 10;

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function getOtpLength(): number {
  const value = Number.parseInt(process.env.OTP_LENGTH ?? '', 10);
  if (Number.isInteger(value) && value >= 4 && value <= 10) return value;
  return DEFAULT_OTP_LENGTH;
}

export function getOtpExpiryMinutes(): number {
  const value = Number.parseInt(process.env.OTP_EXPIRY_MINUTES ?? '', 10);
  if (Number.isInteger(value) && value > 0 && value <= 60) return value;
  return DEFAULT_OTP_EXPIRY_MINUTES;
}

export function getOtpExpiresAt(expiryMinutes = getOtpExpiryMinutes()): Date {
  return new Date(Date.now() + expiryMinutes * 60 * 1000);
}

export function generateNumericOtp(length = getOtpLength()): string {
  let otp = '';
  for (let index = 0; index < length; index += 1) {
    otp += crypto.randomInt(0, 10).toString();
  }
  return otp;
}

export function hashOtp(email: string, otp: string, purpose = OTP_PURPOSE): string {
  const secret = process.env.OTP_SECRET ?? process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET or OTP_SECRET is required for email OTP auth');
  }

  return crypto
    .createHmac('sha256', secret)
    .update(`${normalizeEmail(email)}:${purpose}:${otp}`)
    .digest('hex');
}

export function verifyOtpHash(email: string, otp: string, otpHash: string, purpose = OTP_PURPOSE): boolean {
  const candidateHash = hashOtp(email, otp, purpose);
  const candidate = Buffer.from(candidateHash, 'hex');
  const stored = Buffer.from(otpHash, 'hex');

  return candidate.length === stored.length && crypto.timingSafeEqual(candidate, stored);
}

export function isEmailOtpDryRun(): boolean {
  return process.env.EMAIL_OTP_DRY_RUN === 'true' && process.env.NODE_ENV !== 'production';
}
