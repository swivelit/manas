import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';

const router = Router();

router.get('/', async (_req: Request, res: Response) => {
  const cats = await prisma.category.findMany({ orderBy: { order: 'asc' } });
  res.json(cats);
});

router.get('/:slug/topics', async (req: Request, res: Response) => {
  const cat = await prisma.category.findUnique({ where: { slug: req.params.slug } });
  if (!cat) { res.status(404).json({ error: 'Category not found' }); return; }

  const topics = await prisma.topic.findMany({
    where: { categoryId: cat.id },
    orderBy: { order: 'asc' },
  });
  res.json(topics);
});

export default router;
