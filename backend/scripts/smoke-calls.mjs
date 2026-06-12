const baseUrl = (process.env.API_URL ?? process.argv[2] ?? 'http://localhost:4000').replace(/\/$/, '');
const mode = process.env.MEETING_SMOKE_MODE || 'configured';

const credentials = {
  admin: {
    email: process.env.ADMIN_EMAIL || 'admin@manas.app',
    password: process.env.ADMIN_PASSWORD || 'adminpass123',
  },
  sarah: {
    email: process.env.SMOKE_USER_EMAIL || 'sarah@example.com',
    password: process.env.SMOKE_USER_PASSWORD || 'password123',
  },
  mira: {
    email: process.env.SMOKE_COACH_EMAIL || 'mira@manas.app',
    password: process.env.SMOKE_COACH_PASSWORD || 'coachpass123',
  },
};

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function request(path, options = {}) {
  const headers = { ...(options.headers || {}) };
  if (options.body !== undefined) headers['Content-Type'] = 'application/json';
  if (options.token) headers.Authorization = `Bearer ${options.token}`;

  const res = await fetch(`${baseUrl}${path}`, {
    method: options.method || 'GET',
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });
  const text = await res.text();
  let body = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }
  return { ok: res.ok, status: res.status, body, text };
}

async function login(label, cred) {
  const res = await request('/auth/login', { method: 'POST', body: cred });
  assert(res.ok, `${label} login failed with ${res.status}: ${res.text}`);
  assert(res.body?.token, `${label} login did not return a token`);
  return res.body;
}

async function expectStatus(label, promise, status) {
  const res = await promise;
  assert(res.status === status, `${label} returned ${res.status}, expected ${status}: ${res.text}`);
  return res;
}

function startsAtMinutesFromNow(minutes) {
  return new Date(Date.now() + minutes * 60_000).toISOString();
}

async function bookSession(token, coachId, topicId, type, offsetMinutes) {
  const res = await request('/sessions', {
    method: 'POST',
    token,
    body: {
      coachId,
      topicId,
      type,
      scheduledAt: startsAtMinutesFromNow(offsetMinutes),
    },
  });
  assert(res.ok, `Create ${type} session failed with ${res.status}: ${res.text}`);
  return res.body;
}

const admin = await login('admin', credentials.admin);
assert(admin.user?.role === 'ADMIN', `admin login returned role ${admin.user?.role}`);

const sarah = await login('Sarah', credentials.sarah);
const mira = await login('Mira', credentials.mira);

const [topicsRes, coachesRes] = await Promise.all([
  request('/topics'),
  request('/coaches'),
]);
assert(topicsRes.ok && Array.isArray(topicsRes.body) && topicsRes.body.length > 0, '/topics did not return topics');
assert(coachesRes.ok && Array.isArray(coachesRes.body) && coachesRes.body.length > 0, '/coaches did not return coaches');

const topic = topicsRes.body[0];
const coach = coachesRes.body.find(item => item.user?.name?.toLowerCase().includes('mira')) || coachesRes.body[0];
assert(topic?.id, 'No topic id found');
assert(coach?.id, 'No coach id found');

const video = await bookSession(sarah.token, coach.id, topic.id, 'VIDEO', 2);
const audio = await bookSession(sarah.token, coach.id, topic.id, 'AUDIO', 2);
const chat = await bookSession(sarah.token, coach.id, topic.id, 'CHAT', 2);
const futureVideo = await bookSession(sarah.token, coach.id, topic.id, 'VIDEO', 60);

assert(video.meetingUrl, 'VIDEO session did not create meetingUrl');
assert(audio.meetingUrl, 'AUDIO session did not create meetingUrl');
assert(chat.meetingUrl === null, `CHAT meetingUrl should be null, got ${chat.meetingUrl}`);

await expectStatus(
  'CHAT call-config',
  request(`/sessions/${chat.id}/call-config`, { token: sarah.token }),
  400
);
await expectStatus(
  'outside-window call-config',
  request(`/sessions/${futureVideo.id}/call-config`, { token: sarah.token }),
  403
);

if (mode === 'missing-config') {
  const missing = await expectStatus(
    'missing meeting auth config',
    request(`/sessions/${video.id}/call-config`, { token: sarah.token }),
    503
  );
  assert(
    /MEETING_|Production video calls|authenticated video calls|JaaS|Self-hosted/i.test(missing.body?.error || ''),
    `Missing-config response was not clear: ${missing.text}`
  );
  console.log(`MANAS call-config smoke passed in missing-config mode for ${baseUrl}`);
  process.exit(0);
}

assert(mode === 'configured', 'MEETING_SMOKE_MODE must be configured or missing-config');

const userConfig = await request(`/sessions/${video.id}/call-config`, { token: sarah.token });
assert(userConfig.ok, `booked user call-config failed with ${userConfig.status}: ${userConfig.text}`);
assert(userConfig.body?.jwt, 'booked user call-config did not return jwt');
assert(userConfig.body?.joinUrl?.includes('jwt='), 'booked user call-config joinUrl did not include jwt');
assert(userConfig.body?.room === `manas-${video.id}`, `booked user room was ${userConfig.body?.room}`);
assert(userConfig.body?.type === 'VIDEO', `booked user type was ${userConfig.body?.type}`);
assert(userConfig.body?.isAudioOnly === false, 'VIDEO call-config should not be audio-only');

const coachConfig = await request(`/sessions/${video.id}/call-config`, { token: mira.token });
assert(coachConfig.ok, `assigned coach call-config failed with ${coachConfig.status}: ${coachConfig.text}`);
assert(coachConfig.body?.room === userConfig.body.room, 'coach and user did not receive the same room');

const audioConfig = await request(`/sessions/${audio.id}/call-config`, { token: sarah.token });
assert(audioConfig.ok, `AUDIO call-config failed with ${audioConfig.status}: ${audioConfig.text}`);
assert(audioConfig.body?.isAudioOnly === true, 'AUDIO call-config should be audio-only');
assert(audioConfig.body?.joinUrl?.includes('config.startAudioOnly=true'), 'AUDIO joinUrl should request audio-only start');
assert(audioConfig.body?.joinUrl?.includes('config.startWithVideoMuted=true'), 'AUDIO joinUrl should request video muted start');

await expectStatus(
  'unrelated user call-config',
  request(`/sessions/${video.id}/call-config`, { token: admin.token }),
  403
);

console.log(`MANAS call-config smoke passed in configured mode for ${baseUrl}`);
