const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Configure path alias for @/
config.resolver.alias = {
  ...config.resolver.alias,
  '@': path.resolve(__dirname, './'),
};

// Ensure proper resolution for lucide-react-native
config.resolver.sourceExts = [...(config.resolver.sourceExts || []), 'js', 'jsx', 'json', 'ts', 'tsx', 'mjs'];

module.exports = config;

