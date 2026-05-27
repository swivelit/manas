import { Router, Request, Response, NextFunction } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { OAuth2Client } from 'google-auth-library';
import { prisma } from '../lib/prisma';
import {
  MAX_OTP_ATTEMPTS,
  OTP_PURPOSE,
  generateNumericOtp,
  getOtpExpiresAt,
  getOtpExpiryMinutes,
  hashOtp,
  isEmailOtpDryRun,
  normalizeEmail,
  verifyOtpHash,
} from '../lib/otp';
import { sendLoginOtpEmail } from '../lib/mailer';

const router = Router();

const userSelect = {
  id: true,
  email: true,
  name: true,
  role: true,
  avatarUrl: true,
  timezone: true,
  createdAt: true,
} as const;

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(2),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

const requestEmailOtpSchema = z.object({
  email: z.string().email(),
  name: z.string().trim().min(2).optional(),
  mode: z.enum(['login', 'register']),
});

const verifyEmailOtpSchema = z.object({
  email: z.string().email(),
  name: z.string().trim().min(2).optional(),
  mode: z.enum(['login', 'register']).optional(),
  otp: z.string().trim().regex(/^\d{4,10}$/, 'OTP must be numeric'),
});

function signToken(user: { id: string; email: string; role: string }) {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    process.env.JWT_SECRET!,
    { expiresIn: '30d' }
  );
}

function getFallbackName(email: string): string {
  const localPart = email.split('@')[0]?.trim();
  return localPart || 'MANAS User';
}

router.post('/request-email-otp', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = requestEmailOtpSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten() });
      return;
    }

    const email = normalizeEmail(parsed.data.email);
    const { mode } = parsed.data;
    const existing = await prisma.user.findUnique({ where: { email }, select: { id: true } });

    if (mode === 'login' && !existing) {
      res.status(404).json({ error: 'No account found for this email. Please register first.' });
      return;
    }

    if (mode === 'register' && existing) {
      res.status(409).json({ error: 'Email already registered. Please sign in.' });
      return;
    }

    const expiryMinutes = getOtpExpiryMinutes();
    const otp = generateNumericOtp();
    const expiresAt = getOtpExpiresAt(expiryMinutes);
    const now = new Date();

    await prisma.emailOtp.updateMany({
      where: { email, purpose: OTP_PURPOSE, consumedAt: null },
      data: { consumedAt: now },
    });

    const otpRecord = await prisma.emailOtp.create({
      data: {
        email,
        purpose: OTP_PURPOSE,
        otpHash: hashOtp(email, otp),
        expiresAt,
      },
      select: { id: true },
    });

    if (isEmailOtpDryRun()) {
      res.status(201).json({
        ok: true,
        email,
        expiresAt,
        expiresInMinutes: expiryMinutes,
        message: 'Development mode: email not sent. Use the returned code to verify.',
        devOnly: { otp },
      });
      return;
    }

    try {
      await sendLoginOtpEmail({ to: email, otp, expiryMinutes });
    } catch (error) {
      await prisma.emailOtp.update({
        where: { id: otpRecord.id },
        data: { consumedAt: new Date() },
      });
      throw error;
    }

    res.status(201).json({
      ok: true,
      email,
      expiresAt,
      expiresInMinutes: expiryMinutes,
      message: 'Verification code sent',
    });
  } catch (error) {
    next(error);
  }
});

router.post('/verify-email-otp', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = verifyEmailOtpSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten() });
      return;
    }

    const email = normalizeEmail(parsed.data.email);
    const now = new Date();
    const otpRecord = await prisma.emailOtp.findFirst({
      where: {
        email,
        purpose: OTP_PURPOSE,
        consumedAt: null,
        expiresAt: { gt: now },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!otpRecord) {
      res.status(400).json({ error: 'Invalid or expired code. Please request a new one.' });
      return;
    }

    if (otpRecord.attempts >= MAX_OTP_ATTEMPTS) {
      await prisma.emailOtp.update({
        where: { id: otpRecord.id },
        data: { consumedAt: now },
      });
      res.status(429).json({ error: 'Too many invalid attempts. Please request a new code.' });
      return;
    }

    if (!verifyOtpHash(email, parsed.data.otp, otpRecord.otpHash, otpRecord.purpose)) {
      const attempts = otpRecord.attempts + 1;
      await prisma.emailOtp.update({
        where: { id: otpRecord.id },
        data: {
          attempts,
          consumedAt: attempts >= MAX_OTP_ATTEMPTS ? now : undefined,
        },
      });

      res.status(attempts >= MAX_OTP_ATTEMPTS ? 429 : 401).json({
        error: attempts >= MAX_OTP_ATTEMPTS
          ? 'Too many invalid attempts. Please request a new code.'
          : 'Invalid code',
      });
      return;
    }

    await prisma.emailOtp.update({
      where: { id: otpRecord.id },
      data: { consumedAt: now },
    });

    const mode = parsed.data.mode ?? 'login';
    let user = await prisma.user.findUnique({ where: { email }, select: userSelect });

    if (!user) {
      if (mode === 'login') {
        res.status(404).json({ error: 'No account found for this email. Please register first.' });
        return;
      }

      user = await prisma.user.create({
        data: {
          email,
          name: parsed.data.name ?? getFallbackName(email),
        },
        select: userSelect,
      });
    }

    res.json({ token: signToken(user), user });
  } catch (error) {
    next(error);
  }
});

