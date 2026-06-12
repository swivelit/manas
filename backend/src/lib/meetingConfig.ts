import { SessionType } from '@prisma/client';

export const PRE_START_JOIN_WINDOW_MIN = 10;
export const POST_START_JOIN_WINDOW_MIN = 30;

export type MeetingProvider = 'jaas' | 'self_hosted_jitsi' | 'open_jitsi';
export type MeetingJwtAlg = 'RS256' | 'HS256';

export class MeetingConfigError extends Error {
  code = 'MEETING_CONFIG_ERROR';
  statusCode = 503;
}

export type MeetingConfig = {
  provider: MeetingProvider;
  serverURL: string;
  appId: string;
  jwtKid: string;
  jwtPrivateKey: string;
  jwtSecret: string;
  jwtAlg: MeetingJwtAlg;
  tokenTtlMinutes: number;
  authEnabled: boolean;
  isProduction: boolean;
};

function trim(value: string | undefined): string {
  return value?.trim() ?? '';
}

function normalizePrivateKey(value: string): string {
  return value.replace(/\\n/g, '\n').trim();
}

function parseBoolean(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined) return fallback;
  const normalized = value.trim().toLowerCase();
  if (['1', 'true', 'yes', 'on'].includes(normalized)) return true;
  if (['0', 'false', 'no', 'off'].includes(normalized)) return false;
  throw new MeetingConfigError('Invalid MEETING_ENABLE_AUTH value. Use true or false.');
}

function parseProvider(value: string | undefined, isProduction: boolean): MeetingProvider {
  const normalized = trim(value).toLowerCase();
  if (!normalized) return isProduction ? 'jaas' : 'open_jitsi';
  if (normalized === 'jaas' || normalized === 'self_hosted_jitsi' || normalized === 'open_jitsi') {
    return normalized;
  }
  throw new MeetingConfigError('Invalid MEETING_PROVIDER. Use jaas, self_hosted_jitsi, or open_jitsi.');
}

function parseJwtAlg(value: string | undefined, provider: MeetingProvider): MeetingJwtAlg {
  const normalized = trim(value).toUpperCase();
  if (!normalized) return provider === 'jaas' ? 'RS256' : 'HS256';
  if (normalized === 'RS256' || normalized === 'HS256') return normalized;
  throw new MeetingConfigError('Invalid MEETING_JWT_ALG. Use RS256 or HS256.');
}

function parseTokenTtlMinutes(value: string | undefined): number {
  if (!value) return 120;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 5 || parsed > 24 * 60) {
    throw new MeetingConfigError('Invalid MEETING_TOKEN_TTL_MINUTES. Use a value between 5 and 1440.');
  }
  return Math.floor(parsed);
}

function defaultServerURL(provider: MeetingProvider): string {
  if (provider === 'jaas') return 'https://8x8.vc';
  throw new MeetingConfigError(`MEETING_SERVER_URL is required for ${provider} meetings.`);
}

function normalizeServerURL(value: string): string {
  const trimmed = value.trim().replace(/\/+$/, '');
  if (!trimmed) throw new MeetingConfigError('MEETING_SERVER_URL is required for in-app calls.');
  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    throw new MeetingConfigError('MEETING_SERVER_URL must be a valid HTTPS URL.');
  }
  if (parsed.protocol !== 'https:' && process.env.NODE_ENV === 'production') {
    throw new MeetingConfigError('MEETING_SERVER_URL must use HTTPS in production.');
  }
  return trimmed;
}

export function buildRoomName(sessionId: string): string {
  const safeId = sessionId.replace(/[^A-Za-z0-9_-]/g, '');
  if (!safeId) throw new MeetingConfigError('Session id cannot be used as a meeting room.');
  return `manas-${safeId}`;
}

