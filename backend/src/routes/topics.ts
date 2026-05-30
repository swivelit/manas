import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';

const router = Router();

// GET /topics — all topics (with their category). Used by the coach video
// upload picker. Public; topic metadata is not sensitive.
router.get('/', async (_req: Request, res: Response) => {
  const topics = await prisma.topic.findMany({
    include: { category: { select: { slug: true, name: true } } },
    orderBy: [{ category: { order: 'asc' } }, { order: 'asc' }],
  });
  res.json(topics);
});

router.get('/:slug', async (req: Request, res: Response) => {
  const topic = await prisma.topic.findUnique({
    where: { slug: req.params.slug },
    include: { category: true },
  });
  if (!topic) { res.status(404).json({ error: 'Topic not found' }); return; }
  res.json(topic);
});

export default router;
