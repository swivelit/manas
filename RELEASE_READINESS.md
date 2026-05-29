# MANAS Release Readiness

Last checked: 2026-05-29

## Verification Summary

| Check | Status | Evidence | Remaining work |
| --- | --- | --- | --- |
| Node/SDK compatibility | Done | Mobile uses Expo SDK 56; `.nvmrc` pins Node `22.13.1`. | Run `nvm install 22.13.1 && nvm use 22.13.1` before mobile verification. |
| Mobile TypeScript | Done | `npm run typecheck` passes in `mobile`. | None for current code. |
| Mobile Expo dependency check | Done | `npx expo install --check` passes; offline sandbox run used Expo's local bundled dependency map, then online doctor passed with network access. | None for current SDK set. |
| Mobile Expo Doctor | Done | `npx expo-doctor --verbose` passes 21/21 checks with network access. | Keep checking after SDK upgrades. |
| Android export | Done | `npx expo export --platform android --output-dir ./dist/android --clear` passes and writes the Android export. | None for current app bundle export. |
| Backend TypeScript and Prisma generation | Done | `npx prisma generate`, `npm run typecheck`, and `npm run build` pass in `backend`. | None for current backend code. |
| Backend local smoke | Done | With local PostgreSQL at `postgresql://hari@localhost:5432/manas_dev`, `prisma db push`, seed, and server on port 4000 returned `/health`, 2 categories, 15 Emotional Healing topics, 10 Coaching topics, and video rows. | This is local smoke only, not production infrastructure validation. |
| Android launch | Done | Android debug development build installed and launched on `Pixel_9`; final `android-launch-logcat.txt` grep found no MANAS startup fatal errors after navigating onboarding, auth, home, topics, booking, videos, profile, and assistant. | Release APK/AAB signing and Play Store track validation are not covered. |
| Crash fix | Done | Login/register no longer crash when Google OAuth Android client ID is missing; Google auth is disabled until platform credentials are configured. | Configure production OAuth IDs before enabling Google login for release. |

## PRD Scope

