export const PRE_START_JOIN_WINDOW_MIN = 10;
export const POST_START_JOIN_WINDOW_MIN = 30;

export type CallSessionType = 'VIDEO' | 'AUDIO';
export type MeetingProvider = 'jaas' | 'self_hosted_jitsi' | 'open_jitsi';

export type SessionCallLike = {
  id?: string;
  type?: string | null;
  status?: string | null;
  scheduledAt?: string | null;
  meetingUrl?: string | null;
};

export type SessionCallConfig = {
  sessionId: string;
  room: string;
  serverURL: string;
  joinUrl: string;
  jwt: string | null;
  expiresAt: string;
  type: CallSessionType;
  isAudioOnly: boolean;
  provider: MeetingProvider;
};

export function isCallSession(type?: string | null): type is CallSessionType {
  return type === 'VIDEO' || type === 'AUDIO';
}

export function canJoinSession(session?: SessionCallLike | null, now = new Date()): boolean {
  if (!session || !isCallSession(session.type) || session.status !== 'CONFIRMED' || !session.scheduledAt) {
    return false;
  }

  const scheduledAt = new Date(session.scheduledAt);
  if (Number.isNaN(scheduledAt.getTime())) return false;

  const minsUntil = Math.floor((scheduledAt.getTime() - now.getTime()) / 60_000);
  return minsUntil <= PRE_START_JOIN_WINDOW_MIN && minsUntil >= -POST_START_JOIN_WINDOW_MIN;
}
