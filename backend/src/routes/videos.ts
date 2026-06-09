import { Router, Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import fs from 'fs/promises';
import path from 'path';
import { v2 as cloudinary, type UploadApiOptions } from 'cloudinary';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { optionalAuth, requireAuth } from '../middleware/auth';
import { Role, VideoType } from '@prisma/client';

const router = Router();
const AUDIO_UPLOAD_MAX_DURATION_MS = 60_000;
const AUDIO_UPLOAD_MAX_BYTES = 6 * 1024 * 1024;
const VIDEO_UPLOAD_MAX_BYTES = 100 * 1024 * 1024;
const AUDIO_UPLOAD_DIR = path.resolve(process.cwd(), 'uploads', 'toy-audio');
const VIDEO_UPLOAD_DIR = path.resolve(process.cwd(), 'uploads', 'videos');
const TOY_AUDIO_CLOUDINARY_FOLDER = 'manas/toy-audio';
const VIDEO_CLOUDINARY_FOLDER = 'manas/videos';
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
const VIDEO_EXTENSION_BY_MIME: Record<string, string> = {
  'video/mp4': 'mp4',
  'video/quicktime': 'mov',
  'video/x-m4v': 'm4v',
  'video/webm': 'webm',
  'video/x-matroska': 'mkv',
  'video/3gpp': '3gp',
  'video/3gpp2': '3g2',
  'video/avi': 'avi',
  'video/msvideo': 'avi',
  'video/x-msvideo': 'avi',
  'video/x-ms-wmv': 'wmv',
  'video/mpeg': 'mpeg',
  'video/ogg': 'ogv',
};
let warnedAboutLocalToyAudioFallback = false;
let warnedAboutLocalVideoFallback = false;
let loggedCloudinaryToyAudioStorage = false;
let loggedCloudinaryVideoStorage = false;

const progressSchema = z.object({
  progressSec: z.number().int().min(0),
  completed: z.boolean().optional(),
});

const audioUploadSchema = z.object({
  audioBase64: z.string().min(1),
  mimeType: z.enum(['audio/aac', 'audio/m4a', 'audio/mp4', 'audio/mpeg', 'audio/ogg', 'audio/wav', 'audio/webm', 'audio/3gpp']),
  durationMs: z.number().int().positive().max(AUDIO_UPLOAD_MAX_DURATION_MS),
});

const videoUploadSchema = z.object({
  videoBase64: z.string().min(1),
  mimeType: z.string().trim().min(1),
  fileName: z.string().trim().max(255).optional(),
});

function serializeVideoWithLikes(video: Record<string, any>) {
  const { _count, likes, ...rest } = video;
  return {
    ...rest,
    likeCount: _count?.likes ?? 0,
    likedByMe: Array.isArray(likes) && likes.length > 0,
  };
}

function hasCloudinaryConfig() {
  return Boolean(
    process.env.CLOUDINARY_URL
    || (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET),
  );
}

function configureCloudinary() {
  if (process.env.CLOUDINARY_URL) return;
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
  });
}

function warnAboutLocalToyAudioFallback() {
  if (warnedAboutLocalToyAudioFallback) return;
  warnedAboutLocalToyAudioFallback = true;
  console.warn(
    'Cloudinary is not configured; toy audio uploads will be stored on local disk under uploads/toy-audio. '
    + 'This is for local development only and is not durable on Render.',
  );
}

function logCloudinaryToyAudioStorage() {
  if (loggedCloudinaryToyAudioStorage) return;
  loggedCloudinaryToyAudioStorage = true;
  console.info('Cloudinary is configured; toy audio uploads will be stored in Cloudinary.');
}

function warnAboutLocalVideoFallback() {
  if (warnedAboutLocalVideoFallback) return;
  warnedAboutLocalVideoFallback = true;
  console.warn(
    'Cloudinary is not configured; video uploads will be stored on local disk under uploads/videos. '
    + 'This is for local development only and is not durable on Render.',
  );
}

function logCloudinaryVideoStorage() {
  if (loggedCloudinaryVideoStorage) return;
  loggedCloudinaryVideoStorage = true;
  console.info('Cloudinary is configured; video uploads will be stored in Cloudinary.');
}

function extractBase64Payload(payload: string) {
  const trimmed = payload.trim();
  const dataUriMatch = trimmed.match(/^data:([^;]+);base64,(.*)$/is);
  if (!dataUriMatch) return { base64: trimmed.replace(/\s/g, ''), mimeType: null };
  return {
    base64: dataUriMatch[2].replace(/\s/g, ''),
    mimeType: dataUriMatch[1].toLowerCase(),
  };
}

