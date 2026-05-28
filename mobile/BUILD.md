# MANAS — APK & Play Store Build Guide

## Prerequisites

1. **Expo account** — [expo.dev](https://expo.dev) (free)
2. **EAS CLI**
   ```bash
   npm install -g eas-cli
   eas login
   ```
3. **Link the project** (one-time)
   ```bash
   cd mobile
   eas init
   # This generates and adds `extra.eas.projectId` to app.json
   ```

---

## Build commands

### Preview APK (shareable .apk, no store needed)

```bash
cd mobile
eas build --platform android --profile preview
```

- EAS builds in the cloud (~10–20 min first time, ~5–10 min after)
- Download the `.apk` from the EAS dashboard or the printed URL
- Install directly on any Android device (enable "Install from unknown sources")
- Share the build link with testers via `eas build:list`

### Production AAB (for Play Store)

```bash
eas build --platform android --profile production
```

Produces an `.aab` (Android App Bundle) optimised for Play Store distribution.

### iOS (future)

```bash
eas build --platform ios --profile preview    # .ipa for TestFlight
eas build --platform ios --profile production # for App Store
```

Requires an Apple Developer account ($99/yr).

---

## Submit to Google Play

### One-time: Create a Google Play Service Account key

1. Open [Google Play Console](https://play.google.com/console) → Setup → API access
2. Link to a Google Cloud project
3. Create a service account with **Release manager** role
4. Download the JSON key → save as `mobile/play-service-account.json`
   > ⚠️ Never commit this file — add it to `.gitignore`

### Submit

```bash
eas submit --platform android --profile production
```

EAS uploads the `.aab` to the Play Store internal track automatically.

---

## First-time Play Console checklist

Before your first submission, complete these in the Play Console:

- [ ] **App listing**: icon, screenshots (phone + 7-inch tablet), short/full description
- [ ] **Privacy policy URL**: required — host a privacy policy page
- [ ] **Content rating questionnaire**: answer for medical/health app category
- [ ] **Target API level**: SDK 34+ (EAS handles this automatically)
- [ ] **Data safety section**: declare what user data is collected (email, health data)
- [ ] **App access**: provide an email account that can receive the MANAS login OTP.

---

## Versioning

Bump `versionCode` in `mobile/app.json` → `android.versionCode` before every Play Store release.
Bump `version` (semver) for every public release.

---

## Environment variables in builds

The `eas.json` `preview` and `production` profiles already inject:
```
EXPO_PUBLIC_API_URL=https://manas-api-dlj7.onrender.com
```

Release verification is intentionally stricter than local development. Before a
production build can be called release-ready, provide these public Firebase
configuration values through EAS environment variables or `.env.production`:

```
EXPO_PUBLIC_FIREBASE_API_KEY=
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=
EXPO_PUBLIC_FIREBASE_PROJECT_ID=
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
EXPO_PUBLIC_FIREBASE_APP_ID=
```

Local smoke testing may use `EXPO_PUBLIC_E2E_MOCK_AUTH=1`, but that flag is
debug-only and must not be enabled in release builds. The release check can be
run with:

```bash
JAI_REQUIRE_RELEASE_BACKEND_FIRST_CONFIG=1 npm run release:verify-backend-first
```

The current package identifiers are `com.jeygroups.manas` for Android and iOS.
Do not commit real `google-services.json`, `GoogleService-Info.plist`, signing
keys, service account JSON, or production secret values.

To add more env vars:
```json
"env": {
  "EXPO_PUBLIC_API_URL": "...",
  "EXPO_PUBLIC_OTHER_VAR": "..."
}
```

Or use EAS Secrets (for sensitive values):
```bash
eas secret:create --scope project --name SOME_SECRET --value "value"
```
