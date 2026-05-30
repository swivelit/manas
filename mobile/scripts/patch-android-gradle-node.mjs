import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const mobileRoot = path.resolve(__dirname, '..');

const kotlinHelperMarker = '// MANAS Android Studio Node resolver';
const kotlinHelper = `${kotlinHelperMarker}
private fun resolveManasNodeExecutable(): String {
  val configured = System.getProperty("NODE_BINARY") ?: System.getenv("NODE_BINARY")
  val candidates = listOfNotNull(
    configured,
    "/opt/homebrew/bin/node",
    "/usr/local/bin/node",
    "/usr/bin/node"
  ).filter { it.isNotBlank() }
  return candidates.firstOrNull { File(it).canExecute() } ?: "node"
}

`;

const groovyHelperMarker = '// MANAS Android Studio Node resolver';
const groovyHelper = `${groovyHelperMarker}
def resolveManasNodeExecutable() {
    def configured = project.findProperty("nodeExecutable") ?: project.findProperty("NODE_BINARY") ?: System.getenv("NODE_BINARY")
    def candidates = [
        configured,
        "/opt/homebrew/bin/node",
        "/usr/local/bin/node",
        "/usr/bin/node"
    ].findAll { it != null && it.toString().trim() }
    def executable = candidates.find { new File(it.toString()).canExecute() }
    return executable ?: "node"
}

`;

function read(relativePath) {
  return fs.readFileSync(path.join(mobileRoot, relativePath), 'utf8');
}

function write(relativePath, contents) {
  fs.writeFileSync(path.join(mobileRoot, relativePath), contents);
}

function patchFile(relativePath, patcher) {
  const fullPath = path.join(mobileRoot, relativePath);
  if (!fs.existsSync(fullPath)) return false;
  const before = fs.readFileSync(fullPath, 'utf8');
  const after = patcher(before);
  if (after !== before) {
    fs.writeFileSync(fullPath, after);
    return true;
  }
  return false;
}

function ensureKotlinFile(contents) {
  let patched = contents;
  if (!patched.includes('import java.io.File')) {
    patched = patched.replace(/package .+\n\n/, match => `${match}import java.io.File\n`);
  }
  if (!patched.includes(kotlinHelperMarker)) {
    const lastImport = [...patched.matchAll(/^import .+$/gm)].pop();
    if (lastImport) {
      const index = lastImport.index + lastImport[0].length;
      patched = `${patched.slice(0, index)}\n\n${kotlinHelper}${patched.slice(index + 1)}`;
    }
  }
  return patched
    .replaceAll('"node",', 'resolveManasNodeExecutable(),')
    .replaceAll('listOf(\n    "node",', 'listOf(\n    resolveManasNodeExecutable(),');
}

function ensureGroovyFile(contents) {
  let patched = contents;
  if (!patched.includes(groovyHelperMarker)) {
    const importMatches = [...patched.matchAll(/^import .+$/gm)];
    if (importMatches.length > 0) {
      const lastImport = importMatches.at(-1);
      const index = lastImport.index + lastImport[0].length;
      patched = `${patched.slice(0, index)}\n\n${groovyHelper}${patched.slice(index + 1)}`;
    } else {
      patched = `${groovyHelper}${patched}`;
    }
  }
  return patched
    .replaceAll('commandLine("node",', 'commandLine(resolveManasNodeExecutable(),')
    .replaceAll('["node"]', '[resolveManasNodeExecutable()]');
}

const kotlinFiles = [
  'node_modules/expo-modules-autolinking/android/expo-gradle-plugin/expo-autolinking-plugin-shared/src/main/kotlin/expo/modules/plugin/AutolinkingCommandBuilder.kt',
  'node_modules/expo-modules-autolinking/android/expo-gradle-plugin/expo-autolinking-plugin/src/main/kotlin/expo/modules/plugin/ExpoAutolinkingPlugin.kt',
  'node_modules/expo-modules-autolinking/android/expo-gradle-plugin/expo-autolinking-settings-plugin/src/main/kotlin/expo/modules/plugin/ExpoAutolinkingSettingsExtension.kt',
  'node_modules/expo-modules-autolinking/android/expo-gradle-plugin/expo-autolinking-settings-plugin/src/main/kotlin/expo/modules/plugin/ExpoAutolinkingSettingsPlugin.kt',
  'node_modules/expo-modules-core/expo-module-gradle-plugin/src/main/kotlin/expo/modules/plugin/gradle/ExpoGradleHelperExtension.kt',
  'node_modules/@react-native/gradle-plugin/react-native-gradle-plugin/src/main/kotlin/com/facebook/react/utils/PathUtils.kt',
];

const groovyFiles = [
  'node_modules/expo-constants/scripts/get-app-config-android.gradle',
  'node_modules/@expo/log-box/android/build.gradle',
  'node_modules/react-native-gesture-handler/android/build.gradle',
  'node_modules/react-native-reanimated/android/build.gradle',
  'node_modules/react-native-screens/android/build.gradle',
  'node_modules/react-native-svg/android/build.gradle',
  'node_modules/react-native-worklets/android/build.gradle',
];

let changed = 0;
for (const file of kotlinFiles) {
  if (patchFile(file, ensureKotlinFile)) changed += 1;
}
for (const file of groovyFiles) {
  if (patchFile(file, ensureGroovyFile)) changed += 1;
}

console.log(`Patched Android Gradle Node resolution in ${changed} file(s).`);
