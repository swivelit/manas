import { prisma } from './prisma';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

interface SendPushArgs {
  to: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

async function sendExpoPush(message: SendPushArgs): Promise<void> {
  if (!message.to || !message.to.startsWith('ExponentPushToken')) {
    return; // not a valid Expo token — silently skip
  }
  try {
    const res = await fetch(EXPO_PUSH_URL, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Accept-Encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify([message]),
    });
    if (!res.ok) {
      console.warn('[push] Expo push API responded', res.status, await res.text().catch(() => ''));
    }
  } catch (err) {
    console.warn('[push] Expo push send failed:', err);
  }
}

interface NotifyUserArgs {
  userId: string;
  type: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

/**
 * Persist a Notification row AND, if the user has a push token, fan out to Expo.
 * Failures to deliver pushes never block the DB write.
 */
export async function notifyUser(args: NotifyUserArgs) {
  const row = await prisma.notification.create({
    data: {
      userId: args.userId,
      type: args.type,
      title: args.title,
      body: args.body,
    },
  });
  const user = await prisma.user.findUnique({ where: { id: args.userId }, select: { pushToken: true } });
  if (user?.pushToken) {
    await sendExpoPush({
      to: user.pushToken,
      title: args.title,
      body: args.body,
      data: { notificationId: row.id, type: args.type, ...args.data },
    });
  }
  return row;
}

/**
 * Broadcast a notification to every active user (admin tool). Persists one
 * Notification row per user and best-effort fans out to Expo in chunks.
 * NOTE: for a large audience, move push fan-out to a queue/batch worker (v1.1).
 */
export async function broadcastNotification(args: { title: string; body: string; type?: string }) {
  const type = args.type ?? 'BROADCAST';
  const users = await prisma.user.findMany({ where: { isActive: true }, select: { pushToken: true, id: true } });
  if (users.length === 0) return { count: 0 };

  await prisma.notification.createMany({
    data: users.map(u => ({ userId: u.id, type, title: args.title, body: args.body })),
  });

  const tokens = users
    .map(u => u.pushToken)
    .filter((t): t is string => !!t && t.startsWith('ExponentPushToken'));

  for (let i = 0; i < tokens.length; i += 100) {
    const chunk = tokens.slice(i, i + 100).map(to => ({ to, title: args.title, body: args.body, data: { type } }));
    try {
      await fetch(EXPO_PUSH_URL, {
        method: 'POST',
        headers: { Accept: 'application/json', 'Accept-Encoding': 'gzip, deflate', 'Content-Type': 'application/json' },
        body: JSON.stringify(chunk),
      });
    } catch (err) {
      console.warn('[push] broadcast chunk failed:', err);
    }
  }

  return { count: users.length };
}
