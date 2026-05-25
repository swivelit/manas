import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { requireAuth } from '../middleware/auth';
import { SessionType, SessionStatus } from '@prisma/client';

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

  // Create booking confirmation notification
  await prisma.notification.create({
    data: {
      userId: req.user!.id,
      type: 'BOOKING_CONFIRMED',
      title: 'Session confirmed!',
      body: `Your demo session with ${session.coach.user.name} has been confirmed.`,
    },
  });

  res.status(201).json(session);
});

router.get('/:id', requireAuth, async (req: Request, res: Response) => {
  const session = await prisma.session.findFirst({
    where: { id: req.params.id, userId: req.user!.id },
    include: {
      coach: { include: { user: { select: { name: true, avatarUrl: true } } } },
      topic: { select: { name: true, slug: true } },
    },
  });
  if (!session) { res.status(404).json({ error: 'Session not found' }); return; }
  res.json(session);
});

router.patch('/:id', requireAuth, async (req: Request, res: Response) => {
  const parsed = updateSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten() }); return; }

  const existing = await prisma.session.findFirst({ where: { id: req.params.id, userId: req.user!.id } });
  if (!existing) { res.status(404).json({ error: 'Session not found' }); return; }

  const data: { scheduledAt?: Date; status?: SessionStatus; notes?: string } = {};
  if (parsed.data.scheduledAt) data.scheduledAt = new Date(parsed.data.scheduledAt);
  if (parsed.data.status) data.status = parsed.data.status;
  if (parsed.data.notes) data.notes = parsed.data.notes;

  const session = await prisma.session.update({ where: { id: req.params.id }, data });
  res.json(session);
});

export default router;
