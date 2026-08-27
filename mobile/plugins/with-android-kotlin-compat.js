const { withProjectBuildGradle } = require('@expo/config-plugins');

const MARKER = '// @generated begin MANAS Kotlin compatibility';
const KOTLIN_COMPATIBILITY = `${MARKER}
buildscript {
    configurations.classpath {
        resolutionStrategy.eachDependency { dependency ->
            if (dependency.requested.group == "org.jetbrains.kotlin" && dependency.requested.name == "kotlin-gradle-plugin") {
                dependency.useVersion "2.3.0"
            }
        }
    }
}
// @generated end MANAS Kotlin compatibility`;

module.exports = function withAndroidKotlinCompat(config) {
  return withProjectBuildGradle(config, config => {
    if (!config.modResults.contents.includes(MARKER)) {
      config.modResults.contents += `\n${KOTLIN_COMPATIBILITY}\n`;
    }
    return config;
  });
};
