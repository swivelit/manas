import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';

const router = Router();

router.get('/:slug', async (req: Request, res: Response) => {
  const topic = await prisma.topic.findUnique({
    where: { slug: req.params.slug },
    include: { category: true },
  });
  if (!topic) { res.status(404).json({ error: 'Topic not found' }); return; }
  res.json(topic);
});

export default router;
