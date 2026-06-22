# Google Play Foreground Service Demo Checklist

Use this checklist to record the MANAS foreground service permission demo video for:

- `FOREGROUND_SERVICE_CAMERA`
- `FOREGROUND_SERVICE_MEDIA_PLAYBACK`
- `FOREGROUND_SERVICE_MICROPHONE`

The app package is `com.jeygroups.manas`, and the production backend is `https://manas-api-dlj7.onrender.com`.

## Start an emulator or device

1. Start an Android emulator from Android Studio Device Manager, or connect a physical Android device with USB debugging enabled.
2. Confirm adb can see it:

   ```bash
   adb devices -l
   ```

3. If multiple devices are connected, set the target serial:

   ```bash
   export ANDROID_SERIAL=emulator-5554
   ```

The recording script respects `ANDROID_SERIAL`.

If ADB is broken or reports `Address already in use`, repair it first:

```bash
REPAIR_ADB=true ./scripts/android-adb-doctor.sh
```

## Recording three Google Play foreground service demo videos

Google Play Console asks for separate video links for camera, media playback,
and microphone foreground service declarations. Record three separate local MP4s
with the debug APK flow:

Record all three:

```bash
./scripts/record-all-play-fgs-demos.sh
```

Record only camera:

```bash
./scripts/record-play-camera-demo.sh
```

Record only media playback:

```bash
./scripts/record-play-media-playback-demo.sh
```

Record only microphone:

```bash
./scripts/record-play-microphone-demo.sh
```

With selected emulator:

```bash
START_EMULATOR=true AVD_NAME="YOUR_AVD_NAME" ./scripts/record-all-play-fgs-demos.sh
```

With longer time:

```bash
DEMO_SECONDS=180 ./scripts/record-all-play-fgs-demos.sh
```

Each script starts with the working debug APK launcher flow and records from a
visible emulator. Do not use a hidden/headless emulator for the real Play
Console videos.

Upload each generated MP4 to YouTube as Unlisted or to Google Drive with
anyone-with-link viewer access. Paste the camera video URL into the Camera video
field, the media playback video URL into the Media playback video field, and the
microphone video URL into the Microphone video field. Do not paste local
`dist/play-store` file paths into Play Console.

## Generic one-video fallback

From the repository root, the recommended local recording flow uses the debug APK launcher, repairs ADB, starts a visible emulator if needed, verifies the debug app launch, then records:

```bash
./scripts/record-debug-apk-play-demo.sh
```

Fallback commands:

```bash
DEMO_SECONDS=120 ./scripts/record-debug-apk-play-demo.sh
START_EMULATOR=true AVD_NAME="YOUR_AVD_NAME" DEMO_SECONDS=120 ./scripts/record-debug-apk-play-demo.sh
```

Production-like release APK recording is still available:

```bash
BUILD_MODE=release DEMO_SECONDS=120 ./scripts/record-play-foreground-service-demo.sh
```

Debug fallback:

```bash
BUILD_MODE=debug DEMO_SECONDS=120 ./scripts/record-play-foreground-service-demo.sh
```

Existing APK:

```bash
APK_PATH=dist/manas-release.apk BUILD_MODE=none DEMO_SECONDS=120 ./scripts/record-play-foreground-service-demo.sh
```

The recommended debug wrapper uses `RESET_APP=true` so the recording starts from a signed-out app and shows the reviewer login flow. The lower-level recording script does not pre-grant camera or microphone permissions by default, which helps the video show the normal Android permission prompts after the user starts or joins a session.

Useful options:

```bash
RESET_APP=true BUILD_MODE=release DEMO_SECONDS=120 ./scripts/record-play-foreground-service-demo.sh
GRANT_PERMISSIONS=true BUILD_MODE=release DEMO_SECONDS=120 ./scripts/record-play-foreground-service-demo.sh
OUTPUT_DIR=dist/play-store VIDEO_NAME=manas-play-demo.mp4 ./scripts/record-play-foreground-service-demo.sh
```

## What the video must show

1. MANAS opens normally.
2. The reviewer/test user signs in. Use the reviewer account you provide in Play Console App access; do not put private passwords or OTPs in scripts.
3. The user navigates to the dashboard or session area.
4. The user opens or joins an audio/video session/call.
5. Camera and microphone prompts appear only after the user starts or joins the session, unless you intentionally used `GRANT_PERMISSIONS=true`.
6. The active audio/video session is visible for a few seconds.
7. The user leaves or ends the session.

## Output files

The three-video scripts write local files under `dist/play-store`:

- `manas-fgs-camera-demo-YYYYMMDD-HHMMSS.mp4`
- `manas-fgs-media-playback-demo-YYYYMMDD-HHMMSS.mp4`
- `manas-fgs-microphone-demo-YYYYMMDD-HHMMSS.mp4`
- `*-compressed.mp4`, if `ffmpeg` is installed

The generic fallback script writes:

- `manas-foreground-service-demo-YYYYMMDD-HHMMSS.mp4`
- `manas-foreground-service-demo-YYYYMMDD-HHMMSS-compressed.mp4`, if `ffmpeg` is installed
- `manas-play-demo-logcat-YYYYMMDD-HHMMSS.txt`
- `manas-play-demo-device-YYYYMMDD-HHMMSS.txt`

## Upload the video

YouTube:

1. Upload the generated MP4.
2. Set visibility to `Unlisted`.
3. Copy the YouTube share URL.

Google Drive:

1. Upload the generated MP4.
2. Open Share.
3. Set General access to `Anyone with the link` and role to `Viewer`.
4. Copy the Drive share URL.

Play Console requires a public or shareable video URL. Do not paste the local `dist/play-store/...mp4` path into Play Console.

## Play Console description text

Camera:

MANAS uses the camera only during user-initiated video coaching/session calls. The camera starts only when the user joins an in-app session/call and is not used for hidden recording or surveillance.

Media playback:

MANAS uses media playback foreground service support only during user-initiated audio/video coaching sessions so session audio/video can continue reliably while the active session is visible to the user.

Microphone:

MANAS uses the microphone only during user-initiated audio/video coaching/session calls. This allows the user to participate in an active session. MANAS does not record calls in the background or listen without the user starting a session.
