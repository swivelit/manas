import { Router, Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import fs from 'fs/promises';
import path from 'path';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { optionalAuth, requireAuth } from '../middleware/auth';
import { Role, VideoType } from '@prisma/client';

const router = Router();
const AUDIO_UPLOAD_MAX_DURATION_MS = 60_000;
const AUDIO_UPLOAD_MAX_BYTES = 6 * 1024 * 1024;
const AUDIO_UPLOAD_DIR = path.resolve(process.cwd(), 'uploads', 'toy-audio');
const AUDIO_EXTENSION_BY_MIME: Record<string, string> = {
  'audio/aac': 'aac',
  'audio/m4a': 'm4a',
  'audio/mp4': 'm4a',
  'audio/mpeg': 'mp3',
  'audio/ogg': 'ogg',
  'audio/wav': 'wav',
  'audio/webm': 'webm',
  'audio/3gpp': '3gp',
};

const progressSchema = z.object({
  progressSec: z.number().int().min(0),
  completed: z.boolean().optional(),
});

const audioUploadSchema = z.object({
  audioBase64: z.string().min(1),
  mimeType: z.enum(['audio/aac', 'audio/m4a', 'audio/mp4', 'audio/mpeg', 'audio/ogg', 'audio/wav', 'audio/webm', 'audio/3gpp']),
  durationMs: z.number().int().positive().max(AUDIO_UPLOAD_MAX_DURATION_MS),
});

function serializeVideoWithLikes(video: Record<string, any>) {
  const { _count, likes, ...rest } = video;
  return {
    ...rest,
    likeCount: _count?.likes ?? 0,
    likedByMe: Array.isArray(likes) && likes.length > 0,
  };
}

router.get('/', optionalAuth, async (req: Request, res: Response) => {
  const { type, topicId } = req.query as { type?: string; topicId?: string };

  const where: { type?: VideoType; topicId?: string | null; approved: boolean } = { approved: true };
  if (type && Object.values(VideoType).includes(type as VideoType)) {
    where.type = type as VideoType;
  }
  if (topicId) where.topicId = topicId;

  const videos = await prisma.video.findMany({
    where,
    include: {
      topic: { select: { name: true, slug: true } },
      _count: { select: { likes: true } },
      likes: req.user
        ? { where: { userId: req.user.id }, select: { id: true } }
        : false,
    },
    orderBy: { createdAt: 'desc' },
  });
  res.json(videos.map(serializeVideoWithLikes));
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

router.post('/toy-audio', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (req.user!.role !== Role.COACH && req.user!.role !== Role.ADMIN) {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }

    const parsed = audioUploadSchema.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten() }); return; }

    const base64 = parsed.data.audioBase64.replace(/^data:audio\/[a-z0-9.+-]+;base64,/i, '').trim();
    if (!/^[A-Za-z0-9+/]+={0,2}$/.test(base64)) {
      res.status(400).json({ error: 'Invalid audio payload.' });
      return;
    }

    const bytes = Buffer.from(base64, 'base64');
    if (bytes.length === 0) {
      res.status(400).json({ error: 'Audio payload is empty.' });
      return;
    }
    if (bytes.length > AUDIO_UPLOAD_MAX_BYTES) {
      res.status(413).json({ error: 'Audio clip is too large. Recordings are limited to about 60 seconds.' });
      return;
    }

    await fs.mkdir(AUDIO_UPLOAD_DIR, { recursive: true });
    const ext = AUDIO_EXTENSION_BY_MIME[parsed.data.mimeType] ?? 'm4a';
    const fileName = `${Date.now()}-${crypto.randomUUID()}.${ext}`;
    const filePath = path.join(AUDIO_UPLOAD_DIR, fileName);
    await fs.writeFile(filePath, bytes);

    const publicPath = `/uploads/toy-audio/${fileName}`;
    const url = `${req.protocol}://${req.get('host')}${publicPath}`;
    res.status(201).json({ url, durationMs: parsed.data.durationMs, sizeBytes: bytes.length });
  } catch (err) {
    next(err);
  }
});

router.get('/:id', optionalAuth, async (req: Request, res: Response) => {
  const video = await prisma.video.findUnique({
    where: { id: req.params.id },
    include: {
      topic: { select: { name: true, slug: true } },
      _count: { select: { likes: true } },
      likes: req.user
        ? { where: { userId: req.user.id }, select: { id: true } }
        : false,
    },
  });
  if (!video) { res.status(404).json({ error: 'Video not found' }); return; }

  // Unapproved videos are hidden from everyone except admins.
  if (!video.approved && req.user?.role !== 'ADMIN') {
    res.status(404).json({ error: 'Video not found' });
    return;
  }

  if (video.isPremium) {
    if (!req.user) {
      res.status(402).json({ error: 'Premium content. Ask an admin for access.', upgradeUrl: null });
      return;
    }
    const me = await prisma.user.findUnique({ where: { id: req.user.id }, select: { isPremium: true } });
    if (!me?.isPremium) {
      res.status(402).json({ error: 'Premium content. Ask an admin for access.', upgradeUrl: null });
      return;
    }
  }

  const progress = req.user
    ? await prisma.videoProgress.findUnique({
      where: { userId_videoId: { userId: req.user.id, videoId: video.id } },
      select: { progressSec: true, completed: true, updatedAt: true },
    })
    : null;

  res.json({ ...serializeVideoWithLikes(video), progress });
});

router.post('/:id/progress', requireAuth, async (req: Request, res: Response) => {
  const parsed = progressSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten() }); return; }

  const video = await prisma.video.findUnique({ where: { id: req.params.id } });
  if (!video) { res.status(404).json({ error: 'Video not found' }); return; }

  if (video.isPremium) {
    const me = await prisma.user.findUnique({ where: { id: req.user!.id }, select: { isPremium: true } });
    if (!me?.isPremium) {
      res.status(402).json({ error: 'Premium content. Ask an admin for access.', upgradeUrl: null });
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

router.post('/:id/like', requireAuth, async (req: Request, res: Response) => {
  const video = await prisma.video.findUnique({ where: { id: req.params.id } });
  if (!video || (!video.approved && req.user?.role !== 'ADMIN')) {
    res.status(404).json({ error: 'Video not found' });
    return;
  }

  if (video.isPremium) {
    const me = await prisma.user.findUnique({ where: { id: req.user!.id }, select: { isPremium: true } });
    if (!me?.isPremium) {
      res.status(402).json({ error: 'Premium content. Ask an admin for access.', upgradeUrl: null });
      return;
    }
  }

  const existing = await prisma.videoLike.findUnique({
    where: { userId_videoId: { userId: req.user!.id, videoId: req.params.id } },
  });

  let liked = true;
  if (existing) {
    await prisma.videoLike.delete({ where: { id: existing.id } });
    liked = false;
  } else {
    await prisma.videoLike.create({ data: { userId: req.user!.id, videoId: req.params.id } });
  }

  const likeCount = await prisma.videoLike.count({ where: { videoId: req.params.id } });
  res.json({ liked, likeCount });
});

export default router;
