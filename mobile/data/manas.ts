export type ManasCategorySlug = 'emotional-healing' | 'coaching';
export type SessionType = 'VIDEO' | 'AUDIO' | 'CHAT';
export type BookingStep = 'category' | 'topic' | 'coach' | 'slot' | 'confirmed';

export interface ManasTopic {
  id: string;
  slug: string;
  categorySlug: ManasCategorySlug;
  categoryName: string;
  name: string;
  iconName: string;
  description: string;
  order: number;
  category?: { slug: ManasCategorySlug; name: string };
}

export interface ManasCoach {
  id: string;
  user: { id: string; name: string; avatarUrl: string | null };
  specialty: string;
  bio: string;
  yearsExp: number;
  rating: number;
  languages: string[];
  hourlyRate: number;
}

export interface ManasVideo {
  id: string;
  title: string;
  description: string;
  url: string;
  thumbnailUrl: string;
  durationSec: number;
  type: 'INTRO' | 'TOPIC' | 'THERAPY' | 'COACHING' | 'MOTIVATIONAL';
  isPremium: boolean;
  topicId: string | null;
  subtitleUrl: string | null;
  topic?: { name: string; slug: string };
  progress?: { progressSec: number; completed: boolean } | null;
}

export interface BookingState {
  step: BookingStep;
  categorySlug?: ManasCategorySlug;
  topicSlug?: string;
  coachId?: string;
  startsAt?: string;
  sessionType: SessionType;
}

const sampleBase = 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample';
const videoUrl = (file: string) => `${sampleBase}/${file}.mp4`;
const thumbUrl = (file: string) => `${sampleBase}/images/${file}.jpg`;

export const manasCategories = [
  { id: 'category-emotional-healing', slug: 'emotional-healing', name: 'Emotional Healing', order: 1 },
  { id: 'category-coaching', slug: 'coaching', name: 'Coaching & Growth', order: 2 },
];

export const healingTopics: ManasTopic[] = [
  { slug: 'overthinking', name: 'Overthinking', iconName: 'brain', description: 'Quiet mental loops and learn to notice thoughts without being carried away by them.' },
  { slug: 'obsessive-negative-thinking', name: 'Obsessive Negative Thinking', iconName: 'cloud', description: 'Gently interrupt persistent negative patterns with grounding and reframing practices.' },
  { slug: 'bad-memories', name: 'Suffering from Bad Memories', iconName: 'photo', description: 'Process painful memories at a safe pace and reduce their emotional charge over time.' },
  { slug: 'trauma', name: 'Trauma', iconName: 'heart-crack', description: 'Trauma-informed support for rebuilding steadiness, safety, and connection.' },
  { slug: 'chronic-stress', name: 'Chronic Stress', iconName: 'gauge', description: 'Lower your baseline stress with nervous-system tools and practical support.' },
  { slug: 'irritable-bowel-syndrome', name: 'Irritable Bowel Syndrome', iconName: 'stomach', description: 'Explore mind-body support for IBS symptoms connected with stress and tension.' },
  { slug: 'sleeplessness', name: 'Sleeplessness', iconName: 'moon', description: 'Restore rest with gentle routines, relaxation skills, and sleep-supportive habits.' },
  { slug: 'chronic-anxiety', name: 'Chronic Anxiety', iconName: 'heartbeat', description: 'Build a steadier nervous system and soften long-running worry with guided support.' },
  { slug: 'depression', name: 'Depression', iconName: 'cloud-rain', description: 'Small, compassionate steps for days that feel heavy or low.' },
  { slug: 'phobia', name: 'Phobia', iconName: 'warning', description: 'Work with fear responses gradually through supported exposure and grounding.' },
  { slug: 'anger-and-rage', name: 'Anger & Rage', iconName: 'flame', description: 'Understand anger cues and learn safer ways to express and regulate intensity.' },
  { slug: 'low-self-esteem', name: 'Low Self-Esteem', iconName: 'person', description: 'Rebuild a kinder inner voice and a more stable sense of self-worth.' },
  { slug: 'lack-of-confidence', name: 'Lack of Confidence', iconName: 'shield', description: 'Strengthen confidence through repeatable skills, reflection, and steady practice.' },
  { slug: 'compulsion-and-addictions', name: 'Compulsion & Addictions', iconName: 'chain', description: 'Notice urges, reduce shame, and create structured support for healthier choices.' },
  { slug: 'shy-inhibition', name: 'Shy Inhibition', iconName: 'face-hidden', description: 'Ease social hesitation with gentle experiments and non-judgmental support.' },
].map((topic, index) => ({
  ...topic,
  id: `topic-${topic.slug}`,
  categorySlug: 'emotional-healing',
  categoryName: 'Emotional Healing',
  order: index + 1,
  category: { slug: 'emotional-healing', name: 'Emotional Healing' },
}));

