import nodemailer from 'nodemailer';

interface OtpEmailInput {
  to: string;
  otp: string;
  expiryMinutes: number;
}

function parseBoolean(value: string | undefined): boolean | undefined {
  if (value === undefined) return undefined;
  return value === 'true' || value === '1';
}

function getEmailFrom(): string {
  return process.env.EMAIL_FROM || process.env.EMAIL_USER || 'MANAS <no-reply@manas.app>';
}

function createTransporter() {
  const host = process.env.EMAIL_HOST;
  const port = Number.parseInt(process.env.EMAIL_PORT ?? '587', 10);
  const secure = parseBoolean(process.env.EMAIL_SECURE) ?? port === 465;
  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_PASS;

  if (host) {
    return nodemailer.createTransport({
      host,
      port,
      secure,
      auth: user && pass ? { user, pass } : undefined,
    });
  }

  if (!user || !pass) {
    throw new Error('EMAIL_USER and EMAIL_PASS are required to send email OTP codes');
  }

  return nodemailer.createTransport({
    service: 'gmail',
    auth: { user, pass },
  });
}

export async function sendLoginOtpEmail({ to, otp, expiryMinutes }: OtpEmailInput): Promise<void> {
  const transporter = createTransporter();
  const subject = 'Your MANAS login code';
  const text = [
    'Your MANAS login code is:',
    '',
    otp,
    '',
    `This code expires in ${expiryMinutes} minutes.`,
    '',
    'If you did not request this code, you can ignore this email.',
  ].join('\n');
  const html = `
    <div style="font-family: Arial, sans-serif; color: #1f2933; line-height: 1.5;">
      <p>Your MANAS login code is:</p>
      <p style="font-size: 28px; font-weight: 700; letter-spacing: 4px; margin: 16px 0;">${otp}</p>
      <p>This code expires in ${expiryMinutes} minutes.</p>
      <p>If you did not request this code, you can ignore this email.</p>
    </div>
  `;

  await transporter.sendMail({
    from: getEmailFrom(),
    to,
    subject,
    text,
    html,
  });
}
