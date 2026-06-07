---
name: project-manas
description: MANAS app — full-stack build summary, stack, key decisions, what's stubbed
metadata:
  type: project
---

Full-stack MANAS (Jey Groups) build completed 2026-05-26. Commit: 9cef745.

**Why:** Virtual psychologist counseling & coaching platform for Jey Groups. Source-of-truth design in `manas_design.html`.

**Stack:**
- Backend: Express + TypeScript + Prisma + PostgreSQL (Render free tier)
- Mobile: Expo 56 + expo-router + NativeWind v4 + React Query + Zustand
- Bundle ID: com.jeygroups.manas
- Fonts: Fraunces / DM Sans / Instrument Serif (via @expo-google-fonts)
- Colors defined in `mobile/theme/colors.ts`, mirroring HTML design tokens

**Key decisions:**
- expo-splash-screen v56 exports functions (`preventAutoHideAsync`) not a class — import as `* as SplashScreen`
- react-native-svg installed separately (not bundled with expo-svg preset)
- NativeWind v4: requires `metro.config.js` with `withNativeWind`, `babel.config.js` with `nativewind/babel`, `global.css` imported in root `_layout.tsx`
- CSS import TS error fixed via `expo-env.d.ts` with `declare module '*.css'`

**Release-blocker pass (2026-05-31, branch `release-blockers`):** closed the code-side Play Store gates.
- Compliance: first-launch crisis disclaimer modal + persistent "In crisis?" banner (India helplines, `tel:` links); `legal/privacy.md`+`legal/terms.md` mirrored into `mobile/lib/legal.ts`, rendered offline at `/legal`; mandatory signup consent checkbox + `User.consentAt`.
- Coach role: `/coach` API + `app/(coach)` (appointments accept/decline/complete/join, availability editor, video upload). `GET /topics` added.
- Admin role: `/admin` API + `app/(admin)` (stats, users role/premium/deactivate, promote-to-coach, content approve, broadcast). Added `User.isActive` (blocks login) + `Video.approved` (hides from library). Seed `admin@manas.app`/`adminpass123`.
- Premium access: administrator-managed `isPremium`; admins can search users by email and toggle access. `/me` returns `isPremium`.
- `routeForRole()` in `lib/auth.ts` routes ADMIN/COACH/USER after login + on cold start.
- Versioned migration baseline `backend/prisma/migrations/0_init` (render.yaml still `db push` transitionally — see DEPLOY.md cutover). CORS allows no-origin + comma-separated `FRONTEND_URL`.

**Still owner-only:** email delivery credentials, `eas init` for push+builds, prod DB seed, public privacy-policy URL, Play Console, video CDN content; richer web admin dashboard and native-audio polish are v1.1.

**How to apply:** Reference when resuming work. Verify a file/flag still exists before relying on it. Provider integrations degrade to 501 — set credentials in Render, never commit. New typed routes need `.expo/types` regenerated (start `expo start` briefly) before `tsc` passes.
