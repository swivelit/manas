import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { requireAuth } from '../middleware/auth';

const router = Router();

const updateSchema = z.object({
  name: z.string().min(2).optional(),
  phone: z.string().optional(),
  avatarUrl: z.string().url().optional(),
  timezone: z.string().optional(),
});

router.get('/', requireAuth, async (req: Request, res: Response) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.id },
    select: { id: true, email: true, name: true, phone: true, role: true, avatarUrl: true, timezone: true, createdAt: true },
  });
  if (!user) { res.status(404).json({ error: 'User not found' }); return; }
  res.json(user);
});

router.patch('/', requireAuth, async (req: Request, res: Response) => {
  const parsed = updateSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten() }); return; }

  const user = await prisma.user.update({
    where: { id: req.user!.id },
    data: parsed.data,
    select: { id: true, email: true, name: true, phone: true, role: true, avatarUrl: true, timezone: true, createdAt: true },
  });
  res.json(user);
});

export default router;
