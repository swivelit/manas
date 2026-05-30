const baseUrl = (process.env.API_URL ?? process.argv[2] ?? '').replace(/\/$/, '');

if (!baseUrl) {
  console.error('Usage: API_URL=https://manas-api-dlj7.onrender.com npm run smoke:prod');
  process.exit(1);
}

async function getJson(path) {
  const res = await fetch(`${baseUrl}${path}`);
  const text = await res.text();
  let body;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }
  if (!res.ok) {
    throw new Error(`${path} returned ${res.status}: ${text}`);
  }
  return body;
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const root = await getJson('/');
assert(root?.name === 'MANAS API', '/ did not return MANAS API info');
assert(root?.status === 'ok', '/ did not return status ok');

const health = await getJson('/health');
assert(health?.status === 'ok', '/health did not return status ok');

const categories = await getJson('/categories');
assert(Array.isArray(categories), '/categories did not return an array');
assert(categories.length === 2, `/categories returned ${categories.length}, expected 2`);

const healing = await getJson('/categories/emotional-healing/topics');
assert(Array.isArray(healing), '/categories/emotional-healing/topics did not return an array');
assert(healing.length === 15, `emotional-healing returned ${healing.length}, expected 15`);

const coaching = await getJson('/categories/coaching/topics');
assert(Array.isArray(coaching), '/categories/coaching/topics did not return an array');
assert(coaching.length === 10, `coaching returned ${coaching.length}, expected 10`);

const videos = await getJson('/videos');
assert(Array.isArray(videos), '/videos did not return an array');
assert(videos.some(video => video && video.isPremium === false), '/videos returned no public videos');

console.log(`MANAS production smoke passed for ${baseUrl}`);
