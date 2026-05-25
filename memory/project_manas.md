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

**Stubbed (to implement next):**
- Google OAuth (`POST /auth/google` returns 501)
- Mobile OTP login
- Video CDN (video URLs are placeholder strings — need real CDN)
- Push notifications (notification DB model exists, sending not wired)
- Admin dashboard
- Coach video upload
- Payments / premium gating

**How to apply:** Reference when resuming work — check stubs before adding new features that depend on them.
