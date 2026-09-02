#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const root = path.resolve(__dirname, '..');
const mobile = path.join(root, 'mobile');
const appJsonPath = path.join(mobile, 'app.json');
const packageJsonPath = path.join(mobile, 'package.json');
const appJsonText = fs.readFileSync(appJsonPath, 'utf8');
const app = JSON.parse(appJsonText).expo;
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
const appId = 'ca-app-pub-9649241407302744~1599761317';
const bannerId = 'ca-app-pub-9649241407302744/9035398208';
const publisher = '9649241407302744';
const appAdsLine = 'google.com, pub-9649241407302744, DIRECT, f08c47fec0942fa0';
const proguardRule = '-keep class com.google.android.gms.internal.consent_sdk.** { *; }';
const adIdPermission = 'com.google.android.gms.permission.AD_ID';

function fail(message) {
  console.error(`ERROR: ${message}`);
  process.exit(1);
}

function requireCondition(condition, message) {
  if (!condition) fail(message);
}

function read(relativePath) {
  const absolutePath = path.join(root, relativePath);
  requireCondition(fs.existsSync(absolutePath), `Missing required file: ${relativePath}`);
  return fs.readFileSync(absolutePath, 'utf8');
}

requireCondition(app.name === 'MANAS', 'mobile/app.json must remain the MANAS app.');
requireCondition(typeof app.version === 'string' && /^\d+\.\d+\.\d+(?:[-+].*)?$/.test(app.version), 'mobile/app.json must contain a valid release version.');
requireCondition(app.android?.package === 'com.swivelit.manas', 'Android package changed from com.swivelit.manas.');
requireCondition(Number.isInteger(app.android?.versionCode) && app.android.versionCode > 0, 'Android versionCode must be a positive integer.');
requireCondition(app.ios?.bundleIdentifier === 'com.jeygroups.manas', 'iOS bundle identifier changed unexpectedly.');

const androidPermissions = app.android?.permissions ?? [];
const blockedPermissions = app.android?.blockedPermissions ?? [];
requireCondition(androidPermissions.includes(adIdPermission), `mobile/app.json must explicitly declare ${adIdPermission} under expo.android.permissions.`);
requireCondition(!blockedPermissions.includes(adIdPermission), `${adIdPermission} must not be present in expo.android.blockedPermissions.`);

requireCondition(/^ca-app-pub-\d{16}~\d{10}$/.test(appId), 'Android App ID is malformed.');
requireCondition(/^ca-app-pub-\d{16}\/\d{10}$/.test(bannerId), 'Android banner ad-unit ID is malformed.');
requireCondition(!appId.includes('xxxxxxxx') && !bannerId.includes('xxxxxxxx'), 'AdMob identifier is a placeholder.');
requireCondition(!appId.includes('3940256099942544') && !bannerId.includes('3940256099942544'), 'Production AdMob identifier is a Google sample ID.');
requireCondition(appId.includes(`ca-app-pub-${publisher}~`), 'Android App ID uses the wrong publisher.');
requireCondition(bannerId.includes(`ca-app-pub-${publisher}/`), 'Android banner ID uses the wrong publisher.');

const plugins = app.plugins ?? [];
const adsPlugin = plugins.find(plugin => Array.isArray(plugin) && plugin[0] === 'react-native-google-mobile-ads');
requireCondition(adsPlugin, 'react-native-google-mobile-ads Expo config plugin is missing.');
const adsOptions = adsPlugin[1] ?? {};
requireCondition(adsOptions.androidAppId === appId, 'The supplied Android App ID is not in the AdMob Expo plugin.');
requireCondition(adsOptions.delayAppMeasurementInit === true, 'delayAppMeasurementInit must be enabled.');
requireCondition(!Object.prototype.hasOwnProperty.call(adsOptions, 'iosAppId'), 'An iOS AdMob App ID must not be configured.');

const buildPropertiesPlugin = plugins.find(plugin => Array.isArray(plugin) && plugin[0] === 'expo-build-properties');
requireCondition(buildPropertiesPlugin, 'expo-build-properties Expo config plugin is missing.');
const buildPropertiesOptions = buildPropertiesPlugin[1] ?? {};
requireCondition(buildPropertiesOptions.android?.extraProguardRules === proguardRule, 'UMP ProGuard rule is missing or changed.');
requireCondition(buildPropertiesOptions.android?.kotlinVersion === '2.3.0', 'Android Kotlin version must match the AdMob 16.5.0 dependency metadata.');
requireCondition(plugins.includes('./plugins/with-android-kotlin-compat'), 'Kotlin compatibility config plugin is missing.');

