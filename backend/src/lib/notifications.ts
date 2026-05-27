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
