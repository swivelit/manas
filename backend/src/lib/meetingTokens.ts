import jwt from 'jsonwebtoken';
import { Role, SessionType } from '@prisma/client';
import { MeetingConfig } from './meetingConfig';

type MeetingUser = {
  id: string;
  email: string;
  name: string;
  avatarUrl: string | null;
};

type MeetingSession = {
  id: string;
  type: SessionType;
  userId: string;
  user: MeetingUser;
  coach: {
    userId: string;
    user: MeetingUser;
  };
};

type CurrentUser = {
  id: string;
  email: string;
  role: Role;
};

export type SignedMeetingToken = {
  jwt: string | null;
  expiresAt: Date;
};

function participantFor(session: MeetingSession, currentUser: CurrentUser): MeetingUser {
  if (session.userId === currentUser.id) return session.user;
  if (session.coach.userId === currentUser.id) return session.coach.user;
  throw new Error('Current user is not a participant in this session.');
}

function issuerFor(config: MeetingConfig): string {
  if (config.provider === 'jaas') return 'chat';
  return config.appId;
}

function signingKey(config: MeetingConfig): string {
  return config.jwtAlg === 'RS256' ? config.jwtPrivateKey : config.jwtSecret;
}

function keyIdFor(config: MeetingConfig): string | undefined {
  if (config.jwtAlg !== 'RS256' || !config.jwtKid) return undefined;
  return config.provider === 'jaas' ? `${config.appId}/${config.jwtKid}` : config.jwtKid;
}

export function signMeetingToken(input: {
  session: MeetingSession;
  currentUser: CurrentUser;
  room: string;
  config: MeetingConfig;
  now?: Date;
}): SignedMeetingToken {
  const now = input.now ?? new Date();
  const expiresAt = new Date(now.getTime() + input.config.tokenTtlMinutes * 60_000);

  if (input.config.provider === 'open_jitsi' && !input.config.authEnabled) {
    return { jwt: null, expiresAt };
  }

  const participant = participantFor(input.session, input.currentUser);
  const nbf = Math.floor((now.getTime() - 60_000) / 1000);
  const exp = Math.floor(expiresAt.getTime() / 1000);

  const payload = {
    aud: 'jitsi',
    iss: issuerFor(input.config),
    sub: input.config.appId,
    room: input.room,
    nbf,
    exp,
    context: {
      user: {
        id: participant.id,
        name: participant.name,
        email: participant.email,
        avatar: participant.avatarUrl ?? '',
        // MANAS MVP sessions are 1-to-1. Both the booked user and assigned
        // coach are moderators so either participant can start the room.
        moderator: true,
      },
    },
  };

  const signOptions: jwt.SignOptions = {
    algorithm: input.config.jwtAlg,
    noTimestamp: true,
  };
  const keyid = keyIdFor(input.config);
  if (keyid) signOptions.keyid = keyid;

  return {
    jwt: jwt.sign(payload, signingKey(input.config), signOptions),
    expiresAt,
  };
}