requireCondition(packageJson.dependencies?.['react-native-google-mobile-ads'] === '16.5.0', 'react-native-google-mobile-ads must be locked at 16.5.0.');
requireCondition(/^~56\./.test(packageJson.dependencies?.['expo-build-properties'] ?? ''), 'expo-build-properties must use the Expo SDK 56-compatible version installed by Expo.');
requireCondition(!appJsonText.includes(bannerId), 'The production banner ID is in the wrong location; keep it in mobile/lib/ads.ts.');

const adsConfig = read('mobile/lib/ads.ts');
const banner = read('mobile/components/GlobalBannerAd.tsx');
const consent = read('mobile/lib/adsConsent.tsx');
requireCondition(adsConfig.includes(`PRODUCTION_BANNER_AD_UNIT_ID = '${bannerId}'`), 'Production banner ID is missing from the Android ads configuration module.');
requireCondition(adsConfig.includes('return __DEV__ ? TestIds.ADAPTIVE_BANNER : PRODUCTION_BANNER_AD_UNIT_ID;'), 'Development must use TestIds.ADAPTIVE_BANNER and production must use the supplied unit.');
requireCondition(!adsConfig.includes(appId), 'The Android App ID is in the wrong location; keep it in mobile/app.json.');
requireCondition(banner.includes('BannerAd') && banner.includes('LARGE_ANCHORED_ADAPTIVE_BANNER'), 'GlobalBannerAd must use BannerAd and LARGE_ANCHORED_ADAPTIVE_BANNER.');
requireCondition(banner.includes('getAndroidBannerAdUnitId()'), 'GlobalBannerAd must use the centralized Android ad-unit configuration.');
requireCondition(!banner.includes(bannerId), 'GlobalBannerAd must not duplicate the production banner ID.');
requireCondition(!banner.includes('requestOptions'), 'Banner requests must not add targeting or user data.');
requireCondition(consent.includes('AdsConsent.requestInfoUpdate()'), 'Consent provider must request updated UMP information at launch.');
requireCondition(consent.includes('AdsConsent.loadAndShowConsentFormIfRequired()'), 'Consent provider must load and show the UMP form when required.');
requireCondition(consent.includes('AdsConsent.getConsentInfo()'), 'Consent provider must read stored UMP status after failures.');
requireCondition(consent.includes('canRequestAds'), 'Ads must be gated by UMP canRequestAds.');
requireCondition(consent.includes('AdsConsent.showPrivacyOptionsForm()'), 'Consent provider must expose privacy options.');
requireCondition(consent.includes('MaxAdContentRating.PG'), 'Maximum ad content rating must be PG.');
requireCondition(consent.includes('tagForChildDirectedTreatment: false'), 'Child-directed treatment must be false.');
requireCondition(consent.includes('tagForUnderAgeOfConsent: false'), 'Under-age-of-consent treatment must be false.');
requireCondition(consent.includes("requestConfiguration.testDeviceIdentifiers = ['EMULATOR']") && consent.includes('if (__DEV__)'), 'Test-device configuration must be development-only.');
requireCondition(!consent.includes('AdsConsent.reset'), 'Production consent must not be reset.');

const backendIndex = read('backend/src/index.ts');
const legalRoute = read('backend/src/routes/legal.ts');
requireCondition(legalRoute.includes(appAdsLine), 'The exact app-ads.txt publisher line is missing.');
requireCondition(legalRoute.includes(".type('text/plain')"), 'app-ads.txt must be served as text/plain.');
requireCondition(legalRoute.includes('APP_ADS_TXT_LINE}\\n'), 'app-ads.txt must end with exactly one newline.');
requireCondition(backendIndex.includes("'/app-ads.txt'"), 'Root discovery must list /app-ads.txt.');

const privacySources = [
  read('legal/privacy.md'),
  read('backend/src/legal/privacyPolicy.ts'),
  read('mobile/lib/legal.ts'),
].map(source => source.replaceAll("\\'", "'"));
const privacyRequirements = [
  '27 August 2026',
  'Google AdMob',
  'Google Mobile Ads SDK',
  'Google UMP',
  'regional consent and privacy choices',
  'IP address or approximate location',
  'app and ad interactions',
  'Advertising ID',
  'App Set ID',
  'other device identifiers',
  'advertising, analytics, measurement, security, and fraud prevention',
  "Ad serving depends on the user's region and consent choices",
  'reopen available privacy choices from Profile',
  'does not provide sensitive wellness content or account-profile information to AdMob for targeting',
  "Google's privacy policy also applies",
];
for (const [index, source] of privacySources.entries()) {
  for (const requirement of privacyRequirements) {
    requireCondition(source.includes(requirement), `Privacy policy copy ${index + 1} is missing: ${requirement}`);
  }
}

