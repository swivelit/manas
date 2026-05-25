import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { requireAuth } from '../middleware/auth';

const router = Router();

router.get('/', requireAuth, async (req: Request, res: Response) => {
  const notifications = await prisma.notification.findMany({
    where: { userId: req.user!.id },
    orderBy: { createdAt: 'desc' },
  });
  res.json(notifications);
});

router.patch('/:id/read', requireAuth, async (req: Request, res: Response) => {
  const notif = await prisma.notification.findFirst({
    where: { id: req.params.id, userId: req.user!.id },
  });
  if (!notif) { res.status(404).json({ error: 'Notification not found' }); return; }

  const updated = await prisma.notification.update({
    where: { id: req.params.id },
    data: { read: true },
  });
  res.json(updated);
});

export default router;
