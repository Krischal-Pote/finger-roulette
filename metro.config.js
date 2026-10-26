const { getDefaultConfig } = require('expo/metro-config');

/**
 * @type {import('expo/metro-config').MetroConfig}
 */
const config = getDefaultConfig(__dirname);

config.transformer.getTransformOptions = async () => ({
  transform: {
    experimentalImportSupport: true,
    inlineRequires: true,
    nonInlinedRequires: [
      'React',
      'react',
      'react/jsx-dev-runtime',
      'react/jsx-runtime',
      'react-compiler-runtime',
      'react-native',
    ],
  },
});

module.exports = config;
