import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { requireAuth, requireRole } from '../middleware/auth';
import { Role, SessionStatus, VideoType } from '@prisma/client';
import { notifyUser } from '../lib/notifications';

const router = Router();

// Every coach route requires an authenticated COACH that also has a Coach
// profile row. We resolve the coachId once here and stash it on res.locals.
router.use(requireAuth, requireRole(Role.COACH), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const coach = await prisma.coach.findUnique({ where: { userId: req.user!.id }, select: { id: true } });
    if (!coach) {
      res.status(403).json({ error: 'No coach profile is linked to this account.' });
      return;
    }
    res.locals.coachId = coach.id;
    next();
  } catch (err) {
    next(err);
  }
});

// GET /coach/appointments — this coach's sessions (upcoming + past).
router.get('/appointments', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const coachId = res.locals.coachId as string;
    const sessions = await prisma.session.findMany({
      where: { coachId },
      include: {
        user: { select: { name: true, avatarUrl: true } },
        topic: { select: { name: true, slug: true } },
      },
      orderBy: { scheduledAt: 'asc' },
    });
    res.json(sessions);
  } catch (err) {
    next(err);
  }
});

// PATCH /coach/sessions/:id — accept (CONFIRMED), decline (CANCELLED), or
// mark COMPLETED. Only the owning coach may update; the client is notified.
const sessionStatusSchema = z.object({
  status: z.enum(['CONFIRMED', 'CANCELLED', 'COMPLETED']),
});

router.patch('/sessions/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const coachId = res.locals.coachId as string;
    const parsed = sessionStatusSchema.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten() }); return; }

    const existing = await prisma.session.findFirst({
      where: { id: req.params.id, coachId },
      include: { coach: { include: { user: { select: { name: true } } } } },
    });
    if (!existing) { res.status(404).json({ error: 'Session not found' }); return; }

    const status = parsed.data.status as SessionStatus;
    const session = await prisma.session.update({ where: { id: existing.id }, data: { status } });

    const coachName = existing.coach.user.name;
    if (status === SessionStatus.CONFIRMED && existing.status !== SessionStatus.CONFIRMED) {
      void notifyUser({ userId: existing.userId, type: 'BOOKING_CONFIRMED', title: 'Session confirmed', body: `${coachName} confirmed your session.`, data: { sessionId: session.id } });
    } else if (status === SessionStatus.CANCELLED && existing.status !== SessionStatus.CANCELLED) {
      void notifyUser({ userId: existing.userId, type: 'SESSION_CANCELLED', title: 'Session unavailable', body: `${coachName} can't make this slot. You can rebook anytime.`, data: { sessionId: session.id } });
    } else if (status === SessionStatus.COMPLETED && existing.status !== SessionStatus.COMPLETED) {
      void notifyUser({ userId: existing.userId, type: 'SESSION_COMPLETED', title: 'Session complete', body: 'How was it? Tap to leave a quick note.', data: { sessionId: session.id } });
    }

    res.json(session);
  } catch (err) {
    next(err);
  }
});

// GET /coach/availability — this coach's weekly availability rows.
router.get('/availability', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const coachId = res.locals.coachId as string;
    const rows = await prisma.availability.findMany({
      where: { coachId },
      orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
    });
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

// PUT /coach/availability — replace the full availability set in one shot.
const availabilitySchema = z.object({
  availability: z.array(
    z.object({
      dayOfWeek: z.number().int().min(0).max(6),
      startTime: z.string().regex(/^\d{2}:\d{2}$/, 'Use HH:MM'),
      endTime: z.string().regex(/^\d{2}:\d{2}$/, 'Use HH:MM'),
    }).refine(a => a.startTime < a.endTime, { message: 'End time must be after start time' })
  ).max(50),
});

router.put('/availability', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const coachId = res.locals.coachId as string;
    const parsed = availabilitySchema.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten() }); return; }

    await prisma.$transaction([
      prisma.availability.deleteMany({ where: { coachId } }),
      prisma.availability.createMany({ data: parsed.data.availability.map(a => ({ ...a, coachId })) }),
    ]);

    const rows = await prisma.availability.findMany({
      where: { coachId },
      orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
    });
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

// POST /coach/videos — coach adds a library video. Ownership is conceptual
// (the Video model has no owner column in v1); admins can approve later.
const videoSchema = z.object({
  title: z.string().trim().min(2),
  description: z.string().trim().min(2),
  url: z.string().url(),
  thumbnailUrl: z.string().url().optional(),
  subtitleUrl: z.string().url().optional(),
  durationSec: z.number().int().positive().max(60 * 60 * 6).optional(),
  type: z.nativeEnum(VideoType),
  isPremium: z.boolean().optional(),
  topicId: z.string().optional(),
});

router.post('/videos', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = videoSchema.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten() }); return; }
    const d = parsed.data;

    const video = await prisma.video.create({
      data: {
        title: d.title,
        description: d.description,
        url: d.url,
        thumbnailUrl: d.thumbnailUrl ?? '',
        subtitleUrl: d.subtitleUrl,
        durationSec: d.durationSec ?? 0,
        type: d.type,
        isPremium: d.isPremium ?? false,
        topicId: d.topicId || null,
      },
    });
    res.status(201).json(video);
  } catch (err) {
    next(err);
  }
});

export default router;
