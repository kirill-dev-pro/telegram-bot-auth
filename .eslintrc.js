module.exports = {
  env: {
    browser: true,
    es6: true,
    node: true,
  },
  extends: ['plugin:prettier/recommended'],
  globals: {
    Atomics: 'readonly',
    SharedArrayBuffer: 'readonly',
  },
  parserOptions: {
    ecmaFeatures: {
      jsx: true,
    },
    ecmaVersion: 2020,
    sourceType: 'module',
  },
  ignorePatterns: ['node_modules/'],
  plugins: ['import'],
  rules: {
    'prettier/prettier': [
      'error',
      { singleQuote: true, jsxSingleQuote: true, semi: false, arrowParens: 'avoid' },
      { usePrettierrc: true },
    ],
    'react/jsx-closing-tag-location': 0,
    'react/jsx-handler-names': 0,
    'jsx-a11y/accessible-emoji': 0,
    'no-prototype-builtins': 0,
    'max-len': ['warn', { code: 100, ignoreComments: true }],
    indent: 0,
    'import/order': [
      'error',
      {
        groups: ['index', 'sibling', 'parent', 'internal', 'external', 'builtin'],
      },
    ],
  },
  settings: {
    react: {
      version: 'detect',
    },
  },
  // https://github.com/babel/babel/issues/10904
  parser: '@typescript-eslint/parser',
}
