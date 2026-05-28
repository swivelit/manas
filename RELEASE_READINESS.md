# MANAS Release Readiness

Last checked: 2026-05-28

## Verification Summary

| Check | Status | Evidence | Remaining work |
| --- | --- | --- | --- |
| Mobile TypeScript | Done | `npm run typecheck` passes in `mobile`. | None for current code. |
| Mobile Expo dependency check | Done | `npm run deps:check` passes. | None for current SDK set. |
| Mobile Expo Doctor | Done | `npm run doctor` passes after replacing `expo-av` with `expo-video`; `expo-modules-jsi` is excluded from React Native Directory metadata because it is an Expo transitive package with no directory entry. | Keep checking after SDK upgrades. |
| Android export | Done | `npm run export:android` passes and writes the Android export. | None for current app bundle export. |
| Backend TypeScript and Prisma generation | Done | `npm run verify` in `backend` runs `npx prisma generate && npm run typecheck`. | None for current backend code. |
| Backend local smoke | Done | With local PostgreSQL at `postgresql://hari@localhost:5432/manas_dev`, `prisma db push`, seed, and existing server on port 4000 returned `/health`, `/categories`, 15 Emotional Healing topics, and 10 Coaching topics. | This is local smoke only, not production infrastructure validation. |
| Android launch | Done | Android debug build installs and opens to the onboarding screen; clean post-launch log sample has no MANAS `AndroidRuntime` or `ReactNativeJS` fatal lines. | Release APK/AAB signing and Play Store track validation are not covered. |

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
| Google login | Partial | Backend and mobile support Google token exchange when client IDs are configured. | Production Google login credentials and OAuth validation are not configured in this repo. |
| Mobile OTP login | Partial | Backend has Twilio Verify endpoints; mobile phone auth screen exists. | Production Twilio credentials and SMS delivery are not configured in this repo. |
| Video session type | Done | Session type enum and booking UI include `VIDEO`; backend generates Jitsi URL. | Production video provider and privacy review. |
| Audio session type | Partial | Session type enum and booking UI include `AUDIO`; backend uses Jitsi URL with client-side audio behavior noted. | Native audio-only session experience is not fully implemented. |
| Chat session type | Partial | Session type enum and booking UI include `CHAT`; backend creates a Jitsi fallback URL. | Chat session implementation is missing. |
| Production notifications | Partial | Notification records are created and mobile can fetch notifications when authenticated. | Push/email/SMS delivery, reminder scheduling, and notification management are not production-ready. |
| Real production content/videos | Missing | Seed explicitly uses public Google sample MP4 files for demo playback. | Replace with approved MANAS counseling/coaching content and real CDN URLs. |
| Migration strategy beyond Prisma db push | Missing | Local smoke used `npx prisma db push`. | Add versioned migration workflow, migration review, rollback procedure, and environment promotion plan. |

## Release Decision

The current code is safe to demo as a patient-facing prototype after the verification commands pass. It is not release-ready because production dashboards, payment/premium enrollment, production auth providers, production notifications, real content, full chat/subtitle behavior, and database migration strategy remain incomplete.
