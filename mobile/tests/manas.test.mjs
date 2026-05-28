import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import {
  advanceBooking,
  assistantGuideCopy,
  coachingTopics,
  getAssistantGuide,
  healingTopics,
  initialBookingState,
} from '../data/manas.ts';
import { getMissingReleaseEnv } from '../scripts/verify-release-config.mjs';

test('MANAS catalog has the required topic counts', () => {
  assert.equal(healingTopics.length, 15);
  assert.equal(coachingTopics.length, 10);
});

test('MANAS catalog includes required topics', () => {
  const names = [...healingTopics, ...coachingTopics].map(topic => topic.name);
  for (const required of ['Chronic Anxiety', 'Overthinking', 'Trauma', 'Leadership', 'Decision Making']) {
    assert.ok(names.includes(required), `${required} should exist`);
  }
});

test('booking workflow progresses through the release MVP steps', () => {
  const topicState = advanceBooking(initialBookingState, { categorySlug: 'emotional-healing' });
  assert.equal(topicState.step, 'topic');

  const coachState = advanceBooking(topicState, { topicSlug: 'chronic-anxiety' });
  assert.equal(coachState.step, 'coach');

  const slotState = advanceBooking(coachState, { coachId: 'coach-mira' });
  assert.equal(slotState.step, 'slot');

  const confirmedState = advanceBooking(slotState, { startsAt: '2026-05-29T10:00:00.000Z' });
  assert.equal(confirmedState.step, 'confirmed');
});

test('assistant guide has chronic anxiety and screen-level help', () => {
  assert.match(assistantGuideCopy.chronicAnxiety, /Chronic Anxiety/);
  assert.match(getAssistantGuide('/topics/chronic-anxiety'), /nervous system/i);
  assert.match(getAssistantGuide('/booking/coach-mira'), /date/i);
  assert.match(getAssistantGuide('/(tabs)/videos'), /premium/i);
});

test('startup does not depend on Google Sign-In native module import', () => {
  const googleSource = readFileSync(new URL('../lib/google.ts', import.meta.url), 'utf8');
  const packageSource = readFileSync(new URL('../package.json', import.meta.url), 'utf8');

  assert.doesNotMatch(googleSource, /@react-native-google-signin\/google-signin/);
  assert.doesNotMatch(packageSource, /@react-native-google-signin\/google-signin/);
});

test('optional native modules are not imported by the MANAS startup surface', () => {
  const files = [
    '../app/_layout.tsx',
    '../app/index.tsx',
    '../components/MascotAssistant.tsx',
    '../lib/queries.ts',
  ];
  const forbidden = /expo-speech-recognition|modules\/life-context|modules\/wake-word|JaiOnDeviceModel|nativeOnDeviceModelBridge/;

  for (const file of files) {
    const source = readFileSync(new URL(file, import.meta.url), 'utf8');
    assert.doesNotMatch(source, forbidden, `${file} should not import optional native modules`);
  }
});

test('release config check reports missing Firebase env vars', () => {
  const missing = getMissingReleaseEnv({ EXPO_PUBLIC_API_URL: 'https://example.test' });

  assert.ok(missing.includes('EXPO_PUBLIC_FIREBASE_API_KEY'));
  assert.ok(missing.includes('EXPO_PUBLIC_FIREBASE_PROJECT_ID'));
});
