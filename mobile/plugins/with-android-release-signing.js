const { withAppBuildGradle } = require('@expo/config-plugins');

const RELEASE_SIGNING_MARKER = '// @generated begin MANAS release signing';
const MISSING_RELEASE_SIGNING_MESSAGE =
  'MANAS release signing is not configured. Play Console will reject debug-signed bundles. Run ./scripts/create-android-upload-keystore.sh or use EAS production build.';

const releaseSigningHelper = `${RELEASE_SIGNING_MARKER}
def manasReleaseSigningFailureMessage = "${MISSING_RELEASE_SIGNING_MESSAGE}"
def manasRepoRoot = new File(projectRoot).getParentFile()
def manasReleaseSigningPropertiesFile = new File(manasRepoRoot, "release-signing.properties")
def manasReleaseSigningProperties = new Properties()

if (manasReleaseSigningPropertiesFile.exists()) {
    manasReleaseSigningPropertiesFile.withInputStream { stream ->
        manasReleaseSigningProperties.load(stream)
    }
}

def manasNonBlank = { value ->
    value != null && value.toString().trim().length() > 0
}

def manasSigningValue = { String key ->
    def envValue = System.getenv(key)
    if (manasNonBlank(envValue)) {
        return envValue.toString().trim()
    }

    def propValue = manasReleaseSigningProperties.getProperty(key)
    if (manasNonBlank(propValue)) {
        return propValue.toString().trim()
    }

    return null
}

def manasGradleSigningValue = { String key ->
    def propValue = findProperty(key)
    if (manasNonBlank(propValue)) {
        return propValue.toString().trim()
    }

    def systemValue = System.getProperty(key)
    if (manasNonBlank(systemValue)) {
        return systemValue.toString().trim()
    }

    def envValue = System.getenv(key.replace('.', '_').toUpperCase())
    if (manasNonBlank(envValue)) {
        return envValue.toString().trim()
    }

    return null
}

def manasResolveStoreFile = { String storeFilePath ->
    if (!manasNonBlank(storeFilePath)) {
        return null
    }

    def storeFile = new File(storeFilePath)
    if (!storeFile.isAbsolute()) {
        storeFile = new File(manasRepoRoot, storeFilePath)
    }
    return storeFile
}

def manasUploadStoreFile = manasResolveStoreFile(manasSigningValue("MANAS_UPLOAD_STORE_FILE"))
def manasUploadStorePassword = manasSigningValue("MANAS_UPLOAD_STORE_PASSWORD")
def manasUploadKeyAlias = manasSigningValue("MANAS_UPLOAD_KEY_ALIAS")
def manasUploadKeyPassword = manasSigningValue("MANAS_UPLOAD_KEY_PASSWORD")
def manasUploadSigningConfigured =
    manasUploadStoreFile != null &&
    manasUploadStoreFile.exists() &&
    manasNonBlank(manasUploadStorePassword) &&
    manasNonBlank(manasUploadKeyAlias) &&
    manasNonBlank(manasUploadKeyPassword)

def manasInjectedStoreFile = manasResolveStoreFile(manasGradleSigningValue("android.injected.signing.store.file"))
def manasInjectedStorePassword = manasGradleSigningValue("android.injected.signing.store.password")
def manasInjectedKeyAlias = manasGradleSigningValue("android.injected.signing.key.alias")
def manasInjectedKeyPassword = manasGradleSigningValue("android.injected.signing.key.password")
def manasInjectedSigningConfigured =
    manasInjectedStoreFile != null &&
    manasInjectedStoreFile.exists() &&
    manasNonBlank(manasInjectedStorePassword) &&
    manasNonBlank(manasInjectedKeyAlias) &&
    manasNonBlank(manasInjectedKeyPassword)

def manasReleaseSigningConfigured = manasUploadSigningConfigured || manasInjectedSigningConfigured
def manasIsEasBuild =
    "true".equalsIgnoreCase(System.getenv("EAS_BUILD") ?: "") ||
    manasNonBlank(System.getenv("EAS_BUILD_ID")) ||
    manasNonBlank(System.getenv("EAS_BUILD_PROFILE"))

def manasConfigureReleaseSigning = { signingConfig ->
    if (manasUploadSigningConfigured) {
        signingConfig.storeFile = manasUploadStoreFile
        signingConfig.storePassword = manasUploadStorePassword
        signingConfig.keyAlias = manasUploadKeyAlias
        signingConfig.keyPassword = manasUploadKeyPassword
    } else if (manasInjectedSigningConfigured) {
        signingConfig.storeFile = manasInjectedStoreFile
        signingConfig.storePassword = manasInjectedStorePassword
        signingConfig.keyAlias = manasInjectedKeyAlias
        signingConfig.keyPassword = manasInjectedKeyPassword
    }
}

gradle.taskGraph.whenReady { taskGraph ->
    def releaseTaskRequested = taskGraph.allTasks.any { task ->
        def taskPath = task.path.toLowerCase()
        taskPath.contains("release") && (
            taskPath.contains("assemble") ||
            taskPath.contains("bundle") ||
            taskPath.contains("package") ||
            taskPath.contains("sign") ||
            taskPath.contains("validatesigning")
        )
    }

    if (releaseTaskRequested && !manasReleaseSigningConfigured && !manasIsEasBuild) {
        throw new GradleException(manasReleaseSigningFailureMessage)
    }
}
// @generated end MANAS release signing
`;

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
        braceIndex,
        bodyStart: braceIndex + 1,
        bodyEnd: index,
        endIndex: index + 1,
      };
    }
  }

  return null;
}

