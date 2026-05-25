import { PrismaClient, Role, VideoType, SessionType, SessionStatus } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database…');

  // Categories
  const healing = await prisma.category.upsert({
    where: { slug: 'emotional-healing' },
    update: {},
    create: { slug: 'emotional-healing', name: 'Emotional Healing', order: 1 },
  });

  const coaching = await prisma.category.upsert({
    where: { slug: 'coaching' },
    update: {},
    create: { slug: 'coaching', name: 'Coaching & Growth', order: 2 },
  });

  // Emotional Healing Topics
  const healingTopics = [
    { slug: 'overthinking', name: 'Overthinking', iconName: 'brain', description: 'Quiet the mental loops. Learn to observe thoughts without being swept away by them.' },
    { slug: 'obsessive-negative-thinking', name: 'Obsessive Negative Thinking', iconName: 'cloud', description: 'Break the cycle of persistent negative patterns through gentle cognitive reframing.' },
    { slug: 'bad-memories', name: 'Suffering from Bad Memories', iconName: 'photo', description: 'Process painful memories in a safe space, reducing their emotional charge over time.' },
    { slug: 'trauma', name: 'Trauma', iconName: 'heart-crack', description: 'Heal from past wounds at your pace. Trauma-informed care with compassionate practitioners.' },
    { slug: 'chronic-stress', name: 'Chronic Stress', iconName: 'gauge', description: 'Rebuild your relationship with pressure. Practical tools to lower your baseline stress.' },
    { slug: 'irritable-bowel-syndrome', name: 'Irritable Bowel Syndrome', iconName: 'stomach', description: 'Mind-body approaches to reduce IBS symptoms through stress reduction and nervous system work.' },
    { slug: 'sleeplessness', name: 'Sleeplessness', iconName: 'moon', description: 'Restore restful sleep through evidence-based behavioral and relaxation techniques.' },
    { slug: 'chronic-anxiety', name: 'Chronic Anxiety', iconName: 'heartbeat', description: 'A guided path to soften the constant hum of worry. Build a steadier nervous system over time.' },
    { slug: 'depression', name: 'Depression', iconName: 'cloud-rain', description: 'Gentle, consistent support to lift the weight. You are not alone in this.' },
    { slug: 'phobia', name: 'Phobia', iconName: 'warning', description: 'Gradual, supported exposure to reduce fear responses to specific triggers.' },
    { slug: 'anger-and-rage', name: 'Anger & Rage', iconName: 'flame', description: 'Understand the roots of anger and learn to express it in healthy, constructive ways.' },
    { slug: 'low-self-esteem', name: 'Low Self-Esteem', iconName: 'person', description: 'Rebuild a compassionate inner voice and a truer sense of your own worth.' },
    { slug: 'lack-of-confidence', name: 'Lack of Confidence', iconName: 'shield', description: 'Step into your potential. Practical tools to grow confidence from the inside out.' },
    { slug: 'compulsion-and-addictions', name: 'Compulsion & Addictions', iconName: 'chain', description: 'Break free from compulsive patterns through mindfulness and structured support.' },
    { slug: 'shy-inhibition', name: 'Shy Inhibition', iconName: 'face-hidden', description: 'Ease social anxiety and shyness in a non-judgmental, supportive environment.' },
  ];

  const healingTopicRecords: { id: string; slug: string }[] = [];
  for (let i = 0; i < healingTopics.length; i++) {
    const t = healingTopics[i];
    const record = await prisma.topic.upsert({
      where: { slug: t.slug },
      update: {},
      create: { ...t, categoryId: healing.id, order: i + 1 },
    });
    healingTopicRecords.push({ id: record.id, slug: record.slug });
  }

  // Coaching Topics
  const coachingTopics = [
    { slug: 'leadership', name: 'Leadership', iconName: 'crown', description: 'Lead with presence and authenticity. Discover your unique leadership style.' },
    { slug: 'innovation', name: 'Innovation', iconName: 'lightbulb', description: 'Generate bold ideas and bring them to life. A structured approach to creative thinking.' },
    { slug: 'communication', name: 'Communication', iconName: 'speech-bubbles', description: 'Speak so people listen. Master verbal, written, and non-verbal communication.' },
    { slug: 'delegation', name: 'Delegation', iconName: 'share', description: 'Trust and release. Learn to delegate effectively for both results and team growth.' },
    { slug: 'problem-solving', name: 'Problem Solving', iconName: 'puzzle', description: 'Frame, fit, finish. A rigorous yet creative approach to solving complex challenges.' },
    { slug: 'decision-making', name: 'Decision Making', iconName: 'tree', description: 'Make better decisions faster. Tools for clarity under pressure and uncertainty.' },
    { slug: 'time-management', name: 'Time Management', iconName: 'clock', description: 'Own your hours. Prioritization frameworks for high-performance without burnout.' },
    { slug: 'team-management', name: 'Team Management', iconName: 'group', description: 'Build high-trust, high-performance teams. Practical skills for every manager.' },
    { slug: 'conflict-management', name: 'Conflict Management', iconName: 'handshake', description: 'Turn tension into progress. Structured approaches to resolving workplace conflict.' },
    { slug: 'managerial-skills', name: 'Managerial Skills', iconName: 'briefcase', description: 'The full toolkit for modern managers — from feedback to strategy execution.' },
  ];

  const coachingTopicRecords: { id: string; slug: string }[] = [];
  for (let i = 0; i < coachingTopics.length; i++) {
    const t = coachingTopics[i];
    const record = await prisma.topic.upsert({
      where: { slug: t.slug },
      update: {},
      create: { ...t, categoryId: coaching.id, order: i + 1 },
    });
    coachingTopicRecords.push({ id: record.id, slug: record.slug });
  }

  // Demo user (Sarah from the mockup)
  const sarahHash = await bcrypt.hash('password123', 10);
  const sarah = await prisma.user.upsert({
    where: { email: 'sarah@example.com' },
    update: {},
    create: {
      email: 'sarah@example.com',
      name: 'Sarah Mathew',
      passwordHash: sarahHash,
      role: Role.USER,
      timezone: 'Asia/Kolkata',
    },
  });

  // Coach users
  const coachPassword = await bcrypt.hash('coachpass123', 10);

  const miraUser = await prisma.user.upsert({
    where: { email: 'mira@manas.app' },
    update: {},
    create: {
      email: 'mira@manas.app',
      name: 'Dr. Mira Sundaram',
      passwordHash: coachPassword,
      role: Role.COACH,
    },
  });

  const arjunUser = await prisma.user.upsert({
    where: { email: 'arjun@manas.app' },
    update: {},
    create: {
      email: 'arjun@manas.app',
      name: 'Dr. Arjun Iyer',
      passwordHash: coachPassword,
      role: Role.COACH,
    },
  });

  const lilaUser = await prisma.user.upsert({
    where: { email: 'lila@manas.app' },
    update: {},
    create: {
      email: 'lila@manas.app',
      name: 'Dr. Lila Roy',
      passwordHash: coachPassword,
      role: Role.COACH,
    },
  });

  // Coach profiles
  const mira = await prisma.coach.upsert({
    where: { userId: miraUser.id },
    update: {},
    create: {
      userId: miraUser.id,
      specialty: 'Clinical Psychology',
      bio: 'Dr. Mira Sundaram is a clinical psychologist with 12 years of experience specialising in anxiety, trauma, and chronic stress. Her warm, evidence-based approach helps clients rebuild steadiness in their nervous systems.',
      yearsExp: 12,
      rating: 4.9,
      languages: ['EN', 'TA'],
      hourlyRate: 150000,
    },
  });

  const arjun = await prisma.coach.upsert({
    where: { userId: arjunUser.id },
    update: {},
    create: {
      userId: arjunUser.id,
      specialty: 'CBT & Trauma',
      bio: 'Dr. Arjun Iyer combines cognitive behavioural therapy with trauma-sensitive approaches. 8 years of practice helping clients break free from negative thinking cycles.',
      yearsExp: 8,
      rating: 4.8,
      languages: ['EN', 'HI'],
      hourlyRate: 120000,
    },
  });

  const lila = await prisma.coach.upsert({
    where: { userId: lilaUser.id },
    update: {},
    create: {
      userId: lilaUser.id,
      specialty: 'Somatic Therapy',
      bio: 'Dr. Lila Roy is a somatic therapist with 15 years of experience. She works with the body\'s wisdom to release stored tension and restore emotional equilibrium.',
      yearsExp: 15,
      rating: 4.9,
      languages: ['EN', 'BN'],
      hourlyRate: 180000,
    },
  });

  // Availability (Mon=1, Tue=2, Wed=3, Thu=4, Fri=5)
  const availabilityData = [
    // Dr. Mira — Mon, Tue, Thu
    { coachId: mira.id, dayOfWeek: 1, startTime: '10:00', endTime: '18:00' },
    { coachId: mira.id, dayOfWeek: 2, startTime: '10:00', endTime: '18:00' },
    { coachId: mira.id, dayOfWeek: 4, startTime: '10:00', endTime: '18:00' },
    // Dr. Arjun — Mon, Wed, Fri
    { coachId: arjun.id, dayOfWeek: 1, startTime: '09:00', endTime: '17:00' },
    { coachId: arjun.id, dayOfWeek: 3, startTime: '09:00', endTime: '17:00' },
    { coachId: arjun.id, dayOfWeek: 5, startTime: '09:00', endTime: '17:00' },
    // Dr. Lila — Tue, Wed, Thu
    { coachId: lila.id, dayOfWeek: 2, startTime: '11:00', endTime: '19:00' },
    { coachId: lila.id, dayOfWeek: 3, startTime: '11:00', endTime: '19:00' },
    { coachId: lila.id, dayOfWeek: 4, startTime: '11:00', endTime: '19:00' },
  ];

  for (const av of availabilityData) {
    await prisma.availability.create({ data: av }).catch(() => {});
  }

  // Sample videos
  const anxietyTopic = healingTopicRecords.find(t => t.slug === 'chronic-anxiety')!;
  const overthinkingTopic = healingTopicRecords.find(t => t.slug === 'overthinking')!;
  const decisionTopic = coachingTopicRecords.find(t => t.slug === 'decision-making')!;

  const videos = [
    {
      title: 'Three breaths for an anxious day',
      description: 'A simple, evidence-based breathing technique to calm your nervous system in under 10 minutes.',
      url: 'https://example.com/videos/three-breaths',
      thumbnailUrl: 'https://example.com/thumbnails/three-breaths.jpg',
      durationSec: 480,
      type: VideoType.THERAPY,
      isPremium: false,
      topicId: anxietyTopic.id,
    },
    {
      title: 'What overthinking really is',
      description: 'Dr. Arjun explains the neuroscience behind overthinking and why willpower alone doesn\'t stop it.',
      url: 'https://example.com/videos/overthinking-explained',
      thumbnailUrl: 'https://example.com/thumbnails/overthinking.jpg',
      durationSec: 720,
      type: VideoType.THERAPY,
      isPremium: false,
      topicId: overthinkingTopic.id,
    },
    {
      title: 'Decision-making under pressure',
      description: 'A framework for making clear, confident decisions even when stakes are high and time is short.',
      url: 'https://example.com/videos/decision-making',
      thumbnailUrl: 'https://example.com/thumbnails/decision.jpg',
      durationSec: 1080,
      type: VideoType.COACHING,
      isPremium: true,
      topicId: decisionTopic.id,
    },
    {
      title: 'A letter to your tired self',
      description: 'A gentle, spoken-word piece read by Dr. Lila. For the days when you need to feel held.',
      url: 'https://example.com/videos/letter-tired-self',
      thumbnailUrl: 'https://example.com/thumbnails/letter.jpg',
      durationSec: 360,
      type: VideoType.MOTIVATIONAL,
      isPremium: false,
      topicId: null,
    },
    {
      title: 'Welcome to MANAS',
      description: 'An introduction to the MANAS platform — what it is, who it\'s for, and how to get started.',
      url: 'https://example.com/videos/welcome',
      thumbnailUrl: 'https://example.com/thumbnails/welcome.jpg',
      durationSec: 240,
      type: VideoType.INTRO,
      isPremium: false,
      topicId: null,
    },
    {
      title: 'Understanding trauma responses',
      description: 'A foundational session on how trauma lives in the body and what healing actually looks like.',
      url: 'https://example.com/videos/trauma-responses',
      thumbnailUrl: 'https://example.com/thumbnails/trauma.jpg',
      durationSec: 900,
      type: VideoType.TOPIC,
      isPremium: true,
      topicId: healingTopicRecords.find(t => t.slug === 'trauma')!.id,
    },
  ];

  for (const v of videos) {
    await prisma.video.create({ data: v }).catch(() => {});
  }

  // Demo session for Sarah (matches the mockup — tomorrow, Dr. Mira, 4:30 PM)
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(11, 0, 0, 0); // 4:30 PM IST = 11:00 UTC

  await prisma.session.create({
    data: {
      userId: sarah.id,
      coachId: mira.id,
      topicId: anxietyTopic.id,
      scheduledAt: tomorrow,
      durationMin: 30,
      type: SessionType.VIDEO,
      status: SessionStatus.CONFIRMED,
      isDemo: true,
    },
  }).catch(() => {});

  console.log('✅ Seed complete');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