function containsAdIdPermission(source) {
  return source.includes(adIdPermission);
}

function checkGeneratedReleaseManifests() {
  const buildDir = path.join(mobile, 'android', 'app', 'build');
  if (!fs.existsSync(buildDir)) return 0;

  const manifests = [];
  const visit = directory => {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const entryPath = path.join(directory, entry.name);
      if (entry.isDirectory()) visit(entryPath);
      else if (
        entry.name === 'AndroidManifest.xml' &&
        /[/\\](merged_manifest|bundle_manifest|merged_manifests|packaged_manifests)[/\\]/.test(entryPath) &&
        /[/\\](release|Release)[/\\]/.test(entryPath)
      ) manifests.push(entryPath);
    }
  };
  visit(buildDir);

  for (const manifestPath of manifests) {
    requireCondition(containsAdIdPermission(fs.readFileSync(manifestPath, 'utf8')), `Generated release manifest is missing ${adIdPermission}: ${path.relative(root, manifestPath)}`);
  }

  if (manifests.length > 0) {
    console.log(`Checked ${manifests.length} generated release manifest(s) for ${adIdPermission}.`);
  }
  return manifests.length;
}

function commandOutput(command, args, options = {}) {
  const result = spawnSync(command, args, { encoding: 'utf8', ...options });
  if (result.error || result.status !== 0) return null;
  return result.stdout;
}

function checkAab(artifactPath) {
  requireCondition(fs.existsSync(artifactPath), `AAB not found: ${artifactPath}`);
  requireCondition(artifactPath.endsWith('.aab'), `Expected an Android App Bundle (.aab): ${artifactPath}`);

  const bundletoolManifest = commandOutput('bundletool', ['dump', 'manifest', `--bundle=${artifactPath}`, '--module=base']);
  if (bundletoolManifest !== null) {
    requireCondition(containsAdIdPermission(bundletoolManifest), `Final AAB base manifest is missing ${adIdPermission}: ${path.relative(root, artifactPath)}`);
    console.log(`Checked final AAB base manifest with bundletool for ${adIdPermission}.`);
    return;
  }

  const entriesText = commandOutput('unzip', ['-Z1', artifactPath]);
  requireCondition(entriesText !== null, 'bundletool or unzip is required to inspect the final AAB.');
  const manifestEntries = entriesText.split(/\r?\n/).filter(entry => /(^|\/)AndroidManifest\.xml$/.test(entry));
  requireCondition(manifestEntries.length > 0, `No AndroidManifest.xml entries were found inside ${path.relative(root, artifactPath)}.`);

  for (const entry of manifestEntries) {
    const manifestBinary = spawnSync('unzip', ['-p', artifactPath, entry]);
    requireCondition(!manifestBinary.error && manifestBinary.status === 0, `Could not extract ${entry} from the final AAB.`);
    const strings = spawnSync('strings', [], { input: manifestBinary.stdout, encoding: 'utf8' });
    requireCondition(!strings.error && strings.status === 0, 'strings is required to inspect the final AAB when bundletool is unavailable.');
    requireCondition(containsAdIdPermission(strings.stdout), `Final AAB manifest is missing ${adIdPermission}: ${path.relative(root, artifactPath)} (${entry})`);
  }
  console.log(`Checked ${manifestEntries.length} final AAB manifest entr${manifestEntries.length === 1 ? 'y' : 'ies'} with unzip/strings for ${adIdPermission}.`);
}

const buildDocs = read('mobile/BUILD.md');
for (const requirement of [
  'App ID contains `~`',
  'banner ad-unit ID contains `/`',
  'app-ads.txt uses the publisher line',
  'Expo Go cannot run this native integration',
  'Debug and development builds always use Google test ads',
  'Developers must never click live ads',
  'Production ads can remain limited until app-ads.txt verification and AdMob readiness review finish',
  'Contains ads, Data safety and Advertising ID',
]) {
  requireCondition(buildDocs.includes(requirement), `Mobile documentation is missing: ${requirement}`);
}

const artifactPath = process.argv[2];
if (artifactPath) {
  checkGeneratedReleaseManifests();
  checkAab(path.resolve(root, artifactPath));
}

console.log('Android AdMob configuration validation passed.');
