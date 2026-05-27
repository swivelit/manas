import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { optionalAuth, requireAuth } from '../middleware/auth';
import { VideoType } from '@prisma/client';

const router = Router();

const progressSchema = z.object({
  progressSec: z.number().int().min(0),
  completed: z.boolean().optional(),
});

router.get('/', async (req: Request, res: Response) => {
  const { type, topicId } = req.query as { type?: string; topicId?: string };

  const where: { type?: VideoType; topicId?: string | null } = {};
  if (type && Object.values(VideoType).includes(type as VideoType)) {
    where.type = type as VideoType;
  }
  if (topicId) where.topicId = topicId;

  const videos = await prisma.video.findMany({
    where,
    include: { topic: { select: { name: true, slug: true } } },
    orderBy: { createdAt: 'desc' },
  });
  res.json(videos);
});

// User's bookmarked videos. Must be declared before `/:id` so the literal
// segment is not captured as an id.
router.get('/bookmarks', requireAuth, async (req: Request, res: Response) => {
  const bookmarks = await prisma.videoBookmark.findMany({
    where: { userId: req.user!.id },
    include: { video: { include: { topic: { select: { name: true, slug: true } } } } },
    orderBy: { createdAt: 'desc' },
  });
  res.json(bookmarks.map(b => b.video));
});

router.get('/:id', optionalAuth, async (req: Request, res: Response) => {
  const video = await prisma.video.findUnique({
    where: { id: req.params.id },
    include: { topic: { select: { name: true, slug: true } } },
  });
  if (!video) { res.status(404).json({ error: 'Video not found' }); return; }

  if (video.isPremium) {
    if (!req.user) {
      res.status(402).json({ error: 'Premium content. Please upgrade.', upgradeUrl: null });
      return;
    }
    const me = await prisma.user.findUnique({ where: { id: req.user.id }, select: { isPremium: true } });
    if (!me?.isPremium) {
      res.status(402).json({ error: 'Premium content. Please upgrade.', upgradeUrl: null });
      return;
    }
  }

  res.json(video);
});

router.post('/:id/progress', requireAuth, async (req: Request, res: Response) => {
  const parsed = progressSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten() }); return; }

  const video = await prisma.video.findUnique({ where: { id: req.params.id } });
  if (!video) { res.status(404).json({ error: 'Video not found' }); return; }

  if (video.isPremium) {
    const me = await prisma.user.findUnique({ where: { id: req.user!.id }, select: { isPremium: true } });
    if (!me?.isPremium) {
      res.status(402).json({ error: 'Premium content. Please upgrade.', upgradeUrl: null });
      return;
    }
  }

  const progress = await prisma.videoProgress.upsert({
    where: { userId_videoId: { userId: req.user!.id, videoId: req.params.id } },
    update: { progressSec: parsed.data.progressSec, completed: parsed.data.completed ?? false },
    create: { userId: req.user!.id, videoId: req.params.id, progressSec: parsed.data.progressSec, completed: parsed.data.completed ?? false },
  });
  res.json(progress);
});

router.post('/:id/bookmark', requireAuth, async (req: Request, res: Response) => {
  const video = await prisma.video.findUnique({ where: { id: req.params.id } });
  if (!video) { res.status(404).json({ error: 'Video not found' }); return; }

  const existing = await prisma.videoBookmark.findUnique({
    where: { userId_videoId: { userId: req.user!.id, videoId: req.params.id } },
  });
  if (existing) {
    await prisma.videoBookmark.delete({ where: { id: existing.id } });
    res.json({ bookmarked: false });
    return;
  }
  await prisma.videoBookmark.create({ data: { userId: req.user!.id, videoId: req.params.id } });
  res.json({ bookmarked: true });
});

export default router;
