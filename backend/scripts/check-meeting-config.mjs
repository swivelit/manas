#!/usr/bin/env node

const env = process.env;
const meetingVars = [
  'MEETING_PROVIDER',
  'MEETING_SERVER_URL',
  'MEETING_APP_ID',
  'MEETING_JWT_KID',
  'MEETING_JWT_PRIVATE_KEY',
  'MEETING_JWT_SECRET',
  'MEETING_JWT_ALG',
  'MEETING_TOKEN_TTL_MINUTES',
  'MEETING_ENABLE_AUTH',
  'MEETING_ALLOW_INSECURE_OPEN_JITSI',
];

const isSet = (name) => typeof env[name] === 'string' && env[name].trim().length > 0;
const isProduction = env.NODE_ENV?.trim().toLowerCase() === 'production';
const errors = [];

console.log('[meeting-config] preflight');
for (const name of meetingVars) {
  console.log(`${name}: ${isSet(name) ? 'SET' : 'MISSING'}`);
}

function parseBoolean(name, fallback) {
  if (!isSet(name)) return fallback;
  const normalized = env[name].trim().toLowerCase();
  if (['1', 'true', 'yes', 'on'].includes(normalized)) return true;
  if (['0', 'false', 'no', 'off'].includes(normalized)) return false;
  errors.push(`Invalid ${name}; use true or false.`);
  return fallback;
}

function deriveProvider() {
  if (!isSet('MEETING_PROVIDER')) return isProduction ? 'jaas' : 'open_jitsi';
  const provider = env.MEETING_PROVIDER.trim().toLowerCase();
  if (['jaas', 'self_hosted_jitsi', 'open_jitsi'].includes(provider)) return provider;
  errors.push('Invalid MEETING_PROVIDER; use jaas, self_hosted_jitsi, or open_jitsi.');
  return 'invalid';
}

function deriveJwtAlg(provider) {
  if (!isSet('MEETING_JWT_ALG')) return provider === 'jaas' ? 'RS256' : 'HS256';
  const alg = env.MEETING_JWT_ALG.trim().toUpperCase();
  if (alg === 'RS256' || alg === 'HS256') return alg;
  errors.push('Invalid MEETING_JWT_ALG; use RS256 or HS256.');
  return alg;
}

function validateServerUrl(provider) {
  const value = isSet('MEETING_SERVER_URL')
    ? env.MEETING_SERVER_URL.trim().replace(/\/+$/, '')
    : provider === 'jaas'
      ? 'https://8x8.vc'
      : '';
  if (!value) {
    errors.push(`MEETING_SERVER_URL is required for ${provider} meetings.`);
    return;
  }
  try {
    const url = new URL(value);
    if (isProduction && url.protocol !== 'https:') {
      errors.push('MEETING_SERVER_URL must use HTTPS in production.');
    }
  } catch {
    errors.push('MEETING_SERVER_URL must be a valid HTTPS URL.');
  }
}

const provider = deriveProvider();
const authEnabled = parseBoolean('MEETING_ENABLE_AUTH', provider !== 'open_jitsi');
const allowInsecureOpenJitsi = parseBoolean('MEETING_ALLOW_INSECURE_OPEN_JITSI', false);
const jwtAlg = deriveJwtAlg(provider);

console.log(`Derived provider: ${provider}`);
console.log(`Derived auth: ${authEnabled ? 'enabled' : 'disabled'}`);
console.log(`Environment: ${isProduction ? 'production' : 'non-production'}`);

validateServerUrl(provider);

if (isSet('MEETING_JWT_KID') && env.MEETING_JWT_KID.includes('/')) {
  const message = 'MEETING_JWT_KID must be only the short suffix after the slash; meetingTokens.ts builds `${appId}/${kid}` itself.';
  console.error(`[meeting-config] ERROR — ${message}`);
  errors.push(message);
}

if (isSet('MEETING_JWT_PRIVATE_KEY') && (!env.MEETING_JWT_PRIVATE_KEY.includes('BEGIN') || !env.MEETING_JWT_PRIVATE_KEY.includes('PRIVATE KEY'))) {
  const message = 'MEETING_JWT_PRIVATE_KEY looks truncated; the value should contain BEGIN and PRIVATE KEY.';
  console.error(`[meeting-config] ERROR — ${message}`);
  errors.push(message);
}

if (provider === 'open_jitsi') {
  if (isProduction && !allowInsecureOpenJitsi) {
    errors.push('Production video calls require MEETING_PROVIDER=jaas or self_hosted_jitsi with backend JWT auth configured.');
  }
} else {
  if (!authEnabled) errors.push('MEETING_ENABLE_AUTH must be true for authenticated video calls.');
  if (!isSet('MEETING_APP_ID')) errors.push('MEETING_APP_ID is required for authenticated video calls.');

  if (provider === 'jaas') {
    if (jwtAlg !== 'RS256') errors.push('JaaS meetings require MEETING_JWT_ALG=RS256.');
    if (!isSet('MEETING_JWT_KID') || !isSet('MEETING_JWT_PRIVATE_KEY')) {
      errors.push('JaaS meetings require MEETING_JWT_KID and MEETING_JWT_PRIVATE_KEY.');
    }
  } else if (jwtAlg === 'HS256' && !isSet('MEETING_JWT_SECRET')) {
    errors.push('Self-hosted Jitsi HS256 auth requires MEETING_JWT_SECRET.');
  } else if (jwtAlg === 'RS256' && (!isSet('MEETING_JWT_KID') || !isSet('MEETING_JWT_PRIVATE_KEY'))) {
    errors.push('Self-hosted Jitsi RS256 auth requires MEETING_JWT_KID and MEETING_JWT_PRIVATE_KEY.');
  }
}

if (isSet('MEETING_TOKEN_TTL_MINUTES')) {
  const ttl = Number(env.MEETING_TOKEN_TTL_MINUTES);
  if (!Number.isFinite(ttl) || ttl < 5 || ttl > 24 * 60) {
    errors.push('Invalid MEETING_TOKEN_TTL_MINUTES; use a value between 5 and 1440.');
  }
}

if (errors.length === 0) {
  console.log('Combination passes validation: YES');
} else {
  console.error('Combination passes validation: NO');
  for (const error of errors) console.error(`[meeting-config] ${error}`);
  process.exitCode = 1;
}
