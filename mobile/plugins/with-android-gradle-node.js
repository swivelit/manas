const {
  withAppBuildGradle,
  withProjectBuildGradle,
  withSettingsGradle,
} = require('@expo/config-plugins');

const SETTINGS_MARKER = '// @generated begin MANAS node executable';
const APP_MARKER = '// @generated begin MANAS node executable';
const PROJECT_MARKER = '// @generated begin MANAS Android Studio paths';

const groovyNodeHelper = `${APP_MARKER}
def resolveManasNodeExecutable = {
    def configured = findProperty("nodeExecutable") ?: System.getenv("NODE_BINARY")
    def candidates = [
        configured,
        "/opt/homebrew/bin/node",
        "/usr/local/bin/node",
        "/usr/bin/node"
    ].findAll { it != null && it.toString().trim() }
    def executable = candidates.find { new File(it.toString()).canExecute() }
    return executable ?: "node"
}
def manasNodeExecutable = resolveManasNodeExecutable()
// @generated end MANAS node executable
`;

const settingsNodeHelper = `  ${SETTINGS_MARKER}
  def resolveManasNodeExecutable = {
    def configured = providers.gradleProperty("nodeExecutable").orNull ?: System.getenv("NODE_BINARY")
    def candidates = [
      configured,
      "/opt/homebrew/bin/node",
      "/usr/local/bin/node",
      "/usr/bin/node"
    ].findAll { it != null && it.toString().trim() }
    def executable = candidates.find { new File(it.toString()).canExecute() }
    return executable ?: "node"
  }
  def manasNodeExecutable = resolveManasNodeExecutable()
  // @generated end MANAS node executable
`;

function patchSettingsGradle(contents) {
  let patched = contents;
  if (!patched.includes(SETTINGS_MARKER)) {
    patched = patched.replace(/pluginManagement \{\n/, `pluginManagement {\n${settingsNodeHelper}`);
  }
  return patched.replaceAll('commandLine("node",', 'commandLine(manasNodeExecutable,');
}

function patchAppBuildGradle(contents) {
  let patched = contents;
  if (!patched.includes(APP_MARKER)) {
    patched = patched.replace(
      'def projectRoot = rootDir.getAbsoluteFile().getParentFile().getAbsolutePath()\n',
      `def projectRoot = rootDir.getAbsoluteFile().getParentFile().getAbsolutePath()\n\n${groovyNodeHelper}`
    );
  }
  patched = patched.replaceAll('["node",', '[manasNodeExecutable,');
  if (!patched.includes('nodeExecutableAndArgs = [manasNodeExecutable]')) {
    patched = patched.replace(/react \{\n/, 'react {\n    nodeExecutableAndArgs = [manasNodeExecutable]\n');
  }
  return patched;
}

function patchProjectBuildGradle(contents) {
  if (contents.includes(PROJECT_MARKER)) return contents;
  const block = `${PROJECT_MARKER}
ext.REACT_NATIVE_NODE_MODULES_DIR = new File(rootDir, "../node_modules/react-native").absolutePath
ext.NODE_BINARY = System.getenv("NODE_BINARY") ?: [
  "/opt/homebrew/bin/node",
  "/usr/local/bin/node",
  "/usr/bin/node"
].find { new File(it).canExecute() } ?: "node"
// @generated end MANAS Android Studio paths

`;
  return contents.replace(
    '// Top-level build file where you can add configuration options common to all sub-projects/modules.\n\n',
    `// Top-level build file where you can add configuration options common to all sub-projects/modules.\n\n${block}`
  );
}

module.exports = function withAndroidGradleNode(config) {
  config = withSettingsGradle(config, gradleConfig => {
    gradleConfig.modResults.contents = patchSettingsGradle(gradleConfig.modResults.contents);
    return gradleConfig;
  });

  config = withAppBuildGradle(config, gradleConfig => {
    gradleConfig.modResults.contents = patchAppBuildGradle(gradleConfig.modResults.contents);
    return gradleConfig;
  });

  config = withProjectBuildGradle(config, gradleConfig => {
    gradleConfig.modResults.contents = patchProjectBuildGradle(gradleConfig.modResults.contents);
    return gradleConfig;
  });

  return config;
};
