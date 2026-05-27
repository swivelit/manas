import cron from 'node-cron';
import { prisma } from './prisma';
import { notifyUser } from './notifications';
import { SessionStatus } from '@prisma/client';

const REMIND_WINDOW_MIN = 15;

async function runReminderTick() {
  const now = new Date();
  const windowEnd = new Date(now.getTime() + REMIND_WINDOW_MIN * 60_000);

  const due = await prisma.session.findMany({
    where: {
      status: SessionStatus.CONFIRMED,
      remindedAt: null,
      scheduledAt: { gt: now, lte: windowEnd },
    },
    include: { coach: { include: { user: { select: { name: true } } } } },
  });

  for (const s of due) {
    await notifyUser({
      userId: s.userId,
      type: 'SESSION_REMINDER',
      title: 'Starting soon',
      body: `Your session with ${s.coach.user.name} starts in ${REMIND_WINDOW_MIN} minutes.`,
      data: { sessionId: s.id },
    });
    await prisma.session.update({ where: { id: s.id }, data: { remindedAt: now } });
  }
}

let started = false;

export function startReminderCron(): void {
  if (started) return;
  started = true;
  // Every minute, find CONFIRMED sessions starting in the next 15 min that
  // haven't been reminded yet, push them, then mark them reminded.
  // NOTE: Render's free tier sleeps idle web services. For reliable production
  // reminders, run this on a paid plan or move to a dedicated worker / Render Cron Job.
  cron.schedule('* * * * *', () => {
    runReminderTick().catch(err => console.warn('[cron] reminder tick failed:', err));
  });
  console.log('⏰ Session-reminder cron started (every 1 min, 15-min lookahead)');
}