| Requirement | Status | Evidence | Remaining work |
| --- | --- | --- | --- |
| Emotional Healing category | Done | Seed creates `emotional-healing`; mobile routes Home to `/(tabs)/topics`; backend smoke returned the category. | None for demo. |
| Emotional Healing has 15 topics | Done | `backend/prisma/seed.ts` creates 15 Emotional Healing topics; smoke endpoint `/categories/emotional-healing/topics` returned 15. | Production topic copy/content review. |
| Coaching category | Done | Seed creates `coaching`; mobile has `mobile/app/coaching.tsx`; backend smoke returned the category. | None for demo. |
| Coaching has 10 topics | Done | `backend/prisma/seed.ts` creates 10 Coaching topics; smoke endpoint `/categories/coaching/topics` returned 10. | Production topic copy/content review. |
| Select category, topic, coach, date/time, and book demo session | Done | Home category cards route to topic lists; topic details route to coach list; booking screen selects calendar date, slot, and session type; backend `POST /sessions` creates confirmed demo sessions. | Needs end-to-end QA with real users and production auth. |
| Calendar coach availability | Partial | Backend `GET /coaches/:id/availability` returns 30-minute slots and hides already booked slots. | Availability is seeded/static; no coach self-service dashboard to manage availability. |
| Timezone support | Partial | Backend returns UTC `startsAt` plus `Asia/Kolkata`; mobile formats slots in `me.timezone` or fallback `Asia/Kolkata`. | Per-coach timezone and user-editable timezone handling are not complete. |
| Booking confirmations | Partial | Backend creates a `BOOKING_CONFIRMED` notification and mobile shows a confirmation alert. | Production push/email/SMS delivery is not validated. |
| Booking reminders, reschedule, completed notifications | Partial | Reminder cron support and notification records exist. | Reschedule/completed flows and production delivery channels are release blockers. |
| Video library public videos | Done | `GET /videos` is public; logged-out mobile library renders without protected bookmark queries. | Replace demo videos with approved production content. |
| Video library premium videos | Partial | Backend returns 402 for premium videos when user is not premium; mobile shows a paywall fallback. | Payment/premium enrollment flow is missing. |
| Video streaming | Done | Mobile uses `expo-video` with remote MP4 sample URLs. | Production CDN and DRM/access policy are not validated. |
| Resume playback | Partial | Backend video detail now returns saved progress; mobile seeks to saved progress when present. | Needs full device QA across app restarts and enrolled premium users. |
| Progress tracking | Partial | Authenticated playback posts progress throttled by second and 10-second interval. | Needs offline retry/queueing and analytics validation. |
| Subtitle support | Partial | Schema includes `subtitleUrl`; video screen exposes subtitle control only when a subtitle URL exists. | No full external subtitle rendering/parsing QA; seed videos do not include real subtitle tracks. |
| Likes/bookmarks | Partial | Bookmarking exists for authenticated users. | Likes are not implemented as a separate feature. |
| Toy Assistant guidance | Partial | Assistant gives route-specific help for Home, Healing, Coaching, Booking, Videos, Sessions, Profile, and Auth routes. | It does not inspect every button tap or provide full multilingual/smart contextual suggestions. |
| User/Patient role | Done | Prisma `Role.USER`; patient mobile app supports auth, browsing, videos, booking, sessions, profile, notifications. | Production hardening and QA. |
| Coach/Psychologist role | Partial | Prisma `Role.COACH` and coach records exist; coaches appear in patient booking. | Coach/Psychologist dashboard is missing. |
| Admin role | Partial | Prisma `Role.ADMIN` exists. | Admin dashboard is missing. |
| Email/password auth | Partial | Backend `/auth/register` and `/auth/login` support password auth; mobile UI currently uses email OTP flow. | Add/verify password login/register UI if required for release. |
| Google login | Partial | Backend and mobile support Google token exchange when client IDs are configured; missing IDs no longer crash auth screens. | Production Google login credentials and OAuth validation are not configured in this repo. |
| Mobile OTP login | Partial | Backend has Twilio Verify endpoints; mobile phone auth screen exists. | Production Twilio credentials and SMS delivery are not configured in this repo. |
| Video session type | Done | Session type enum and booking UI include `VIDEO`; backend generates Jitsi URL. | Production video provider and privacy review. |
| Audio session type | Partial | Session type enum and booking UI include `AUDIO`; backend uses Jitsi URL with client-side audio behavior noted. | Native audio-only session experience is not fully implemented. |
| Chat session type | Partial | Session type enum and booking UI include `CHAT`; backend creates a Jitsi fallback URL. | Chat session implementation is missing. |
| Production notifications | Partial | Notification records are created and mobile can fetch notifications when authenticated. | Push/email/SMS delivery, reminder scheduling, and notification management are not production-ready. |
| Real production content/videos | Missing | Seed explicitly uses public Google sample MP4 files for demo playback. | Replace with approved MANAS counseling/coaching content and real CDN URLs. |
| Migration strategy beyond Prisma db push | Missing | Local smoke used `npx prisma db push`. | Add versioned migration workflow, migration review, rollback procedure, and environment promotion plan. |
| Payments and premium enrollment | Missing | Premium flags/paywall behavior exist, but no payment provider or enrollment purchase flow is implemented. | Required before charging users or unlocking paid videos/sessions. |
| Privacy, consent, and clinical safety | Missing | No production privacy policy, consent flow, data retention policy, emergency disclaimer, or clinical escalation workflow is implemented in-app. | Release blocker for a counseling/mental health app. |
| Play Store readiness | Missing | `mobile/BUILD.md` lists store submission steps. | Complete privacy policy URL, data safety, content rating, screenshots, app access, signed AAB, and internal track validation. |

## Release Blockers

- Production Google OAuth, mobile OTP/SMS, email delivery, and notification credentials are not configured.
- Payment/premium enrollment and real MANAS counseling/coaching video content are missing.
- Coach and admin dashboards are missing.
- Chat sessions and native audio-only sessions are not fully implemented.
- Privacy policy, consent, mental health safety disclosures, data retention, and Play Store data safety work are missing.
- Prisma `db push` is still used; production needs checked-in migrations and a rollback process.

## Release Decision

The current code is safe to demo as a patient-facing prototype after the verification commands pass. It is not release-ready because production dashboards, payment/premium enrollment, production auth providers, production notifications, real content, full chat/subtitle behavior, and database migration strategy remain incomplete.