function insertReleaseSigningHelper(contents) {
  if (contents.includes(RELEASE_SIGNING_MARKER)) return contents;

  const androidBlock = findNextBlock(contents, 'android');
  if (!androidBlock) {
    throw new Error('Could not find android block in android/app/build.gradle');
  }

  return `${contents.slice(0, androidBlock.nameIndex)}${releaseSigningHelper}\n\n${contents.slice(androidBlock.nameIndex)}`;
}

function ensureReleaseSigningConfig(contents) {
  const signingBlock = findNextBlock(contents, 'signingConfigs');
  if (!signingBlock) {
    throw new Error('Could not find signingConfigs block in android/app/build.gradle');
  }

  const releaseBlock = findNextBlock(contents, 'release', signingBlock.bodyStart);
  if (releaseBlock && releaseBlock.nameIndex < signingBlock.bodyEnd) {
    const body = contents.slice(releaseBlock.bodyStart, releaseBlock.bodyEnd);
    if (body.includes('manasConfigureReleaseSigning(delegate)')) return contents;

    return `${contents.slice(0, releaseBlock.bodyStart)}
            manasConfigureReleaseSigning(delegate)${contents.slice(releaseBlock.bodyStart)}`;
  }

  const releaseSigningConfig = `
        release {
            manasConfigureReleaseSigning(delegate)
        }`;

  return `${contents.slice(0, signingBlock.bodyEnd)}${releaseSigningConfig}${contents.slice(signingBlock.bodyEnd)}`;
}

function ensureReleaseBuildTypeUsesReleaseSigning(contents) {
  const buildTypesBlock = findNextBlock(contents, 'buildTypes');
  if (!buildTypesBlock) {
    throw new Error('Could not find buildTypes block in android/app/build.gradle');
  }

  const releaseBlock = findNextBlock(contents, 'release', buildTypesBlock.bodyStart);
  if (!releaseBlock || releaseBlock.nameIndex >= buildTypesBlock.bodyEnd) {
    throw new Error('Could not find release buildType in android/app/build.gradle');
  }

  const releaseSigningBlock = `            if (manasReleaseSigningConfigured || !manasIsEasBuild) {
                signingConfig signingConfigs.release
            }`;
  const body = contents.slice(releaseBlock.bodyStart, releaseBlock.bodyEnd);

  if (body.includes('signingConfig signingConfigs.release')) {
    return contents;
  }

  const patchedBody = body.includes('signingConfig signingConfigs.debug')
    ? body.replace(/^\s*signingConfig\s+signingConfigs\.debug\s*$/m, releaseSigningBlock)
    : `\n${releaseSigningBlock}${body}`;

  return `${contents.slice(0, releaseBlock.bodyStart)}${patchedBody}${contents.slice(releaseBlock.bodyEnd)}`;
}

function patchAppBuildGradle(contents) {
  let patched = insertReleaseSigningHelper(contents);
  patched = ensureReleaseSigningConfig(patched);
  patched = ensureReleaseBuildTypeUsesReleaseSigning(patched);
  return patched;
}

module.exports = function withAndroidReleaseSigning(config) {
  return withAppBuildGradle(config, gradleConfig => {
    gradleConfig.modResults.contents = patchAppBuildGradle(gradleConfig.modResults.contents);
    return gradleConfig;
  });
};

module.exports.patchAppBuildGradle = patchAppBuildGradle;
module.exports.MISSING_RELEASE_SIGNING_MESSAGE = MISSING_RELEASE_SIGNING_MESSAGE;
