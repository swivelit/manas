#!/usr/bin/env node

const assert = require('assert');
const {
  MISSING_RELEASE_SIGNING_MESSAGE,
  patchAppBuildGradle,
} = require('../mobile/plugins/with-android-release-signing');

function findNextBlock(contents, name, fromIndex = 0) {
  const pattern = new RegExp(`\\b${name}\\s*\\{`, 'g');
  pattern.lastIndex = fromIndex;
  const match = pattern.exec(contents);
  if (!match) return null;

  const braceIndex = contents.indexOf('{', match.index);
  let depth = 0;
  for (let index = braceIndex; index < contents.length; index += 1) {
    const char = contents[index];
    if (char === '{') depth += 1;
    if (char === '}') depth -= 1;
    if (depth === 0) {
      return {
        nameIndex: match.index,
        bodyStart: braceIndex + 1,
        bodyEnd: index,
      };
    }
  }

  return null;
}

function getNestedBlock(contents, parentName, childName) {
  const parent = findNextBlock(contents, parentName);
  assert(parent, `Expected ${parentName} block`);
  const child = findNextBlock(contents, childName, parent.bodyStart);
  assert(child && child.nameIndex < parent.bodyEnd, `Expected ${childName} block inside ${parentName}`);
  return contents.slice(child.bodyStart, child.bodyEnd);
}

const sampleBuildGradle = `apply plugin: "com.android.application"

def projectRoot = rootDir.getAbsoluteFile().getParentFile().getAbsolutePath()

android {
    namespace 'com.jeygroups.manas'
    defaultConfig {
        applicationId 'com.jeygroups.manas'
    }
    signingConfigs {
        debug {
            storeFile file('debug.keystore')
            storePassword 'android'
            keyAlias 'androiddebugkey'
            keyPassword 'android'
        }
    }
    buildTypes {
        debug {
            signingConfig signingConfigs.debug
        }
        release {
            // Caution! In production, you need to generate your own keystore file.
            signingConfig signingConfigs.debug
            minifyEnabled false
        }
    }
}
`;

const patched = patchAppBuildGradle(sampleBuildGradle);
const patchedAgain = patchAppBuildGradle(patched);
const signingConfigsBody = getNestedBlock(patched, 'signingConfigs', 'release');
const releaseBuildTypeBody = getNestedBlock(patched, 'buildTypes', 'release');

assert.strictEqual(patchedAgain, patched, 'Patch should be idempotent');
assert(patched.includes(MISSING_RELEASE_SIGNING_MESSAGE), 'Missing release-signing failure message');
assert(
  signingConfigsBody.includes('manasConfigureReleaseSigning(delegate)'),
  'signingConfigs.release should call MANAS signing configuration'
);
assert(
  releaseBuildTypeBody.includes('signingConfig signingConfigs.release'),
  'release buildType should use signingConfigs.release'
);
assert(
  !releaseBuildTypeBody.includes('signingConfig signingConfigs.debug'),
  'release buildType must not use signingConfigs.debug'
);

console.log('Android release signing plugin check passed.');
