import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';

const router = Router();

router.get('/', async (req: Request, res: Response) => {
  const { topicSlug } = req.query as { topicSlug?: string };

  const coaches = await prisma.coach.findMany({
    include: {
      user: { select: { id: true, name: true, avatarUrl: true } },
      availability: true,
    },
    orderBy: { rating: 'desc' },
  });

  // If topicSlug provided, filter by coaches who have sessions on that topic
  // (All coaches handle all topics for now; topic-specific assignment is a future feature)
  res.json(coaches);
});

router.get('/:id', async (req: Request, res: Response) => {
  const coach = await prisma.coach.findUnique({
    where: { id: req.params.id },
    include: {
      user: { select: { id: true, name: true, avatarUrl: true } },
      availability: true,
    },
  });
  if (!coach) { res.status(404).json({ error: 'Coach not found' }); return; }
  res.json(coach);
});

// Returns available 30-min slots for a given date
router.get('/:id/availability', async (req: Request, res: Response) => {
  const { date } = req.query as { date?: string };
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    res.status(400).json({ error: 'date query param required (YYYY-MM-DD)' });
    return;
  }

  const coach = await prisma.coach.findUnique({
    where: { id: req.params.id },
    include: { availability: true },
  });
  if (!coach) { res.status(404).json({ error: 'Coach not found' }); return; }

  const d = new Date(date);
  const dayOfWeek = d.getDay();
  const avail = coach.availability.find(a => a.dayOfWeek === dayOfWeek);

  if (!avail) { res.json({ slots: [] }); return; }

  // Generate 30-min slots within working hours
  const [startH, startM] = avail.startTime.split(':').map(Number);
  const [endH, endM] = avail.endTime.split(':').map(Number);
  const startMinutes = startH * 60 + startM;
  const endMinutes = endH * 60 + endM;

  // Find already-booked slots for that day
  const dayStart = new Date(date);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(date);
  dayEnd.setHours(23, 59, 59, 999);

  const bookedSessions = await prisma.session.findMany({
    where: {
      coachId: req.params.id,
      scheduledAt: { gte: dayStart, lte: dayEnd },
      status: { in: ['PENDING', 'CONFIRMED'] },
    },
    select: { scheduledAt: true, durationMin: true },
  });

  const bookedMinutes = new Set<number>();
  for (const s of bookedSessions) {
    const t = s.scheduledAt;
    const slotStart = t.getUTCHours() * 60 + t.getUTCMinutes();
    for (let m = slotStart; m < slotStart + s.durationMin; m += 30) {
      bookedMinutes.add(m);
    }
  }

  const slots: { time: string; available: boolean }[] = [];
  for (let m = startMinutes; m + 30 <= endMinutes; m += 30) {
    const h = Math.floor(m / 60).toString().padStart(2, '0');
    const min = (m % 60).toString().padStart(2, '0');
    slots.push({ time: `${h}:${min}`, available: !bookedMinutes.has(m) });
  }

  res.json({ date, slots });
});

export default router;
