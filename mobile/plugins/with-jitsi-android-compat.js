const fs = require('node:fs');
const path = require('node:path');
const { withAndroidManifest, withProjectBuildGradle } = require('@expo/config-plugins');

const GENERATED_MARKER = '// @generated begin MANAS Jitsi Android compatibility';
const JITSI_MINIMUM_AGP = '8.4.2';
const MEDIA_PROJECTION_SERVICE = 'com.oney.WebRTCModule.MediaProjectionService';

function parseVersion(version) {
  const parts = String(version).split('.').map(part => Number.parseInt(part, 10));
  if (parts.length < 3 || parts.slice(0, 3).some(part => !Number.isInteger(part))) return null;
  return parts.slice(0, 3);
}

function isVersionAtLeast(version, minimum) {
  const current = parseVersion(version);
  const required = parseVersion(minimum);
  if (!current || !required) return false;

  for (let index = 0; index < required.length; index += 1) {
    if (current[index] !== required[index]) return current[index] > required[index];
  }
  return true;
}

function getReactNativeGradleCatalogPath(projectRoot = path.resolve(__dirname, '..')) {
  return path.join(projectRoot, 'node_modules', 'react-native', 'gradle', 'libs.versions.toml');
}

function readAndroidGradlePluginVersion(projectRoot = path.resolve(__dirname, '..')) {
  const catalogPath = getReactNativeGradleCatalogPath(projectRoot);
  if (!fs.existsSync(catalogPath)) {
    throw new Error(`React Native Gradle version catalog not found at ${catalogPath}`);
  }

  const catalog = fs.readFileSync(catalogPath, 'utf8');
  const match = catalog.match(/^\s*agp\s*=\s*"([^"]+)"\s*$/m);
  const version = match?.[1];
  if (!version || !parseVersion(version)) {
    throw new Error(`Could not derive a valid Android Gradle Plugin version from ${catalogPath}`);
  }
  if (!isVersionAtLeast(version, JITSI_MINIMUM_AGP)) {
    throw new Error(
      `React Native AGP ${version} is below Jitsi's minimum supported AGP ${JITSI_MINIMUM_AGP}`
    );
  }

  return version;
}

function patchProjectBuildGradle(contents, gradlePluginVersion) {
  if (contents.includes(GENERATED_MARKER)) return contents;

  const block = `${GENERATED_MARKER}
ext.gradlePluginVersion = "${gradlePluginVersion}"
// @generated end MANAS Jitsi Android compatibility

`;
  return `${block}${contents}`;
}

function patchAndroidManifest(manifest) {
  const application = manifest.application?.[0];
  if (!application) {
    throw new Error('Could not find the Android application node while applying MANAS Jitsi compatibility.');
  }

  const services = application.service ?? (application.service = []);
  const removal = services.find(service => service.$?.['android:name'] === MEDIA_PROJECTION_SERVICE);
  if (removal) {
    removal.$['tools:node'] = 'remove';
  } else {
    services.push({
      $: {
        'android:name': MEDIA_PROJECTION_SERVICE,
        'tools:node': 'remove',
      },
    });
  }

  return manifest;
}

function withJitsiAndroidCompat(config) {
  const gradlePluginVersion = readAndroidGradlePluginVersion();

  config = withProjectBuildGradle(config, gradleConfig => {
    gradleConfig.modResults.contents = patchProjectBuildGradle(
      gradleConfig.modResults.contents,
      gradlePluginVersion
    );
    return gradleConfig;
  });

  return withAndroidManifest(config, androidConfig => {
    androidConfig.modResults.manifest = patchAndroidManifest(androidConfig.modResults.manifest);
    return androidConfig;
  });
}

module.exports = withJitsiAndroidCompat;
module.exports.GENERATED_MARKER = GENERATED_MARKER;
module.exports.JITSI_MINIMUM_AGP = JITSI_MINIMUM_AGP;
module.exports.MEDIA_PROJECTION_SERVICE = MEDIA_PROJECTION_SERVICE;
module.exports.getReactNativeGradleCatalogPath = getReactNativeGradleCatalogPath;
module.exports.readAndroidGradlePluginVersion = readAndroidGradlePluginVersion;
module.exports.patchAndroidManifest = patchAndroidManifest;
module.exports.patchProjectBuildGradle = patchProjectBuildGradle;
