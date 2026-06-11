import 'dotenv/config';
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import path from 'path';

import authRoutes from './routes/auth';
import meRoutes from './routes/me';
import categoriesRoutes from './routes/categories';
import topicsRoutes from './routes/topics';
import coachesRoutes from './routes/coaches';
import sessionsRoutes from './routes/sessions';
import videosRoutes from './routes/videos';
import notificationsRoutes from './routes/notifications';
import moodRoutes from './routes/mood';
import coachRoutes from './routes/coach';
import adminRoutes from './routes/admin';
import { startReminderCron } from './lib/reminders';
import { ensureConfiguredAdmin } from './lib/adminBootstrap';

const app = express();
const PORT = process.env.PORT ?? 4000;
const API_VERSION = process.env.npm_package_version ?? '1.0.0';

// Middleware
app.use(helmet());

// CORS: always allow no-origin requests (native mobile apps, curl, server-to-
// server). In production, only allow the configured FRONTEND_URL origins
// (comma-separated); in non-production, allow everything for convenience.
const allowedOrigins = (process.env.FRONTEND_URL ?? '').split(',').map(s => s.trim()).filter(Boolean);
app.use(cors({
  origin: (origin, cb) => {
    if (!origin) return cb(null, true);                     // mobile apps / curl
    if (process.env.NODE_ENV !== 'production') return cb(null, true);
    if (allowedOrigins.includes(origin)) return cb(null, true);
    return cb(new Error('Not allowed by CORS'));
  },
  credentials: true,
}));
app.use(morgan('dev'));
app.use(express.json({ limit: '140mb' }));
app.use('/uploads', express.static(path.resolve(process.cwd(), 'uploads')));

// Health check
app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API discovery. Render opens the service root in a browser, so keep this
// lightweight and public while avoiding any environment or database details.
app.get('/', (_req: Request, res: Response) => {
  res.json({
    name: 'MANAS API',
    status: 'ok',
    version: API_VERSION,
    health: '/health',
    endpoints: [
      '/categories',
      '/categories/emotional-healing/topics',
      '/categories/coaching/topics',
      '/coaches',
      '/videos',
    ],
  });
});

// Routes
app.use('/auth', authRoutes);
app.use('/me', meRoutes);
app.use('/categories', categoriesRoutes);
app.use('/topics', topicsRoutes);
app.use('/coaches', coachesRoutes);
app.use('/sessions', sessionsRoutes);
app.use('/videos', videosRoutes);
app.use('/notifications', notificationsRoutes);
app.use('/mood', moodRoutes);
app.use('/coach', coachRoutes);
app.use('/admin', adminRoutes);

// 404
app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: 'Not found' });
});

// Central error handler
// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

async function startServer() {
  try {
    await ensureConfiguredAdmin();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (process.env.NODE_ENV === 'production') {
      console.error(`[admin-bootstrap] failed: ${message}`);
      process.exit(1);
    }
    console.warn(`[admin-bootstrap] skipped in non-production: ${message}`);
  }

  app.listen(PORT, () => {
    console.log(`🚀 MANAS API listening on port ${PORT}`);
    startReminderCron();
  });
}

void startServer();

export default app;
