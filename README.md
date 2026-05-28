# manas
JEY GROUPS
MANAS
MANAS — Psychologist Counseling Virtual Offi ce Application

Mobile release MVP notes:
- The mobile app is branded as MANAS with package identifiers `com.jeygroups.manas`.
- Patient/user flow is the current MVP focus: browse Emotional Healing and Coaching topics, choose a coach, book a demo slot, open the video library, and use the in-app MANAS guide.
- Coach/Psychologist and Admin dashboards are not represented as complete release features yet.
- Release verification remains strict for production backend/Firebase configuration. Debug/mock auth is for local smoke testing only.

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