export function getMeetingConfig(options: { validateAuth?: boolean } = {}): MeetingConfig {
  const isProduction = process.env.NODE_ENV === 'production';
  const provider = parseProvider(process.env.MEETING_PROVIDER, isProduction);
  const authEnabled = parseBoolean(process.env.MEETING_ENABLE_AUTH, provider !== 'open_jitsi');
  const jwtAlg = parseJwtAlg(process.env.MEETING_JWT_ALG, provider);

  const config: MeetingConfig = {
    provider,
    serverURL: normalizeServerURL(trim(process.env.MEETING_SERVER_URL) || defaultServerURL(provider)),
    appId: trim(process.env.MEETING_APP_ID),
    jwtKid: trim(process.env.MEETING_JWT_KID),
    jwtPrivateKey: normalizePrivateKey(trim(process.env.MEETING_JWT_PRIVATE_KEY)),
    jwtSecret: trim(process.env.MEETING_JWT_SECRET),
    jwtAlg,
    tokenTtlMinutes: parseTokenTtlMinutes(process.env.MEETING_TOKEN_TTL_MINUTES),
    authEnabled,
    isProduction,
  };

  if (options.validateAuth) validateMeetingAuthConfig(config);
  return config;
}

export function validateMeetingAuthConfig(config: MeetingConfig): void {
  if (config.provider === 'open_jitsi') {
    if (config.isProduction) {
      throw new MeetingConfigError(
        'Production video calls require MEETING_PROVIDER=jaas or self_hosted_jitsi with backend JWT auth configured.'
      );
    }
    return;
  }

  if (!config.authEnabled) {
    throw new MeetingConfigError('MEETING_ENABLE_AUTH must be true for authenticated video calls.');
  }

  if (!config.appId) {
    throw new MeetingConfigError('MEETING_APP_ID is required for authenticated video calls.');
  }

  if (config.provider === 'jaas') {
    if (config.jwtAlg !== 'RS256') {
      throw new MeetingConfigError('JaaS meetings require MEETING_JWT_ALG=RS256.');
    }
    if (!config.jwtKid || !config.jwtPrivateKey) {
      throw new MeetingConfigError('JaaS meetings require MEETING_JWT_KID and MEETING_JWT_PRIVATE_KEY.');
    }
    return;
  }

  if (config.jwtAlg === 'HS256' && !config.jwtSecret) {
    throw new MeetingConfigError('Self-hosted Jitsi HS256 auth requires MEETING_JWT_SECRET.');
  }
  if (config.jwtAlg === 'RS256' && (!config.jwtKid || !config.jwtPrivateKey)) {
    throw new MeetingConfigError('Self-hosted Jitsi RS256 auth requires MEETING_JWT_KID and MEETING_JWT_PRIVATE_KEY.');
  }
}

function providerPath(config: MeetingConfig, room: string): string {
  const parts = config.provider === 'jaas' && config.appId ? [config.appId, room] : [room];
  return parts.map(part => encodeURIComponent(part)).join('/');
}

export function buildStoredMeetingUrl(sessionId: string, type: SessionType): string | null {
  if (type === SessionType.CHAT) return null;
  const config = getMeetingConfig();
  return `${config.serverURL}/${providerPath(config, buildRoomName(sessionId))}`;
}

export function buildMeetingJoinUrl(input: {
  config: MeetingConfig;
  room: string;
  jwt: string | null;
  isAudioOnly: boolean;
}): string {
  const url = new URL(`${input.config.serverURL}/${providerPath(input.config, input.room)}`);
  if (input.jwt) url.searchParams.set('jwt', input.jwt);

  const hash = new URLSearchParams({
    'config.disableCalendarIntegration': 'true',
    'config.disableDeepLinking': 'true',
    'config.disableInviteFunctions': 'true',
    'config.prejoinPageEnabled': 'false',
    'config.startAudioOnly': String(input.isAudioOnly),
    'config.startWithVideoMuted': String(input.isAudioOnly),
  });
  url.hash = hash.toString();
  return url.toString();
}

export function getCallWindow(scheduledAt: Date): { opensAt: Date; closesAt: Date } {
  return {
    opensAt: new Date(scheduledAt.getTime() - PRE_START_JOIN_WINDOW_MIN * 60_000),
    closesAt: new Date(scheduledAt.getTime() + POST_START_JOIN_WINDOW_MIN * 60_000),
  };
}

export function isWithinCallWindow(scheduledAt: Date, now = new Date()): boolean {
  const { opensAt, closesAt } = getCallWindow(scheduledAt);
  return now >= opensAt && now <= closesAt;
}