export const coachingTopics: ManasTopic[] = [
  { slug: 'leadership', name: 'Leadership', iconName: 'crown', description: 'Lead with clarity, presence, and a grounded personal style.' },
  { slug: 'innovation', name: 'Innovation', iconName: 'lightbulb', description: 'Turn ideas into useful experiments and practical momentum.' },
  { slug: 'communication', name: 'Communication', iconName: 'speech-bubbles', description: 'Speak, listen, and write with more trust and less friction.' },
  { slug: 'delegation', name: 'Delegation', iconName: 'share', description: 'Share responsibility clearly while helping people grow.' },
  { slug: 'problem-solving', name: 'Problem Solving', iconName: 'puzzle', description: 'Frame problems cleanly and choose the next useful move.' },
  { slug: 'decision-making', name: 'Decision Making', iconName: 'tree', description: 'Make calm, defensible decisions when stakes or uncertainty are high.' },
  { slug: 'time-management', name: 'Time Management', iconName: 'clock', description: 'Protect attention, prioritize well, and reduce avoidable overload.' },
  { slug: 'team-management', name: 'Team Management', iconName: 'group', description: 'Build steady rhythms for alignment, feedback, and accountability.' },
  { slug: 'conflict-management', name: 'Conflict Management', iconName: 'handshake', description: 'Move through tension with structure, respect, and clearer agreements.' },
  { slug: 'managerial-skills', name: 'Managerial Skills', iconName: 'briefcase', description: 'Practice the core skills managers need for humane, effective work.' },
].map((topic, index) => ({
  ...topic,
  id: `topic-${topic.slug}`,
  categorySlug: 'coaching',
  categoryName: 'Coaching & Growth',
  order: index + 1,
  category: { slug: 'coaching', name: 'Coaching & Growth' },
}));

export const allTopics = [...healingTopics, ...coachingTopics];

export const sampleCoaches: ManasCoach[] = [
  {
    id: 'coach-mira',
    user: { id: 'user-mira', name: 'Dr. Mira Sundaram', avatarUrl: null },
    specialty: 'Clinical Psychology',
    bio: 'Warm, trauma-informed support for anxiety, stress, and emotional healing.',
    yearsExp: 12,
    rating: 4.9,
    languages: ['EN', 'TA'],
    hourlyRate: 150000,
  },
  {
    id: 'coach-arjun',
    user: { id: 'user-arjun', name: 'Dr. Arjun Iyer', avatarUrl: null },
    specialty: 'CBT & Coaching',
    bio: 'Structured coaching and cognitive tools for confidence, decision-making, and overthinking.',
    yearsExp: 8,
    rating: 4.8,
    languages: ['EN', 'HI'],
    hourlyRate: 120000,
  },
  {
    id: 'coach-lila',
    user: { id: 'user-lila', name: 'Dr. Lila Roy', avatarUrl: null },
    specialty: 'Somatic Therapy',
    bio: 'Body-aware emotional healing for trauma, stress, and sleep support.',
    yearsExp: 15,
    rating: 4.9,
    languages: ['EN', 'BN'],
    hourlyRate: 180000,
  },
];

export const sampleVideos: ManasVideo[] = [
  {
    id: 'video-welcome',
    title: 'Welcome to MANAS',
    description: 'A short introduction to emotional healing, coaching, and booking a free demo session.',
    url: videoUrl('ForBiggerFun'),
    thumbnailUrl: thumbUrl('ForBiggerFun'),
    durationSec: 240,
    type: 'INTRO',
    isPremium: false,
    topicId: null,
    subtitleUrl: null,
  },
  {
    id: 'video-chronic-anxiety',
    title: 'Three breaths for an anxious day',
    description: 'A gentle grounding exercise for chronic anxiety and a busy nervous system.',
    url: videoUrl('BigBuckBunny'),
    thumbnailUrl: thumbUrl('BigBuckBunny'),
    durationSec: 480,
    type: 'THERAPY',
    isPremium: false,
    topicId: 'topic-chronic-anxiety',
    subtitleUrl: null,
    topic: { name: 'Chronic Anxiety', slug: 'chronic-anxiety' },
  },
  {
    id: 'video-overthinking',
    title: 'What overthinking really is',
    description: 'A therapist-led explainer on why loops happen and how to interrupt them safely.',
    url: videoUrl('ElephantsDream'),
    thumbnailUrl: thumbUrl('ElephantsDream'),
    durationSec: 720,
    type: 'TOPIC',
    isPremium: false,
    topicId: 'topic-overthinking',
    subtitleUrl: null,
    topic: { name: 'Overthinking', slug: 'overthinking' },
  },
  {
    id: 'video-decision-making',
    title: 'Decision-making under pressure',
    description: 'A coaching framework for choosing clearly when time is short.',
    url: videoUrl('ForBiggerBlazes'),
    thumbnailUrl: thumbUrl('ForBiggerBlazes'),
    durationSec: 1080,
    type: 'COACHING',
    isPremium: true,
    topicId: 'topic-decision-making',
    subtitleUrl: null,
    topic: { name: 'Decision Making', slug: 'decision-making' },
  },
  {
    id: 'video-tired-self',
    title: 'A letter to your tired self',
    description: 'A short motivational reflection for heavy days.',
    url: videoUrl('ForBiggerEscapes'),
    thumbnailUrl: thumbUrl('ForBiggerEscapes'),
    durationSec: 360,
    type: 'MOTIVATIONAL',
    isPremium: false,
    topicId: null,
    subtitleUrl: null,
  },
];

