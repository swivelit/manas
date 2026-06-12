import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { requireAuth } from '../middleware/auth';
import { SessionType, SessionStatus } from '@prisma/client';
import { notifyUser } from '../lib/notifications';
import {
  MeetingConfigError,
  buildMeetingJoinUrl,
  buildRoomName,
  buildStoredMeetingUrl,
  getMeetingConfig,
  isWithinCallWindow,
} from '../lib/meetingConfig';
import { signMeetingToken } from '../lib/meetingTokens';

const router = Router();

const createSchema = z.object({
  coachId: z.string(),
  topicId: z.string(),
  scheduledAt: z.string().datetime(),
  type: z.nativeEnum(SessionType),
});

const updateSchema = z.object({
  scheduledAt: z.string().datetime().optional(),
  status: z.nativeEnum(SessionStatus).optional(),
  notes: z.string().optional(),
});

const messageSchema = z.object({
  body: z.string().trim().min(1).max(2000),
});

function canAccessSession(session: { userId: string; coach: { userId: string } }, userId: string): boolean {
  return session.userId === userId || session.coach.userId === userId;
}

function isCallSession(type: SessionType): boolean {
  return type === SessionType.VIDEO || type === SessionType.AUDIO;
}

router.get('/', requireAuth, async (req: Request, res: Response) => {
  const sessions = await prisma.session.findMany({
    where: { userId: req.user!.id },
    include: {
      coach: { include: { user: { select: { name: true, avatarUrl: true } } } },
      topic: { select: { name: true, slug: true } },
    },
    orderBy: { scheduledAt: 'asc' },
  });
  res.json(sessions);
});

router.post('/', requireAuth, async (req: Request, res: Response) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten() }); return; }

  const { coachId, topicId, scheduledAt, type } = parsed.data;

  const [coach, topic] = await Promise.all([
    prisma.coach.findUnique({ where: { id: coachId } }),
    prisma.topic.findUnique({ where: { id: topicId } }),
  ]);

  if (!coach) { res.status(404).json({ error: 'Coach not found' }); return; }
  if (!topic) { res.status(404).json({ error: 'Topic not found' }); return; }

  const session = await prisma.session.create({
    data: {
      userId: req.user!.id,
      coachId,
      topicId,
      scheduledAt: new Date(scheduledAt),
      type,
      status: SessionStatus.CONFIRMED,
      isDemo: true,
    },
    include: {
      coach: { include: { user: { select: { name: true, avatarUrl: true } } } },
      topic: { select: { name: true, slug: true } },
    },
  });

  const meetingUrl = buildStoredMeetingUrl(session.id, session.type);
  await prisma.session.update({ where: { id: session.id }, data: { meetingUrl } });
  (session as typeof session & { meetingUrl: string | null }).meetingUrl = meetingUrl;

  await notifyUser({
    userId: req.user!.id,
    type: 'BOOKING_CONFIRMED',
    title: 'Session confirmed',
    body: `Your demo session with ${session.coach.user.name} has been confirmed.`,
    data: { sessionId: session.id },
  });

  res.status(201).json(session);
});

router.get('/:id/messages', requireAuth, async (req: Request, res: Response) => {
  const session = await prisma.session.findUnique({
    where: { id: req.params.id },
    select: {
      id: true,
      userId: true,
      type: true,
      coach: { select: { userId: true } },
    },
  });
  if (!session) { res.status(404).json({ error: 'Session not found' }); return; }
  if (!canAccessSession(session, req.user!.id)) { res.status(403).json({ error: 'Forbidden' }); return; }
  if (session.type !== SessionType.CHAT) { res.status(400).json({ error: 'Messages are only available for chat sessions.' }); return; }

  const messages = await prisma.chatMessage.findMany({
    where: { sessionId: session.id },
    include: {
      sender: { select: { id: true, name: true, avatarUrl: true, role: true } },
    },
    orderBy: { createdAt: 'asc' },
  });
  res.json(messages);
});

router.post('/:id/messages', requireAuth, async (req: Request, res: Response) => {
  const parsed = messageSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten() }); return; }

  const session = await prisma.session.findUnique({
    where: { id: req.params.id },
    select: {
      id: true,
      userId: true,
      type: true,
      coach: { select: { userId: true } },
    },
  });
  if (!session) { res.status(404).json({ error: 'Session not found' }); return; }
  if (!canAccessSession(session, req.user!.id)) { res.status(403).json({ error: 'Forbidden' }); return; }
  if (session.type !== SessionType.CHAT) { res.status(400).json({ error: 'Messages are only available for chat sessions.' }); return; }

  const message = await prisma.chatMessage.create({
    data: {
      sessionId: session.id,
      senderId: req.user!.id,
      body: parsed.data.body,
    },
    include: {
      sender: { select: { id: true, name: true, avatarUrl: true, role: true } },
    },
  });
  res.status(201).json(message);
});

