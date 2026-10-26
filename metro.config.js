const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');

/**
 * @type {import('@react-native/metro-config').MetroConfig}
 */
const config = {
  transformer: {
    getTransformOptions: () => ({
      transform: {
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
    }),
  },
};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);
