import nextCoreWebVitals from 'eslint-config-next/core-web-vitals';
import nextTypescript from 'eslint-config-next/typescript';

const eslintConfig = [
  ...nextCoreWebVitals,
  ...nextTypescript,
  {
    ignores: [
      'node_modules/**',
      '.next/**',
      'playwright-report/**',
      'test-results/**',
      'e2e/**',
      'coverage/**',
      'public/**',
    ],
  },
  {
    rules: {
      // Nouvelles règles React Compiler d'eslint-config-next 16 (eslint-plugin-react-hooks 7) :
      // en avertissement le temps de traiter le code existant dans une PR dédiée.
      'react-hooks/set-state-in-effect': 'warn',
      'react-hooks/refs': 'warn',
      'react-hooks/preserve-manual-memoization': 'warn',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
    },
  },
];

export default eslintConfig;
