import { Router, Request, Response, NextFunction } from 'express';
import Razorpay from 'razorpay';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { requireAuth } from '../middleware/auth';
import { notifyUser } from '../lib/notifications';

const router = Router();

// Fixed "MANAS Premium" price. ₹499 expressed in paise.
const PREMIUM_AMOUNT_PAISE = 49900;
const CURRENCY = 'INR';

// IMPLEMENTATION NOTE: react-native-razorpay (the native Checkout SDK) does not
// support React Native's New Architecture, which this app requires (reanimated
// 4.x). So instead of the native order + client-side signature flow, we use
// Razorpay **Payment Links**: the client opens the hosted link in a browser
// (works in Expo Go and every build, no native module), and we verify the
// outcome server-side by fetching the link's status from Razorpay (secure —
// the client can't forge a "paid" status). razorpayOrderId stores the
// payment-link id for this purchase.

function razorpayConfigured(): boolean {
  return !!(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET);
}

function getClient(): Razorpay {
  return new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID!,
    key_secret: process.env.RAZORPAY_KEY_SECRET!,
  });
}

// GET /payments/config — public feature flag + price so the UI can show the
// right label ("Upgrade for ₹499" vs "Coming soon"). Exposes no secrets.
router.get('/config', (_req: Request, res: Response) => {
  res.json({
    configured: razorpayConfigured(),
    amount: PREMIUM_AMOUNT_PAISE,
    currency: CURRENCY,
    name: 'MANAS Premium',
  });
});

// POST /payments/create-order — create a Razorpay Payment Link for Premium.
router.post('/create-order', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!razorpayConfigured()) {
      res.status(501).json({ error: 'Payments are not configured on this server yet.' });
      return;
    }

    const me = await prisma.user.findUnique({ where: { id: req.user!.id }, select: { isPremium: true, name: true, email: true, phone: true } });
    if (!me) { res.status(404).json({ error: 'User not found' }); return; }
    if (me.isPremium) {
      res.status(409).json({ error: 'You already have MANAS Premium.' });
      return;
    }

    const link = await getClient().paymentLink.create({
      amount: PREMIUM_AMOUNT_PAISE,
      currency: CURRENCY,
      accept_partial: false,
      description: 'MANAS Premium — full library access',
      customer: { name: me.name, email: me.email, contact: me.phone ?? undefined },
      notify: { sms: false, email: false },
      reminder_enable: false,
      notes: { userId: req.user!.id, plan: 'MANAS Premium' },
    });

    await prisma.payment.create({
      data: {
        userId: req.user!.id,
        razorpayOrderId: link.id,
        amount: PREMIUM_AMOUNT_PAISE,
        currency: CURRENCY,
        status: 'created',
      },
    });

    res.json({
      url: link.short_url,
      paymentLinkId: link.id,
      amount: PREMIUM_AMOUNT_PAISE,
      currency: CURRENCY,
      name: 'MANAS Premium',
    });
  } catch (err) {
    next(err);
  }
});

// POST /payments/verify — confirm payment by fetching the link status from
// Razorpay, then grant premium. Returns {ok:false,status} if not yet paid.
const verifySchema = z.object({ paymentLinkId: z.string().min(1) });

router.post('/verify', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!razorpayConfigured()) {
      res.status(501).json({ error: 'Payments are not configured on this server yet.' });
      return;
    }
    const parsed = verifySchema.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten() }); return; }

    // The link must have been created for this account.
    const payment = await prisma.payment.findFirst({
      where: { razorpayOrderId: parsed.data.paymentLinkId, userId: req.user!.id },
    });
    if (!payment) {
      res.status(404).json({ error: 'Payment not found for this account.' });
      return;
    }

    const link = await getClient().paymentLink.fetch(parsed.data.paymentLinkId);
    if (link.status !== 'paid') {
      res.json({ ok: false, isPremium: false, status: link.status });
      return;
    }

    // Pull the captured payment id if present (loosely typed in the SDK).
    const linkPayments = (link as unknown as { payments?: Array<{ payment_id?: string }> }).payments;
    const paymentId = Array.isArray(linkPayments) && linkPayments.length ? linkPayments[0].payment_id ?? null : null;

    await prisma.$transaction([
      prisma.payment.update({
        where: { id: payment.id },
        data: { status: 'paid', razorpayPaymentId: paymentId },
      }),
      prisma.user.update({ where: { id: req.user!.id }, data: { isPremium: true } }),
    ]);

    await notifyUser({
      userId: req.user!.id,
      type: 'PREMIUM_ACTIVATED',
      title: 'Welcome to MANAS Premium',
      body: 'Your premium access is now active. Enjoy the full library.',
    });

    res.json({ ok: true, isPremium: true });
  } catch (err) {
    next(err);
  }
});

export default router;
