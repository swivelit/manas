import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { requireAuth, requireRole } from '../middleware/auth';
import { Role, SessionStatus, VideoType } from '@prisma/client';
import { broadcastNotification } from '../lib/notifications';

// NOTE: a richer web admin dashboard is a v1.1 candidate. This mobile admin
// area satisfies the PDF §4.C role requirement for v1.

const router = Router();

router.use(requireAuth, requireRole(Role.ADMIN));

// GET /admin/stats — headline counts for the dashboard.
router.get('/stats', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const [users, coaches, videos, premiumUsers, pending, confirmed, completed, cancelled, sessionsThisWeek] = await Promise.all([
      prisma.user.count(),
      prisma.coach.count(),
      prisma.video.count(),
      prisma.user.count({ where: { isPremium: true } }),
      prisma.session.count({ where: { status: SessionStatus.PENDING } }),
      prisma.session.count({ where: { status: SessionStatus.CONFIRMED } }),
      prisma.session.count({ where: { status: SessionStatus.COMPLETED } }),
      prisma.session.count({ where: { status: SessionStatus.CANCELLED } }),
      prisma.session.count({ where: { createdAt: { gte: weekAgo } } }),
    ]);
    res.json({
      users,
      coaches,
      videos,
      premiumUsers,
      sessionsThisWeek,
      sessions: { pending, confirmed, completed, cancelled, total: pending + confirmed + completed + cancelled },
    });
  } catch (err) {
    next(err);
  }
});

const userListFields = {
  id: true, email: true, name: true, role: true, isPremium: true, isActive: true, createdAt: true,
} as const;

// GET /admin/users?page=&pageSize= — paginated user list.
router.get('/users', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = Math.max(1, parseInt(String(req.query.page ?? '1'), 10) || 1);
    const pageSize = Math.min(100, Math.max(1, parseInt(String(req.query.pageSize ?? '20'), 10) || 20));
    const [items, total] = await Promise.all([
      prisma.user.findMany({ select: userListFields, orderBy: { createdAt: 'desc' }, skip: (page - 1) * pageSize, take: pageSize }),
      prisma.user.count(),
    ]);
    res.json({ items, total, page, pageSize });
  } catch (err) {
    next(err);
  }
});

// PATCH /admin/users/:id — change role, toggle premium, activate/deactivate.
const updateUserSchema = z.object({
  role: z.nativeEnum(Role).optional(),
  isPremium: z.boolean().optional(),
  isActive: z.boolean().optional(),
});

router.patch('/users/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = updateUserSchema.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten() }); return; }

    // Guard against an admin locking themselves out.
    if (req.params.id === req.user!.id) {
      if (parsed.data.isActive === false || (parsed.data.role && parsed.data.role !== Role.ADMIN)) {
        res.status(400).json({ error: "You can't deactivate or demote your own admin account." });
        return;
      }
    }

    const target = await prisma.user.findUnique({ where: { id: req.params.id }, select: { id: true } });
    if (!target) { res.status(404).json({ error: 'User not found' }); return; }

    const user = await prisma.user.update({
      where: { id: req.params.id },
      data: parsed.data,
      select: userListFields,
    });
    res.json(user);
  } catch (err) {
    next(err);
  }
});

// GET /admin/coaches — coaches with their linked user info.
router.get('/coaches', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const coaches = await prisma.coach.findMany({
      include: { user: { select: { id: true, name: true, email: true, avatarUrl: true, isActive: true } } },
      orderBy: { user: { name: 'asc' } },
    });
    res.json(coaches);
  } catch (err) {
    next(err);
  }
});

// POST /admin/coaches — promote a user to COACH and create their Coach profile.
const promoteSchema = z.object({
  userId: z.string().min(1),
  specialty: z.string().trim().min(2).optional(),
  bio: z.string().trim().min(2).optional(),
  yearsExp: z.number().int().min(0).max(80).optional(),
  languages: z.array(z.string()).optional(),
  hourlyRate: z.number().int().min(0).optional(),
});

router.post('/coaches', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = promoteSchema.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten() }); return; }

    const user = await prisma.user.findUnique({ where: { id: parsed.data.userId }, select: { id: true, coach: { select: { id: true } } } });
    if (!user) { res.status(404).json({ error: 'User not found' }); return; }
    if (user.coach) { res.status(409).json({ error: 'User is already a coach.' }); return; }

    const [, coach] = await prisma.$transaction([
      prisma.user.update({ where: { id: user.id }, data: { role: Role.COACH } }),
      prisma.coach.create({
        data: {
          userId: user.id,
          specialty: parsed.data.specialty ?? 'Counseling',
          bio: parsed.data.bio ?? 'MANAS practitioner.',
          yearsExp: parsed.data.yearsExp ?? 1,
          languages: parsed.data.languages ?? ['EN'],
          hourlyRate: parsed.data.hourlyRate ?? 100000,
        },
        include: { user: { select: { id: true, name: true, email: true, avatarUrl: true, isActive: true } } },
      }),
    ]);
    res.status(201).json(coach);
  } catch (err) {
    next(err);
  }
});

// GET /admin/videos — every video, including unapproved.
router.get('/videos', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const videos = await prisma.video.findMany({
      include: { topic: { select: { name: true, slug: true } } },
      orderBy: { createdAt: 'desc' },
    });
    res.json(videos);
  } catch (err) {
    next(err);
  }
});

// POST /admin/videos — add a library video.
const createVideoSchema = z.object({
  title: z.string().trim().min(2),
  description: z.string().trim().min(2),
  url: z.string().url(),
  thumbnailUrl: z.string().url().optional(),
  subtitleUrl: z.string().url().optional(),
  durationSec: z.number().int().positive().optional(),
  type: z.nativeEnum(VideoType),
  isPremium: z.boolean().optional(),
  approved: z.boolean().optional().default(true),
  topicId: z.string().optional(),
});

router.post('/videos', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = createVideoSchema.safeParse(req.body);
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
        approved: d.approved,
        topicId: d.topicId || null,
      },
    });
    res.status(201).json(video);
  } catch (err) {
    next(err);
  }
});

// PATCH /admin/videos/:id — approve/unapprove and light edits.
const updateVideoSchema = z.object({
  approved: z.boolean().optional(),
  isPremium: z.boolean().optional(),
  title: z.string().trim().min(2).optional(),
  description: z.string().trim().min(2).optional(),
});

router.patch('/videos/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = updateVideoSchema.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten() }); return; }
    const existing = await prisma.video.findUnique({ where: { id: req.params.id }, select: { id: true } });
    if (!existing) { res.status(404).json({ error: 'Video not found' }); return; }
    const video = await prisma.video.update({ where: { id: req.params.id }, data: parsed.data });
    res.json(video);
  } catch (err) {
    next(err);
  }
});

router.delete('/videos/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const existing = await prisma.video.findUnique({ where: { id: req.params.id }, select: { id: true } });
    if (!existing) { res.status(404).json({ error: 'Video not found' }); return; }
    await prisma.video.delete({ where: { id: req.params.id } });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// POST /admin/notifications/broadcast — message every active user.
const broadcastSchema = z.object({
  title: z.string().trim().min(2).max(120),
  body: z.string().trim().min(2).max(500),
});

router.post('/notifications/broadcast', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = broadcastSchema.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten() }); return; }
    const { count } = await broadcastNotification({ title: parsed.data.title, body: parsed.data.body });
    res.json({ ok: true, recipients: count });
  } catch (err) {
    next(err);
  }
});

export default router;
