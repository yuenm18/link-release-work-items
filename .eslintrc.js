module.exports = {
  'env': {
    'browser': true,
    'es2020': true,
  },
  'extends': [
    'plugin:react/recommended',
    'google',
  ],
  'parser': '@typescript-eslint/parser',
  'parserOptions': {
    'ecmaFeatures': {
      'jsx': true,
    },
    'ecmaVersion': 11,
    'sourceType': 'module',
  },
  'plugins': [
    'react',
    '@typescript-eslint',
  ],
  'rules': {
    'max-len': [0],
    'no-unused-vars': [0],
    'require-jsdoc': [0],
    'no-invalid-this': [0],
    'object-curly-spacing': [2, 'always'],
    'linebreak-style': [0],
  },
  'settings': {
    'react': {
      'createClass': 'createReactClass',
      'pragma': 'React',
      'version': 'detect',
      'flowVersion': '0.53',
    },
  },
};
