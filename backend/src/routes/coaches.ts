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

// Returns available 30-min slots for a given date.
// Coach availability is stored as local Asia/Kolkata time. The response includes
// `startsAt` as a UTC ISO with offset so the mobile client can render the time in
// the user's own timezone via date-fns-tz.
// NOTE: per-coach timezone is a v1.1 enhancement — for now all seed coaches are IST.
const COACH_TZ_OFFSET = '+05:30'; // Asia/Kolkata, no DST
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

  // Use the coach's local weekday, not the server's.
  const localNoon = new Date(`${date}T12:00:00${COACH_TZ_OFFSET}`);
  const dayOfWeek = Number(
    new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Kolkata', weekday: 'short' })
      .format(localNoon)
      .replace(/Sun|Mon|Tue|Wed|Thu|Fri|Sat/, (d) =>
        ({ Sun: '0', Mon: '1', Tue: '2', Wed: '3', Thu: '4', Fri: '5', Sat: '6' }[d] as string)),
  );
  const avail = coach.availability.find(a => a.dayOfWeek === dayOfWeek);

  if (!avail) { res.json({ date, timezone: 'Asia/Kolkata', slots: [] }); return; }

  const [startH, startM] = avail.startTime.split(':').map(Number);
  const [endH, endM] = avail.endTime.split(':').map(Number);
  const startMinutes = startH * 60 + startM;
  const endMinutes = endH * 60 + endM;

  // Booked-minutes lookup keyed on the slot's UTC ISO so we collapse all timezones cleanly.
  const dayStartUtc = new Date(`${date}T00:00:00${COACH_TZ_OFFSET}`);
  const dayEndUtc = new Date(`${date}T23:59:59${COACH_TZ_OFFSET}`);

  const bookedSessions = await prisma.session.findMany({
    where: {
      coachId: req.params.id,
      scheduledAt: { gte: dayStartUtc, lte: dayEndUtc },
      status: { in: ['PENDING', 'CONFIRMED'] },
    },
    select: { scheduledAt: true, durationMin: true },
  });

  const bookedIsos = new Set<string>();
  for (const s of bookedSessions) {
    for (let off = 0; off < s.durationMin; off += 30) {
      bookedIsos.add(new Date(s.scheduledAt.getTime() + off * 60_000).toISOString());
    }
  }

  const slots: { time: string; startsAt: string; label: string; available: boolean }[] = [];
  for (let m = startMinutes; m + 30 <= endMinutes; m += 30) {
    const h = Math.floor(m / 60).toString().padStart(2, '0');
    const min = (m % 60).toString().padStart(2, '0');
    const startsAt = new Date(`${date}T${h}:${min}:00${COACH_TZ_OFFSET}`).toISOString();
    slots.push({
      time: `${h}:${min}`,
      startsAt,
      label: `${h}:${min}`, // IST label; mobile rewrites to user TZ
      available: !bookedIsos.has(startsAt),
    });
  }

  res.json({ date, timezone: 'Asia/Kolkata', slots });
});

export default router;
