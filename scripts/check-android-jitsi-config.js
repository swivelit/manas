#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const mobile = path.join(root, 'mobile');
const appJsonPath = path.join(mobile, 'app.json');
const packageJsonPath = path.join(mobile, 'package.json');
const jitsiPackagePath = path.join(mobile, 'node_modules', '@jitsi', 'react-native-sdk', 'package.json');
const generatedBuildGradlePath = path.join(mobile, 'android', 'build.gradle');
const callScreenPath = path.join(mobile, 'app', 'call', '[id].tsx');
const pluginPath = path.join(mobile, 'plugins', 'with-jitsi-android-compat.js');
const splashViewPatchPath = path.join(mobile, 'patches', 'react-native-splash-view+0.0.18.patch');
const splashViewSourcePath = path.join(
  mobile,
  'node_modules',
  'react-native-splash-view',
  'android',
  'src',
  'newarch',
  'java',
  'com',
  'splashview',
  'SplashViewModuleNew.kt'
);
const gestureHandlerSourcePath = path.join(
  mobile,
  'node_modules',
  'react-native-gesture-handler',
  'android',
  'src',
  'main',
  'java',
  'com',
  'swmansion',
  'gesturehandler',
  'react',
  'RNGestureHandlerModule.kt'
);

const app = JSON.parse(fs.readFileSync(appJsonPath, 'utf8')).expo;
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
const jitsiPlugin = require(pluginPath);

function fail(message) {
  console.error(`ERROR: ${message}`);
  process.exit(1);
}

function requireCondition(condition, message) {
  if (!condition) fail(message);
}

function read(filePath) {
  requireCondition(fs.existsSync(filePath), `Missing required file: ${path.relative(root, filePath)}`);
  return fs.readFileSync(filePath, 'utf8');
}

function countMatches(source, pattern) {
  return source.match(pattern)?.length ?? 0;
}

requireCondition(packageJson.dependencies?.['@jitsi/react-native-sdk'], '@jitsi/react-native-sdk is missing from mobile/package.json.');
const jitsiPackage = JSON.parse(read(jitsiPackagePath));
requireCondition(jitsiPackage.name === '@jitsi/react-native-sdk', 'Installed Jitsi package has an unexpected name.');
requireCondition(jitsiPackage.version === '13.1.1', `Expected Jitsi 13.1.1, found ${jitsiPackage.version}.`);
requireCondition(Number(app.android?.minSdkVersion) >= 26, 'MANAS Jitsi Android compatibility requires minSdkVersion >= 26.');

const plugins = app.plugins ?? [];
requireCondition(plugins.includes('./plugins/with-jitsi-android-compat'), 'Jitsi Android compatibility config plugin is not registered.');

const pluginSource = read(pluginPath);
requireCondition(pluginSource.includes(jitsiPlugin.GENERATED_MARKER), 'Jitsi compatibility plugin is missing its generated marker.');
requireCondition(pluginSource.includes('ext.gradlePluginVersion'), 'Jitsi compatibility plugin does not define gradlePluginVersion.');
const splashViewPatch = read(splashViewPatchPath);
requireCondition(
  splashViewPatch.includes('reactApplicationContext.currentActivity'),
  'The required Kotlin 2.3 compatibility patch for Jitsi\'s splash-view peer is missing.'
);
const splashViewSource = read(splashViewSourcePath);
requireCondition(
  splashViewSource.includes('reactApplicationContext.currentActivity'),
  'The react-native-splash-view postinstall compatibility patch was not applied.'
);
const gestureHandlerSource = read(gestureHandlerSourcePath);
requireCondition(
  gestureHandlerSource.includes('it.rootView.getRootViewTag() == rootViewTag'),
  'The react-native-gesture-handler postinstall compatibility patch was not applied.'
);

const agpVersion = jitsiPlugin.readAndroidGradlePluginVersion();
requireCondition(/^(\d+)\.(\d+)\.(\d+)$/.test(agpVersion), `Derived AGP version is invalid: ${agpVersion}.`);
requireCondition(
  jitsiPlugin.readAndroidGradlePluginVersion() === agpVersion,
  'AGP derivation is not deterministic.'
);
requireCondition(
  (() => {
    const [major, minor, patch] = agpVersion.split('.').map(Number);
    const [minMajor, minMinor, minPatch] = jitsiPlugin.JITSI_MINIMUM_AGP.split('.').map(Number);
    return major > minMajor ||
      (major === minMajor && (minor > minMinor || (minor === minMinor && patch >= minPatch)));
  })(),
  `Derived AGP ${agpVersion} is below Jitsi's minimum ${jitsiPlugin.JITSI_MINIMUM_AGP}.`
);

const callScreen = read(callScreenPath);
requireCondition(!callScreen.includes("'desktop'"), 'The v1 Jitsi toolbar must not expose Android screen sharing.');

const permissions = app.android?.permissions ?? [];
const blockedPermissions = app.android?.blockedPermissions ?? [];
requireCondition(!permissions.includes('FOREGROUND_SERVICE'), 'FOREGROUND_SERVICE must not be requested by MANAS v1.');
requireCondition(!permissions.includes('FOREGROUND_SERVICE_MEDIA_PROJECTION'), 'FOREGROUND_SERVICE_MEDIA_PROJECTION must not be requested by MANAS v1.');
requireCondition(blockedPermissions.includes('android.permission.FOREGROUND_SERVICE'), 'FOREGROUND_SERVICE must be blocked against transitive dependencies.');
requireCondition(blockedPermissions.includes('android.permission.FOREGROUND_SERVICE_MEDIA_PROJECTION'), 'FOREGROUND_SERVICE_MEDIA_PROJECTION must be blocked against transitive dependencies.');

if (process.argv.includes('--generated')) {
  const generatedBuildGradle = read(generatedBuildGradlePath);
  requireCondition(
    countMatches(generatedBuildGradle, new RegExp(jitsiPlugin.GENERATED_MARKER.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) === 1,
    'Generated Android root build.gradle must contain exactly one Jitsi compatibility marker.'
  );
  requireCondition(
    countMatches(generatedBuildGradle, /ext\.gradlePluginVersion\s*=/g) === 1,
    'Generated Android root build.gradle must define gradlePluginVersion exactly once.'
  );
  requireCondition(
    generatedBuildGradle.includes(`ext.gradlePluginVersion = "${agpVersion}"`),
    `Generated Android root build.gradle does not expose the derived AGP ${agpVersion}.`
  );
}

console.log(`Android Jitsi configuration check passed (Jitsi ${jitsiPackage.version}, AGP ${agpVersion}${process.argv.includes('--generated') ? ', generated root verified' : ''}).`);
