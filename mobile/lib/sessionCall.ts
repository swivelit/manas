export const DEFAULT_MEETING_SERVER_URL = 'https://meet.jit.si';
export const PRE_START_JOIN_WINDOW_MIN = 10;
export const POST_START_JOIN_WINDOW_MIN = 30;

export type CallSessionType = 'VIDEO' | 'AUDIO';

export type SessionCallLike = {
  id?: string;
  type?: string | null;
  status?: string | null;
  scheduledAt?: string | null;
  meetingUrl?: string | null;
};

export type CallRoomConfig = {
  serverURL: string;
  room: string;
  isAudioOnly: boolean;
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

export function getCallRoomConfig(session: SessionCallLike): CallRoomConfig {
  if (!isCallSession(session.type)) {
    throw new Error('Only video and audio sessions can open a call.');
  }
  if (!session.meetingUrl?.trim()) {
    throw new Error('This session does not have a meeting room yet. Please refresh and try again.');
  }

  let parsed: URL;
  try {
    parsed = new URL(session.meetingUrl.trim(), DEFAULT_MEETING_SERVER_URL);
  } catch {
    throw new Error('This session has an invalid meeting room link.');
  }

  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
    throw new Error('This session has an unsupported meeting room link.');
  }

  let room: string;
  try {
    room = decodeURIComponent(parsed.pathname.replace(/^\/+|\/+$/g, ''));
  } catch {
    throw new Error('This session has an invalid meeting room name.');
  }
  if (!room) {
    throw new Error('This session meeting room is missing a room name.');
  }

  return {
    serverURL: `${parsed.protocol}//${parsed.host}`,
    room,
    isAudioOnly: session.type === 'AUDIO',
  };
}
