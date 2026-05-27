import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { requireAuth } from '../middleware/auth';

const router = Router();

const createSchema = z.object({
  mood: z.number().int().min(1).max(5),
  note: z.string().trim().max(2000).optional(),
});

router.get('/', requireAuth, async (req: Request, res: Response) => {
  const limit = Math.min(Number(req.query.limit ?? 30) || 30, 200);
  const entries = await prisma.moodEntry.findMany({
    where: { userId: req.user!.id },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });
  res.json(entries);
});

router.post('/', requireAuth, async (req: Request, res: Response) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten() }); return; }

  const entry = await prisma.moodEntry.create({
    data: {
      userId: req.user!.id,
      mood: parsed.data.mood,
      note: parsed.data.note ?? null,
    },
  });
  res.status(201).json(entry);
});

export default router;