router.post('/register', async (req: Request, res: Response) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const email = normalizeEmail(parsed.data.email);
  const { password, name } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    res.status(409).json({ error: 'Email already registered' });
    return;
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: { email, name, passwordHash },
    select: userSelect,
  });

  res.status(201).json({ token: signToken(user), user });
});

router.post('/login', async (req: Request, res: Response) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const email = normalizeEmail(parsed.data.email);
  const { password } = parsed.data;

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !user.passwordHash) {
    res.status(401).json({ error: 'Invalid credentials' });
    return;
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    res.status(401).json({ error: 'Invalid credentials' });
    return;
  }

  const safeUser = {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    avatarUrl: user.avatarUrl,
    timezone: user.timezone,
    createdAt: user.createdAt,
  };
  res.json({ token: signToken(user), user: safeUser });
});

// ---- Google OAuth ----
// Verifies a Google `id_token` minted on the mobile via expo-auth-session.
// Requires GOOGLE_CLIENT_ID_WEB and/or GOOGLE_CLIENT_ID_ANDROID env vars.
// If neither is set, returns 501 so the mobile UI can show a friendly "coming soon".
const googleSchema = z.object({ idToken: z.string().min(1) });

router.post('/google', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const audiences = [
      process.env.GOOGLE_CLIENT_ID_WEB,
      process.env.GOOGLE_CLIENT_ID_ANDROID,
      process.env.GOOGLE_CLIENT_ID_IOS,
    ].filter((v): v is string => !!v);

    if (audiences.length === 0) {
      res.status(501).json({ error: 'Google sign-in is not configured on this server yet.' });
      return;
    }

    const parsed = googleSchema.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten() }); return; }

    const client = new OAuth2Client();
    const ticket = await client.verifyIdToken({ idToken: parsed.data.idToken, audience: audiences });
    const payload = ticket.getPayload();
    if (!payload?.email) { res.status(401).json({ error: 'Google token missing email' }); return; }

    const email = normalizeEmail(payload.email);
    const name = (payload.name ?? getFallbackName(email)).trim() || getFallbackName(email);

    let user = await prisma.user.findUnique({ where: { email }, select: userSelect });
    if (!user) {
      user = await prisma.user.create({
        data: { email, name, avatarUrl: payload.picture ?? null },
        select: userSelect,
      });
    }

    res.json({ token: signToken(user), user });
  } catch (err) {
    next(err);
  }
});

// ---- Phone OTP (Twilio Verify) ----
// Wired only when TWILIO_* env vars are present. Otherwise 501.
const requestPhoneSchema = z.object({ phone: z.string().trim().min(8).max(20) });
const verifyPhoneSchema = z.object({
  phone: z.string().trim().min(8).max(20),
  code: z.string().trim().regex(/^\d{4,10}$/),
  name: z.string().trim().min(2).optional(),
});

function twilioConfigured(): boolean {
  return !!(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_VERIFY_SERVICE_SID);
}

function normalizePhone(raw: string): string {
  const trimmed = raw.replace(/\s+/g, '');
  return trimmed.startsWith('+') ? trimmed : `+${trimmed}`;
}

router.post('/request-phone-otp', async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!twilioConfigured()) {
      res.status(501).json({ error: 'Phone sign-in is not configured on this server yet.' });
      return;
    }
    const parsed = requestPhoneSchema.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten() }); return; }

    const { default: twilio } = await import('twilio');
    const client = twilio(process.env.TWILIO_ACCOUNT_SID!, process.env.TWILIO_AUTH_TOKEN!);
    await client.verify.v2
      .services(process.env.TWILIO_VERIFY_SERVICE_SID!)
      .verifications.create({ to: normalizePhone(parsed.data.phone), channel: 'sms' });

    res.json({ ok: true, message: 'Verification code sent' });
  } catch (err) {
    next(err);
  }
});

router.post('/verify-phone-otp', async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!twilioConfigured()) {
      res.status(501).json({ error: 'Phone sign-in is not configured on this server yet.' });
      return;
    }
    const parsed = verifyPhoneSchema.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten() }); return; }

    const { default: twilio } = await import('twilio');
    const client = twilio(process.env.TWILIO_ACCOUNT_SID!, process.env.TWILIO_AUTH_TOKEN!);
    const phone = normalizePhone(parsed.data.phone);
    const check = await client.verify.v2
      .services(process.env.TWILIO_VERIFY_SERVICE_SID!)
      .verificationChecks.create({ to: phone, code: parsed.data.code });

    if (check.status !== 'approved') {
      res.status(401).json({ error: 'Invalid or expired code' });
      return;
    }

    let user = await prisma.user.findUnique({ where: { phone }, select: userSelect });
    if (!user) {
      user = await prisma.user.create({
        data: {
          phone,
          email: `${phone.replace('+', '')}@phone.manas.local`, // placeholder; real email captured later in onboarding
          name: parsed.data.name ?? `MANAS ${phone.slice(-4)}`,
        },
        select: userSelect,
      });
    }

    res.json({ token: signToken(user), user });
  } catch (err) {
    next(err);
  }
});

export default router;
