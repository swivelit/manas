# MANAS — Baseline Verification (Phase 0)

Run from the VS Code terminal on branch `main` before starting release-blocker work.
Date: 2026-05-31 · Node v20.19.6 · npm 10.8.2

## Backend (`backend/`)

| Step | Command | Result |
| --- | --- | --- |
| Clean install | `npm ci` | ✅ 258 packages, Prisma Client v5.22.0 generated (3 high-sev npm-audit advisories, transitive — not blocking) |
| Typecheck | `npm run typecheck` (`tsc --noEmit`) | ✅ no errors |
| Build | `npm run build` (`tsc`) | ✅ emitted `dist/` (index.js, routes/, lib/, middleware/) |

## Mobile (`mobile/`)

| Step | Command | Result |
| --- | --- | --- |
| Clean install | `npm ci` | ✅ exit 0 |
| Typecheck | `npm run typecheck` (`tsc --noEmit`) | ✅ no errors |
| Expo Doctor | `npx expo-doctor` | ✅ 21/21 checks passed, no issues |

## Verdict

**Baseline is green.** Backend and mobile both typecheck, build, and pass Expo Doctor on a clean install from lockfile. Safe to proceed with release-blocker phases (compliance → coach → admin → payments → migrations).

> The 3 high-severity npm-audit findings in the backend are in transitive dependencies and pre-existing; they are tracked but do not block the typecheck/build baseline.
