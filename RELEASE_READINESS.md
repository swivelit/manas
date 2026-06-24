# MANAS Release Readiness

Last checked: 2026-05-31 (branch `release-blockers`)

## Done

### Play Store compliance (Phase 1 — mandatory gate)
- **Crisis disclaimer**: one-time first-launch modal (persisted via `crisis_ack` in SecureStore) with India helplines (iCall, Vandrevala, Tele-MANAS, AASRA) as tappable `tel:` links. Persistent "In crisis? Tap for help" banner on the Sessions header and Profile footer opens the same helplines.
- **Privacy Policy + Terms of Service**: authored at `legal/privacy.md` and `legal/terms.md`, mirrored into `mobile/lib/legal.ts`, rendered offline on the in-app `/legal` screen, and exposed publicly by the backend at `https://manas-api-dlj7.onrender.com/privacy-policy` and `https://manas-api-dlj7.onrender.com/terms`. Linked from Profile and the signup consent. Play Console Data Safety answers must match the privacy policy.
- **Signup consent**: mandatory checkbox on register blocks account creation until the user accepts Terms/Privacy and acknowledges MANAS is not a crisis service. `User.consentAt` is recorded at account creation.

### Coach surface (Phase 2 — PDF §4.B)
- `/coach` API (role-guarded): appointments, accept/decline/mark-complete (notifies the client), get/replace weekly availability, add a video. `GET /topics` backs the upload picker.
- `app/(coach)` area: appointments, availability editor, video upload. Role-based routing lands coaches here after login and on cold start.

### Admin surface (Phase 3 — PDF §4.C)
- `/admin` API (role-guarded): stats, paginated users (change role / toggle premium / activate-deactivate, with self-lockout guard), coaches list + promote-user-to-coach, videos list + approve toggle, broadcast notification to all users.
- `app/(admin)` area: dashboard stat cards + broadcast, user management sheet, coach promotion, content approval.
- `User.isActive` (deactivation blocks login at every auth path) and `Video.approved` (unapproved videos hidden from the public library) added. Admin seed: `admin@manas.app` / `adminpass123`.

### Premium access (Phase 4)
- Premium is administrator-managed. Admins can search users by email and toggle `user.isPremium`; premium library content opens for premium users and shows a neutral admin-access notice for everyone else. `/me` returns `isPremium`.

### Deploy hardening (Phase 5)
- Versioned Prisma migration baseline at `backend/prisma/migrations/0_init` (full current schema). `render.yaml` intentionally still uses `db push` for this transitional release; DEPLOY.md documents the exact one-time cutover to `prisma migrate deploy`.
- CORS hardened: always allows no-origin requests (native mobile/curl); production restricted to a comma-separated `FRONTEND_URL` allowlist.
- BUILD.md documents the required one-time `eas init` (for push tokens + EAS builds) and an Expo Go vs. dev-build capability matrix.
- Public legal pages:
  - Google Play Privacy Policy URL: `https://manas-api-dlj7.onrender.com/privacy-policy`
  - Terms URL: `https://manas-api-dlj7.onrender.com/terms`

### Play Store signing
- Google Play rejects APKs and Android App Bundles signed with the Android debug certificate.
- Valid Play Store AAB path A, recommended EAS production build:
  ```bash
  cd mobile
  eas build --platform android --profile production
  ```
- Valid Play Store AAB path B, local release-signed build:
  ```bash
  ./scripts/create-android-upload-keystore.sh
  ./scripts/build-android_release-aab.sh
  ```
- Never upload `dist/manas-debug.apk` or any debug-signed AAB.
- Remove the rejected AAB from the Play Console release draft and replace it with the new release-signed AAB.

### Play Store photo and video permissions
- MANAS must not request `android.permission.READ_MEDIA_VIDEO`, `android.permission.READ_MEDIA_IMAGES`, `android.permission.READ_EXTERNAL_STORAGE`, or `android.permission.WRITE_EXTERNAL_STORAGE` in the final Android manifest.
- Audio/video calls use `CAMERA` and `RECORD_AUDIO`; they do not require `READ_MEDIA_VIDEO`.
- Admin and coach video uploads must use a user-selected file picker flow (`expo-document-picker`) instead of broad photo/video gallery access.
- Before uploading to Play Console, build a fresh release AAB and verify the manifest:
  ```bash
  ./scripts/build-android_release-aab.sh
  ./scripts/verify-android-media-permissions.sh dist/manas-release.aab
  ```
