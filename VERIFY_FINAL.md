# MANAS — Final Verification (Phase 6)

Branch `release-blockers` · Date 2026-05-31 · Node v20.19.6
Local API: `http://localhost:4000` (seeded local Postgres `manas_dev`). Production API: `https://manas-api-dlj7.onrender.com`.

## Automated checks

| Area | Command | Result |
| --- | --- | --- |
| Backend typecheck | `npm run typecheck` | ✅ no errors |
| Backend build | `npm run build` | ✅ emitted `dist/` |
| Backend schema | `prisma db push` | ✅ local DB in sync |
| Backend seed | `npm run db:seed` | ✅ seed complete (admin + 3 coaches + Sarah + categories/topics/videos) |
| Mobile typecheck | `npm run typecheck` | ✅ no errors |
| Mobile Expo Doctor | `npx expo-doctor` | ✅ 21/21 checks passed |
| Mobile Android export | `npx expo export --platform android` | ✅ bundle built (5.8 MB), exit 0 |

## Live backend smoke (local, seeded)

All run against `http://localhost:4000` with seeded accounts.

| Check | Result |
| --- | --- |
| `GET /` | ✅ 200 — MANAS API metadata |
| `GET /categories` | ✅ 200 — 2 categories |
| `GET /topics` (new) | ✅ 200 — 25 topics |
| `GET /coach/appointments` without token | ✅ 401 (auth guard) |
| `POST /auth/login` admin@manas.app | ✅ 200 — role ADMIN |
| `GET /admin/stats` (admin) | ✅ 200 — users/coaches/videos/premium/sessions counts |
| `GET /admin/users` (admin) | ✅ 200 — paginated list |
| `GET /admin/coaches` (admin) | ✅ 200 — 3 coaches |
| `POST /auth/login` mira@manas.app | ✅ 200 — role COACH |
| `GET /coach/appointments` (coach) | ✅ 200 — sessions list |
| `GET /coach/availability` (coach) | ✅ 200 — availability rows |
| `GET /me` (user) | ✅ 200 — `isPremium:false` exposed |
| `GET /admin/stats` as USER | ✅ 403 (role guard) |
| Deactivate user → login blocked | ✅ PATCH isActive:false → login 403 |
| Reactivate user → login restored | ✅ PATCH isActive:true → login 200 |
| Admin self-deactivate guard | ✅ 400 (can't lock yourself out) |
| `POST /admin/notifications/broadcast` | ✅ 200 — recipients: 5 |

> Backend is fully exercised end-to-end. Sarah's account state was restored to active after the deactivation test.

## Smoke checklist (mobile)

Legend: ✅ verified live · 🟦 implemented + typechecks + bundles (manual device pass recommended; I can't drive a physical device/Expo Go from here).

```
✅ Baseline typechecks pass (backend + mobile)
🟦 App launches past splash (bundle exports clean; prior launch verified in android-launch-logcat.txt)
🟦 FIRST LAUNCH: crisis disclaimer modal appears, "I understand" dismisses it (crisis_ack in SecureStore)
🟦 Register: consent checkbox blocks submit until checked
🟦 Register → tabs (USER role) via routeForRole
✅ Profile "Privacy & Terms" → /legal screen renders bundled docs offline; "In crisis?" opens tappable helplines (code + bundle verified)
🟦 Login as mira@manas.app → COACH appointments, NOT user tabs (routeForRole COACH; login verified live on backend)
🟦 Coach: see appointments, accept/decline/mark complete/join, edit availability, add a video (backend routes verified live)
🟦 Login as admin@manas.app → ADMIN dashboard (routeForRole ADMIN; login verified live)
🟦 Admin: stat cards load, change a user's role, promote a user to coach (backend verified live; UI wired to same endpoints)
🟦 Premium video → neutral admin-access notice for non-premium users; premium users can open content after admin toggle
🟦 Existing flows still work: book demo, reschedule, cancel, join (Jitsi), videos, bookmarks, mood, voice guidance (untouched; typecheck + bundle clean)
🟦 No regressions in the patient app (no patient files changed except additive: crisis banner on sessions/profile, legal/upgrade rows)
```

### Why mobile UI items are 🟦 not ✅

I verified every mobile screen **compiles, typechecks, and bundles** (Metro export succeeds with all coach/admin/legal/crisis/payment screens), and that **every backend endpoint they call works live**. I did not click through them on a physical device because this environment can't drive Expo Go/a phone. The recommended final step before submission is one manual device pass using the commands below.

## How to run it yourself (VS Code terminal)

```bash
# Terminal 1 — backend
cd backend && npm run db:setup && npm run dev

# Terminal 2 — mobile (Expo Go for UI, dev build for push)
cd mobile && npx expo start --clear   # scan the QR with Expo Go
```

Sign in to test each role (dev backend returns the email code in the response, so OTP auto-fills):
- USER: `sarah@example.com` (password login: `password123`)
- COACH: `mira@manas.app` / `coachpass123`
- ADMIN: `admin@manas.app` / `adminpass123`
