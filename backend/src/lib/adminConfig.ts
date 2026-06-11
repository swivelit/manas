export const DEFAULT_ADMIN_EMAIL = 'admin@manas.app';
export const DEFAULT_ADMIN_PASSWORD = 'adminpass123';
export const DEFAULT_ADMIN_NAME = 'MANAS Admin';

export type AdminCredentialConfig = {
  email: string;
  password: string;
  name: string;
};

type AdminCredentialConfigOptions = {
  allowDefaults?: boolean;
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function getAdminCredentialConfig(options: AdminCredentialConfigOptions = {}): AdminCredentialConfig {
  const isProduction = process.env.NODE_ENV === 'production';
  const allowDefaults = options.allowDefaults ?? !isProduction;

  const rawEmail = process.env.ADMIN_EMAIL;
  const rawPassword = process.env.ADMIN_PASSWORD;
  const rawName = process.env.ADMIN_NAME;

  const missingEmail = !rawEmail?.trim();
  const missingPassword = rawPassword === undefined || rawPassword.length === 0;

  if (!allowDefaults && (missingEmail || missingPassword)) {
    throw new Error('ADMIN_EMAIL and ADMIN_PASSWORD must be set in production.');
  }

  const email = (missingEmail ? DEFAULT_ADMIN_EMAIL : (rawEmail?.trim() ?? DEFAULT_ADMIN_EMAIL)).toLowerCase();
  const password = missingPassword ? DEFAULT_ADMIN_PASSWORD : rawPassword;
  const name = (rawName?.trim() || DEFAULT_ADMIN_NAME);

  if (!EMAIL_PATTERN.test(email)) {
    throw new Error('ADMIN_EMAIL must be a valid email address.');
  }
  if (password.length < 8) {
    throw new Error('ADMIN_PASSWORD must be at least 8 characters.');
  }

  return { email, password, name };
}