- Upload the fresh `dist/manas-release.aab` after this fix. Reusing an older AAB can keep the Play Console "Photo and video permissions" declaration visible.

### Play foreground service demo videos
- Use `RESTART_HEADLESS_EMULATOR=true FORCE_VISIBLE_EMULATOR=true DEMO_SECONDS=120 ./scripts/record-all-play-fgs-demos.sh` to record separate local MP4s for the Camera, Media playback, and Microphone Play Console video fields.
- Single-field options: `./scripts/record-play-camera-demo.sh`, `./scripts/record-play-media-playback-demo.sh`, and `./scripts/record-play-microphone-demo.sh`.
- If ADB is broken, run `REPAIR_ADB=true ./scripts/android-adb-doctor.sh`. If you need a specific emulator, run `AVD_NAME="YOUR_AVD_NAME" RESTART_HEADLESS_EMULATOR=true FORCE_VISIBLE_EMULATOR=true DEMO_SECONDS=120 ./scripts/record-all-play-fgs-demos.sh`.
- If the script says the emulator is hidden/headless, rerun `RESTART_HEADLESS_EMULATOR=true FORCE_VISIBLE_EMULATOR=true ./scripts/record-all-play-fgs-demos.sh`, or close all emulator windows, run `adb kill-server`, `pkill -f "qemu-system"`, and `pkill -f "emulator"`, then start a visible AVD from Android Studio Device Manager.
- Upload each generated MP4 to YouTube as Unlisted or to Google Drive with anyone-with-link access, then paste each public/shareable URL into its matching Play Console field. Do not paste local `dist/play-store` paths.

### Previously completed (carried forward, not regressed)
- Patient app: onboarding, categories/topics, coach booking (category→topic→coach→date/time→confirm), reschedule/cancel, Jitsi join for video sessions, in-app chat sessions, video library with premium gating + resume + bookmarks + subtitles + likes, mood check-in, multilingual mascot guide, notifications, timezone handling.
- Email OTP auth, push registration (non-fatal), idempotent seed.
- Backend + mobile both typecheck, build/export, and pass Expo Doctor (21/21) on a clean install. Full live backend smoke of all new endpoints passed (see `VERIFY_FINAL.md`).

## Still blocked / requires the owner (not code — credentials, accounts, hosting)

- **Email credentials** (set in Render, never commit): `EMAIL_USER`, `EMAIL_PASS`, and `EMAIL_FROM` for production email OTP delivery.
- **Seed the Render production database** after deploy (`npm run db:seed` from Render Shell) — otherwise the app shows empty states.
- **`eas init`** once (from the owner's Expo account) to write `extra.eas.projectId` — required for push tokens and EAS builds.
- **Confirm legal contact inbox**: `support@manas.app` is used in the public privacy policy and terms; confirm this is an owner-controlled inbox before Play submission.
- **Play Console**: developer account, release-signed AAB, data-safety + content rating, screenshots, app-access instructions, internal-track QA.
- **One manual device QA pass** of the mobile flows (see the checklist in `VERIFY_FINAL.md`) — backend is verified live; UI is code/bundle-verified.
- **Migration cutover** to `prisma migrate deploy` after the next `db push` deploy converges prod to the current schema (steps in DEPLOY.md).

## Deferred to v1.1 (documented, not blocking v1)
- Richer **web** admin dashboard (mobile admin satisfies the v1 role requirement).
- Native audio-only session polish.
- Multi-window-per-day coach availability; coach self-service profile editor.
- Immediate session revocation for deactivated users (currently blocked at next login; JWTs last 30d).
- Push fan-out for broadcasts via a queue for large audiences; real counseling video content + CDN.

## Release decision

**Closer — the code-side release gates are now closed.** Play Store compliance (crisis disclaimer, privacy/terms, consent), the required Coach and Admin roles, admin-managed premium access, versioned-migration infrastructure, and CORS hardening are all implemented, typecheck/build/export clean, and the backend is verified end-to-end on a seeded local database.

**Not yet submittable** purely because of owner-only steps that can't be done from code: provider credentials, `eas init`, hosting the privacy policy URL, seeding prod, a Play Console account, and one manual device QA pass. Shortest path to submission is in `VERIFY_FINAL.md` and the deliverable summary.
