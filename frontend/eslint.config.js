module.exports = {
  root: true,
  extends: ['eslint:recommended', 'plugin:react/recommended', 'plugin:react-native/all'],
  parserOptions: {
    ecmaVersion: 2021,
    sourceType: 'module',
    ecmaFeatures: {
      jsx: true,
    },
  },
  env: {
    es2021: true,
    node: true,
    'react-native/react-native': true,
  },
  plugins: ['react', 'react-native'],
  rules: {
    // You can add your custom rules here
  },
};