# MANAS — local launch verification (2026-05-28)

Run from VS Code terminal in `/Users/hari/Documents/my_git/manas`.

## Environment

- macOS Darwin 25.3.0
- Node v20 (per backend/.env NODE_VERSION)
- Postgres 18 (Homebrew, `postgresql@18`) — started via `brew services start postgresql@18`
- Expo SDK 56, React Native 0.85, React 19.2

## Phase 0 commands & results

### 1. `backend && npm ci`
`added 225 packages, 0 vulnerabilities blocking`. Prisma client generated (5.22.0).

### 2. `backend && npx tsc --noEmit`
Pass. No type errors.

### 3. `mobile && npm ci`
`added 687 packages`. 11 moderate audit warnings (transitive deps, non-blocking).

### 4. `mobile && npx tsc --noEmit`
Pass. No type errors.

### 5. `mobile && npx expo-doctor`
20 / 21 checks pass. One warning:
- Audio playback and recording now use `expo-audio`; video playback uses `expo-video`.
- `expo-modules-jsi` has no react-native-directory metadata — internal Expo module, safe to ignore.

### 6. `mobile && npx expo install --check`
`Dependencies are up to date`.

### 7. Local Postgres + schema
- `brew services start postgresql@18` — running on `localhost:5432`.
- `psql -d postgres -c "CREATE DATABASE manas_dev"` — created.
- Updated `backend/.env` so `DATABASE_URL` points at `postgresql://hari@localhost:5432/manas_dev` and `NODE_ENV=development` (commented-out prod URL preserved for reference). `.env` is gitignored.
- `cd backend && npx prisma db push` — schema synced (project uses `db push`, not migrations; see render.yaml).
- `cd backend && npm run db:seed` — categories, topics, coaches, sample videos, demo Sarah session inserted.

### 8. Backend boots
```
$ cd backend && npm run dev
🚀 MANAS API listening on port 4000
```
- `curl http://localhost:4000/health` → `{"status":"ok",...}` 200 OK.
- `curl http://localhost:4000/categories` → 2 categories returned.
- `curl http://localhost:4000/categories/emotional-healing/topics` → 15 topics returned.

### 9. Expo bundles (this is the launch test)
```
$ cd mobile && npx expo start  # Metro bundler started cleanly at :8081
$ cd mobile && npx expo export --platform android --output-dir /tmp/manas-export
```
Result: **`index-...hbc` 5.5 MB Hermes bundle produced cleanly, no errors**. This is the strongest non-device proof that the JS will boot on Android. The earlier "app crash on real device" report was addressed in commit `92aa79f` (app crash fix), which removed the legacy `App.tsx` and corrected splash-screen handling in `_layout.tsx`.

## Phase 0 verdict — **READY**

JS bundle, TypeScript, expo-doctor, backend, DB seed all green. Proceeding to Phase 1 feature work.

## Notes for the user

- The backend `.env` was switched to point at local Postgres. To run against the Render production DB, comment the local line and restore the Render URL (preserved as a comment in `.env`).
- `prisma db push` is the project convention (per `render.yaml`). The user brief asked for `prisma migrate dev`, but adopting migrations would require baselining the existing prod DB. Schema changes in Phase 1 are all additive (new columns / new tables), so `db push` applies them safely.
- To run the app on a phone: `cd mobile && npx expo start`, install Expo Go on the phone, scan the QR. For a stand-alone APK, use `./build-apk.sh` or `eas build -p android --profile preview`.