router.get('/:id/call-config', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const session = await prisma.session.findUnique({
      where: { id: req.params.id },
      include: {
        user: { select: { id: true, email: true, name: true, avatarUrl: true } },
        coach: {
          include: {
            user: { select: { id: true, email: true, name: true, avatarUrl: true } },
          },
        },
      },
    });

    if (!session) { res.status(404).json({ error: 'Session not found' }); return; }
    if (!canAccessSession(session, req.user!.id)) { res.status(403).json({ error: 'Forbidden' }); return; }
    if (!isCallSession(session.type)) { res.status(400).json({ error: 'Call config is only available for video and audio sessions.' }); return; }
    if (session.status === SessionStatus.CANCELLED) { res.status(409).json({ error: 'This session has been cancelled.' }); return; }
    if (session.status !== SessionStatus.CONFIRMED) { res.status(409).json({ error: 'This session is not confirmed yet.' }); return; }
    if (!isWithinCallWindow(session.scheduledAt)) {
      res.status(403).json({ error: 'The meeting opens 10 minutes before start and remains available for 30 minutes after.' });
      return;
    }

    const config = getMeetingConfig({ validateAuth: true });
    const room = buildRoomName(session.id);
    const signed = signMeetingToken({
      session,
      currentUser: req.user!,
      room,
      config,
    });
    const isAudioOnly = session.type === SessionType.AUDIO;
    const joinUrl = buildMeetingJoinUrl({
      config,
      room,
      jwt: signed.jwt,
      isAudioOnly,
    });

    res.json({
      sessionId: session.id,
      room,
      serverURL: config.serverURL,
      joinUrl,
      jwt: signed.jwt,
      expiresAt: signed.expiresAt.toISOString(),
      type: session.type,
      isAudioOnly,
      provider: config.provider,
    });
  } catch (error) {
    if (error instanceof MeetingConfigError) {
      res.status(error.statusCode).json({ error: error.message, code: error.code });
      return;
    }
    next(error);
  }
});

router.get('/:id', requireAuth, async (req: Request, res: Response) => {
  const session = await prisma.session.findUnique({
    where: { id: req.params.id },
    include: {
      coach: { include: { user: { select: { name: true, avatarUrl: true } } } },
      topic: { select: { name: true, slug: true } },
    },
  });
  if (!session) { res.status(404).json({ error: 'Session not found' }); return; }
  if (!canAccessSession(session, req.user!.id)) { res.status(403).json({ error: 'Forbidden' }); return; }
  res.json(session);
});

router.patch('/:id', requireAuth, async (req: Request, res: Response) => {
  const parsed = updateSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten() }); return; }

  const existing = await prisma.session.findFirst({
    where: { id: req.params.id, userId: req.user!.id },
    include: { coach: { include: { user: { select: { name: true } } } } },
  });
  if (!existing) { res.status(404).json({ error: 'Session not found' }); return; }

  const data: { scheduledAt?: Date; status?: SessionStatus; notes?: string; remindedAt?: null } = {};
  let scheduledChanged = false;
  if (parsed.data.scheduledAt) {
    data.scheduledAt = new Date(parsed.data.scheduledAt);
    scheduledChanged = data.scheduledAt.getTime() !== existing.scheduledAt.getTime();
    if (scheduledChanged) data.remindedAt = null; // re-arm the reminder for the new slot.
  }
  if (parsed.data.status) data.status = parsed.data.status;
  if (parsed.data.notes) data.notes = parsed.data.notes;

  const session = await prisma.session.update({ where: { id: req.params.id }, data });

  // Side-effect notifications, fire and forget.
  if (scheduledChanged) {
    void notifyUser({
      userId: existing.userId,
      type: 'SESSION_RESCHEDULED',
      title: 'Session rescheduled',
      body: `Your session with ${existing.coach.user.name} has a new time.`,
      data: { sessionId: session.id },
    });
  }
  if (parsed.data.status === SessionStatus.COMPLETED && existing.status !== SessionStatus.COMPLETED) {
    void notifyUser({
      userId: existing.userId,
      type: 'SESSION_COMPLETED',
      title: 'Session complete',
      body: 'How was it? Tap to leave a quick note.',
      data: { sessionId: session.id },
    });
  }
  if (parsed.data.status === SessionStatus.CANCELLED && existing.status !== SessionStatus.CANCELLED) {
    void notifyUser({
      userId: existing.userId,
      type: 'SESSION_CANCELLED',
      title: 'Session cancelled',
      body: 'Your session has been cancelled. You can book a new time anytime.',
      data: { sessionId: session.id },
    });
  }

  res.json(session);
});

export default router;
