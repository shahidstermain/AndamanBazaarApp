module.exports = {
  root: true,
  env: {
    browser: true,
    es2020: true,
    node: true,
  },
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react-hooks/recommended',
  ],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
    ecmaFeatures: {
      jsx: true,
    },
  },
  plugins: ['react-refresh', '@typescript-eslint'],
  rules: {
    'react-refresh/only-export-components': [
      'warn',
      { allowConstantExport: true },
    ],
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    // Allow require() — used in test files for dynamic HMAC fixtures
    '@typescript-eslint/no-var-requires': 'off',
    // Allow empty object types (common in React component patterns)
    '@typescript-eslint/no-empty-object-type': 'off',
    // Downgrade to warn — pre-existing use of obj.hasOwnProperty() in security utils
    'no-prototype-builtins': 'warn',
    // Downgrade to warn — pre-existing regex patterns in validation / test fixtures
    'no-useless-escape': 'warn',
  },
  ignorePatterns: [
    'dist/',
    'node_modules/',
    'coverage/',
    'functions/lib/',
    '*.config.js',
    '*.config.ts',
    '*.config.cjs',
    // Performance test files use JSX inside .ts files (pre-existing) — skip linting
    'tests/performance/',
  ],
}