async function uploadToyAudioToCloudinary(bytes: Buffer, mimeType: string) {
  configureCloudinary();
  logCloudinaryToyAudioStorage();
  const dataUri = `data:${mimeType};base64,${bytes.toString('base64')}`;
  const options: UploadApiOptions = {
    folder: TOY_AUDIO_CLOUDINARY_FOLDER,
    resource_type: 'video',
    type: 'upload',
    use_filename: false,
    unique_filename: true,
    overwrite: false,
  };
  let result;
  try {
    result = await cloudinary.uploader.upload(dataUri, options);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(`Cloudinary toy audio upload failed: ${message}`);
  }
  if (!result.secure_url) {
    throw new Error('Cloudinary upload did not return a secure URL.');
  }
  return result.secure_url;
}

async function uploadVideoToCloudinary(bytes: Buffer, mimeType: string) {
  configureCloudinary();
  logCloudinaryVideoStorage();
  const dataUri = `data:${mimeType};base64,${bytes.toString('base64')}`;
  const options: UploadApiOptions = {
    folder: VIDEO_CLOUDINARY_FOLDER,
    resource_type: 'video',
    type: 'upload',
    use_filename: false,
    unique_filename: true,
    overwrite: false,
  };
  let result;
  try {
    result = await cloudinary.uploader.upload(dataUri, options);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(`Cloudinary video upload failed: ${message}`);
  }
  if (!result.secure_url) {
    throw new Error('Cloudinary upload did not return a secure URL.');
  }
  const thumbnailUrl = result.public_id
    ? cloudinary.url(result.public_id, {
      resource_type: 'video',
      type: 'upload',
      secure: true,
      format: 'jpg',
      transformation: [{ start_offset: '0', width: 640, crop: 'scale', quality: 'auto' }],
    })
    : null;
  return { url: result.secure_url, thumbnailUrl };
}

async function saveToyAudioLocally(req: Request, bytes: Buffer, mimeType: string) {
  warnAboutLocalToyAudioFallback();
  await fs.mkdir(AUDIO_UPLOAD_DIR, { recursive: true });
  const ext = AUDIO_EXTENSION_BY_MIME[mimeType] ?? 'm4a';
  const fileName = `${Date.now()}-${crypto.randomUUID()}.${ext}`;
  const filePath = path.join(AUDIO_UPLOAD_DIR, fileName);
  await fs.writeFile(filePath, bytes);

  const publicPath = `/uploads/toy-audio/${fileName}`;
  return `${req.protocol}://${req.get('host')}${publicPath}`;
}

async function saveVideoLocally(req: Request, bytes: Buffer, mimeType: string) {
  warnAboutLocalVideoFallback();
  await fs.mkdir(VIDEO_UPLOAD_DIR, { recursive: true });
  const ext = VIDEO_EXTENSION_BY_MIME[mimeType] ?? 'mp4';
  const fileName = `${Date.now()}-${crypto.randomUUID()}.${ext}`;
  const filePath = path.join(VIDEO_UPLOAD_DIR, fileName);
  await fs.writeFile(filePath, bytes);

  const publicPath = `/uploads/videos/${fileName}`;
  return { url: `${req.protocol}://${req.get('host')}${publicPath}`, thumbnailUrl: null };
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

    const url = hasCloudinaryConfig()
      ? await uploadToyAudioToCloudinary(bytes, parsed.data.mimeType)
      : await saveToyAudioLocally(req, bytes, parsed.data.mimeType);
    res.status(201).json({ url, durationMs: parsed.data.durationMs, sizeBytes: bytes.length });
  } catch (err) {
    next(err);
  }
});

router.post('/upload', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (req.user!.role !== Role.COACH && req.user!.role !== Role.ADMIN) {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }

    const parsed = videoUploadSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Video payload and MIME type are required.' });
      return;
    }

    const mimeType = parsed.data.mimeType.toLowerCase();
    if (!Object.prototype.hasOwnProperty.call(VIDEO_EXTENSION_BY_MIME, mimeType)) {
      res.status(400).json({
        error: 'Unsupported video type. Upload an MP4, MOV, M4V, WEBM, MKV, 3GP, AVI, WMV, MPEG, or OGV video file.',
      });
      return;
    }

    const payload = extractBase64Payload(parsed.data.videoBase64);
    if (payload.mimeType && payload.mimeType !== mimeType) {
      res.status(400).json({ error: 'Video payload MIME type does not match the provided MIME type.' });
      return;
    }
    if (!/^[A-Za-z0-9+/]+={0,2}$/.test(payload.base64)) {
      res.status(400).json({ error: 'Invalid video payload.' });
      return;
    }

    const bytes = Buffer.from(payload.base64, 'base64');
    if (bytes.length === 0) {
      res.status(400).json({ error: 'Video payload is empty.' });
      return;
    }
    if (bytes.length > VIDEO_UPLOAD_MAX_BYTES) {
      res.status(413).json({ error: 'Video file is too large. Uploads are limited to about 100 MB.' });
      return;
    }

    const upload = hasCloudinaryConfig()
      ? await uploadVideoToCloudinary(bytes, mimeType)
      : await saveVideoLocally(req, bytes, mimeType);
    res.status(201).json({ ...upload, sizeBytes: bytes.length });
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
