import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const requiredReleaseEnv = [
  'EXPO_PUBLIC_API_URL',
  'EXPO_PUBLIC_FIREBASE_API_KEY',
  'EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN',
  'EXPO_PUBLIC_FIREBASE_PROJECT_ID',
  'EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET',
  'EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID',
  'EXPO_PUBLIC_FIREBASE_APP_ID',
];

export function getMissingReleaseEnv(env = process.env) {
  return requiredReleaseEnv.filter(name => !env[name]);
}

export function getRequiredReleaseEnv() {
  return [...requiredReleaseEnv];
}

function loadEnvFile(path) {
  if (!existsSync(path)) return;
  for (const rawLine of readFileSync(path, 'utf8').split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const match = /^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/.exec(line.replace(/^export\s+/, ''));
    if (!match) continue;
    const [, key, rawValue] = match;
    if (process.env[key]) continue;
    process.env[key] = rawValue.trim().replace(/^['"]|['"]$/g, '');
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  loadEnvFile(resolve(process.cwd(), '.env'));
  loadEnvFile(resolve(process.cwd(), '.env.production'));
  loadEnvFile(resolve(process.cwd(), '.env.local'));

  const missing = getMissingReleaseEnv();
  const strict = process.env.JAI_REQUIRE_RELEASE_BACKEND_FIRST_CONFIG === '1';

  if (missing.length > 0) {
    console.error('MANAS release backend/Firebase config is incomplete.');
    console.error(`Missing public env vars: ${missing.join(', ')}`);
    console.error('Debug-only local smoke can use: EXPO_PUBLIC_E2E_MOCK_AUTH=1 npm run start:clear');
    if (strict) process.exit(1);
  }

  console.log('MANAS release backend/Firebase config check completed.');
}
