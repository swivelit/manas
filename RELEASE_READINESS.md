# MANAS Release Readiness

Last checked: 2026-05-30

## Done

- Backend root route implemented locally: `GET /` returns MANAS API metadata and public endpoint hints without exposing secrets.
- Backend `/health` remains lightweight and is still the Render health check path.
- Backend verification passed locally: `npm ci`, `npx prisma generate`, `npm run typecheck`, and `npm run build`.
- Local backend smoke passed against seeded local PostgreSQL: `/`, `/health`, `/categories`, `/categories/emotional-healing/topics`, `/categories/coaching/topics`, and `/videos`.
- Seed script is idempotent for demo categories, topics, users, coaches, coach availability, videos, and demo session creation. Re-running `npm run db:seed` no longer creates new duplicate availability/video/session rows.
- `backend/package.json` includes `db:setup` and `smoke:prod` commands.
- Mobile Expo SDK 56 dependency alignment passed after patch updates: `npx expo install --check` and `npx expo-doctor --verbose` pass.
- Mobile TypeScript passed: `npm run typecheck`.
- Android static export passed: `npx expo export --platform android --output-dir ./dist/android --clear`.
- Android development build launched on `Pixel_9` with production API configuration; `android-launch-logcat.txt` had no startup matches for `FATAL EXCEPTION`, `ReactNativeJS` fatal startup errors, `Invariant Violation`, or `main has not been registered`.
- Production-config mobile screens handled empty deployed API data without crashing for onboarding, home, topics, and videos.
- Notification registration is non-fatal; push-token, permissions, Android channel, and listener setup failures are caught and logged.

## Partial

- Render deployed API health check works on the current deployed revision: `https://manas-api-dlj7.onrender.com/health` returned HTTP 200 with status ok.
- Render root route is fixed in this repository, but the current deployed revision still returned `{"error":"Not found"}` until this change is deployed.
- Production database appears unseeded on Render: `/categories` returned `[]`, topic endpoints returned `Category not found`, and `/videos` returned `[]`.
- Emotional Healing and Coaching data are complete in the seed and local seeded smoke: 15 Emotional Healing topics and 10 Coaching topics.
- Booking workflow exists in app and API for category -> topic -> coach -> date/time -> confirm, and booking creates notification records.
- Calendar availability works from seeded/static coach availability and booked-slot filtering.
- Timezone handling returns UTC `startsAt` plus a timezone field, and mobile formats in user timezone or `Asia/Kolkata` fallback.
- Booking confirmation notifications are recorded and shown in app, but production delivery channels are not validated.
- Video library supports public videos and premium gating, but Render currently has no seeded video rows.
- Playback, resume progress, progress posting, and bookmarks exist for authenticated users; subtitle metadata is supported, but real subtitle rendering/content is not production-validated.
- Toy Assistant provides route-aware text guidance and an animated mascot; voice guidance and deep screen guidance are incomplete.
- Email/password API exists; mobile currently emphasizes OTP-style auth flows.
- Google auth and mobile OTP paths exist, but production OAuth/Twilio credentials are not configured in the repo.
- User, coach, and admin roles exist in Prisma; patient app is implemented, but coach/admin dashboards are missing.
- Video/audio/chat session types exist in schema and booking UI; audio/chat are not full native production experiences.

## Missing

- Production Render database seed has not been confirmed. Seed once from Render Shell after deploy with `npm run db:seed`, or run `npm run db:setup` when schema sync is also intended.
- Payment or premium enrollment provider is not implemented.
- Real MANAS production counseling/coaching video content and CDN policy are missing.
- Coach dashboard is missing.
- Admin dashboard is missing.
- Full chat session implementation is missing.
- Native audio-only session implementation is missing.
- Production push/email/SMS reminder delivery is not validated.
- Privacy policy, consent flow, data retention policy, emergency disclaimer, and clinical escalation workflow are missing in-app.
- Versioned production migration workflow and rollback plan are missing; deployment still uses `prisma db push`.
- Play Store production readiness is incomplete: signed AAB validation, privacy policy URL, data safety, content rating, screenshots, app access instructions, and internal-track QA.

## Release Blocker

- Deploy this backend change to Render so `GET /` no longer returns 404 in production.
- Seed the Render production database. Until then, production `/categories` is empty, topic endpoints fail, `/videos` is empty, and the app can only show empty/error states.
- Run production smoke after deploy and seed: `API_URL=https://manas-api-dlj7.onrender.com npm run smoke:prod` from `backend`.
- Configure production Google OAuth, Twilio/mobile OTP, email, and notification credentials without committing secrets.
- Add payment/premium enrollment before exposing premium videos or paid sessions.
- Complete clinical/privacy/consent safety work before public mental-health release.
- Add versioned migrations and rollback procedures before relying on production schema changes.

## Current Render Smoke

Checked against `https://manas-api-dlj7.onrender.com` before this repository change was deployed:

| Endpoint | Result |
| --- | --- |
| `/` | HTTP 404, `{"error":"Not found"}` |
| `/health` | HTTP 200, status ok |
| `/categories` | HTTP 200, empty array |
| `/categories/emotional-healing/topics` | HTTP 404, category not found |
| `/categories/coaching/topics` | HTTP 404, category not found |
| `/videos` | HTTP 200, empty array |

## Release Decision

MANAS is not release-ready. The current code is stable enough for a development build demo after deploying this fix and seeding the production database, but production release remains blocked by database seeding, provider credentials, payment/premium enrollment, dashboards, full session experiences, clinical/privacy work, migrations, and Play Store validation.
