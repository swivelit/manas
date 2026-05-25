import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { requireAuth } from '../middleware/auth';
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

router.get('/:id', async (req: Request, res: Response) => {
  const video = await prisma.video.findUnique({
    where: { id: req.params.id },
    include: { topic: { select: { name: true, slug: true } } },
  });
  if (!video) { res.status(404).json({ error: 'Video not found' }); return; }
  res.json(video);
});

router.post('/:id/progress', requireAuth, async (req: Request, res: Response) => {
  const parsed = progressSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten() }); return; }

  const video = await prisma.video.findUnique({ where: { id: req.params.id } });
  if (!video) { res.status(404).json({ error: 'Video not found' }); return; }

  const progress = await prisma.videoProgress.upsert({
    where: { userId_videoId: { userId: req.user!.id, videoId: req.params.id } },
    update: { progressSec: parsed.data.progressSec, completed: parsed.data.completed ?? false },
    create: { userId: req.user!.id, videoId: req.params.id, progressSec: parsed.data.progressSec, completed: parsed.data.completed ?? false },
  });
  res.json(progress);
});

export default router;