export const assistantGuideCopy = {
  home: 'Home shows two paths: Emotional Healing for wellbeing and Coaching & Growth for practical life and work skills. Start with the card that fits your goal today.',
  healing: 'Emotional Healing has 15 gentle topics. Pick the feeling or pattern closest to what you want support with, then choose a coach.',
  coaching: 'Coaching & Growth has 10 topics for leadership, communication, time, teams, and decisions. Pick one to see the next step.',
  chronicAnxiety: 'Chronic Anxiety support focuses on long-running worry, nervous system steadiness, and body alertness. Start with a calm demo session, use the public grounding video, and choose a coach who feels safe.',
  booking: 'Booking is a demo flow: choose a date, pick an available time, select video, audio, or chat, then confirm. Real payment and production notifications are not enabled in this MVP.',
  videos: 'The Library has public videos you can open now and premium placeholders that show an upgrade message until payment/enrollment is connected.',
  profile: 'Profile keeps account and journey information. In this MVP, coach/admin tools are intentionally not represented as complete patient features.',
};

export function getTopicsByCategory(slug: string): ManasTopic[] {
  if (slug === 'emotional-healing') return healingTopics;
  if (slug === 'coaching') return coachingTopics;
  return [];
}

export function getTopicBySlug(slug?: string): ManasTopic | undefined {
  return allTopics.find(topic => topic.slug === slug);
}

export function getCoachById(id?: string): ManasCoach | undefined {
  return sampleCoaches.find(coach => coach.id === id);
}

export function getSampleAvailability(coachId: string, date: string) {
  const coach = getCoachById(coachId);
  const times = coachId === 'coach-lila'
    ? ['11:00', '12:00', '15:30', '17:00']
    : coachId === 'coach-arjun'
      ? ['09:30', '10:30', '14:00', '16:30']
      : ['10:00', '11:30', '15:00', '16:30'];

  return {
    date,
    timezone: 'Asia/Kolkata',
    slots: coach ? times.map((time, index) => {
      const startsAt = new Date(`${date}T${time}:00+05:30`).toISOString();
      return { time, startsAt, label: time, available: index !== 1 };
    }) : [],
  };
}

export function getVideosByParams(params?: { type?: string; topicId?: string }): ManasVideo[] {
  return sampleVideos.filter(video => {
    if (params?.type && video.type !== params.type) return false;
    if (params?.topicId && video.topicId !== params.topicId) return false;
    return true;
  });
}

export function getVideoById(id?: string): ManasVideo | undefined {
  return sampleVideos.find(video => video.id === id);
}

export const initialBookingState: BookingState = {
  step: 'category',
  sessionType: 'VIDEO',
};

export function advanceBooking(state: BookingState, update: Partial<BookingState>): BookingState {
  const next = { ...state, ...update };
  if (update.categorySlug) next.step = 'topic';
  if (update.topicSlug) next.step = 'coach';
  if (update.coachId) next.step = 'slot';
  if (update.startsAt) next.step = 'confirmed';
  return next;
}

export function createMockSession(data: { coachId: string; topicId: string; scheduledAt: string; type: string }) {
  const coach = getCoachById(data.coachId) ?? sampleCoaches[0];
  const topic = allTopics.find(item => item.id === data.topicId) ?? healingTopics[0];

  return {
    id: `mock-session-${Date.now()}`,
    coachId: coach.id,
    topicId: topic.id,
    scheduledAt: data.scheduledAt,
    type: data.type,
    status: 'CONFIRMED',
    isDemo: true,
    isMock: true,
    coach,
    topic,
    meetingUrl: null,
  };
}

export function getAssistantGuide(path: string): string {
  if (path.includes('chronic-anxiety')) return assistantGuideCopy.chronicAnxiety;
  if (path.includes('/booking')) return assistantGuideCopy.booking;
  if (path.includes('/video') || path.includes('/videos')) return assistantGuideCopy.videos;
  if (path.includes('/coaching')) return assistantGuideCopy.coaching;
  if (path.includes('/topics')) return assistantGuideCopy.healing;
  if (path.includes('/profile')) return assistantGuideCopy.profile;
  return assistantGuideCopy.home;
}
