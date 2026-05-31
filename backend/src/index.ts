import 'dotenv/config';
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';

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
import paymentsRoutes from './routes/payments';
import { startReminderCron } from './lib/reminders';

const app = express();
const PORT = process.env.PORT ?? 4000;
const API_VERSION = process.env.npm_package_version ?? '1.0.0';

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.NODE_ENV === 'production'
    ? process.env.FRONTEND_URL
    : true,
  credentials: true,
}));
app.use(morgan('dev'));
app.use(express.json());

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
app.use('/payments', paymentsRoutes);

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

app.listen(PORT, () => {
  console.log(`🚀 MANAS API listening on port ${PORT}`);
  startReminderCron();
});

export default app;
