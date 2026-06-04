# manas

## Local Verification

Expo SDK 56 requires Node 22.13.1 or newer for the mobile toolchain. The root verification script checks the backend and mobile app together.

```bash
nvm install 22.13.1
nvm use 22.13.1
./scripts/verify-all.sh
```

## Android Builds

Build a local debug APK:

```bash
./scripts/build-android-apk.sh
```

Install and launch the debug APK on a connected adb device or emulator, then save startup logs to `dist/android-launch-logcat.txt`:

```bash
./scripts/launch-debug_apk.sh
```

Build a local release APK for QA installs:

```bash
./scripts/build-android_release-apk.sh
```

Build Android with EAS:

```bash
cd mobile && eas build --platform android --profile preview
cd mobile && eas build --platform android --profile production
```

The `preview` profile produces a shareable APK. The `production` profile produces a Play Store AAB.

When testing against a backend running on the same machine from the Android emulator, set the API URL to the emulator host alias:

```bash
cd mobile
EXPO_PUBLIC_API_URL=http://10.0.2.2:4000 npx expo start --clear
```

JEY GROUPS
MANAS
MANAS — Psychologist Counseling Virtual Offi ce Application
Product Requirement & Developer Documentation
1. Project Overview
Application Name MANAS
Application Type Virtual psychologist counseling and coaching platform.
Purpose
MANAS helps users:
● Heal emotionally through guided counseling topics
● Improve professional and personal growth through coaching
● Access demo sessions, educational videos, and guided support
● Navigate the app easily through an interactive assistant/toy guide
2
2. Core Modules The application contains 2 Main Categories:
A. Emotional Healing This section focuses on mental and emotional well-being.
Total Topics: 15
Topic
Suggested Icon
Overthinking
Brain with circular arrows
Obsessive Negative Thinking
Scribbled cloud around head
Suffering from Bad Memories
Broken/faded photo
Trauma
Cracked heart with healing line
Chronic Stress
Pressure meter / stress lines
Irritable Bowel Syndrome
Stomach with tension wave
Sleeplessness
Moon + tired eyes
Chronic Anxiety
Heartbeat + alert symbol
3
Depression
Cloud with rain / low-energy face
Phobia
Warning triangle + shadow
Anger & Rage
Flame inside head
Low Self-Esteem
Small person silhouette
Lack of Confi dence
Broken shield
Compulsion & Addictions
Chain/broken chain
Shy Inhibition
Hidden face / quiet icon
4
B. Coaching
This section focuses on leadership, productivity, and career growth.
Total Topics: 10
Topic
Suggested Icon
Leadership
Crown / leader silhouette
Innovation
Light bulb
Communication
Speech bubbles
Delegation
Shared task icon
Problem Solving
Puzzle pieces
Decision Making
Decision tree/check path
Time Management
Clock/calendar
Team Management
Group/team icon
5
Confl ict Management
Handshake
Managerial Skills
Briefcase/chart
3. Main Features
Feature 1 — Free Demo Class Enrollment
Description Users can enroll in free demo counseling/coaching sessions.
Functionalities
User Can:
● Select category
● Select topic
● View available coaches
● Check available dates and times
● Book demo session
Calendar Scheduling System
Requirements
● Interactive calendar
● Show coach availability
● Time slot booking
6
● Time zone support
● Auto confi rmation
Booking Workfl ow
Select Category
→ Select Topic
→ Choose Coach
→ Select Date & Time
→ Confi rm Booking
→ Notifi cation Sent
Notifi cations
● Booking confi rmation
● Reminder before session
● Reschedule notifi cation
● Session completed notifi cation
7
Feature 2 — Educational Video Library
Description
Users can watch videos:
● Before enrollment
● After enrollment
Video Types
● Introductory videos
● Topic explanation videos
● Therapy guidance videos
● Coaching skill videos
● Motivational videos
Functional Requirements
Public Videos Accessible without enrollment.
Premium Videos Accessible after enrollment/payment.
Video Features
● Streaming support
● Resume playback
● Video progress tracking
● Subtitle support
8
● Like/bookmark option
Feature 3 — Interactive In-App Guide (“Toy Assistant”)
Description
An interactive animated assistant helps users understand the application.
Assistant Responsibilities
When user taps any screen:
Assistant explains:
● What the page does
● What buttons mean
● How to proceed
● Suggested next actions
Example
User clicks: “Chronic Anxiety”
Assistant says:
“This section helps users manage long-term anxiety through guided counseling and exercises.”
9
Assistant Features
Feature
Description
Voice Guidance
Speaks instructions
Text Tooltip
Shows short explanation
Animated Character
Friendly assistant
Smart Suggestions
Recommends actions
Multilingual Support
Optional future enhancement
4. User Roles
A. User / Patient
Permissions
● Register/login
● Browse topics
● Watch videos
● Book sessions
● Manage profi le
10
● Receive notifi cations
B. Coach / Psychologist
Permissions
● Manage availability
● Accept/reject bookings
● Upload videos
● Conduct sessions
● View appointments
C. Admin
Permissions
● Manage all users
● Manage coaches
● Approve content
● Analytics dashboard
● Payment management
● Notifi cation management
5. Authentication System
Login Methods
● Email/password
● Google login
11
● Mobile OTP login
6. Session Types
Type
Description
Video Call
Online therapy session
Audio Call
Voice counseling
Chat Session
Text-based support
7. UI/UX Guidelines
Emotional Healing Theme
Colors
● Soft Blue
Feel
● Calm
● Gentle
● Safe
● Relaxing
