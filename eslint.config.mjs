import js from '@eslint/js';
import { defineConfig } from 'eslint/config';
import prettier from 'eslint-config-prettier';
import globals from 'globals';
import tseslint from 'typescript-eslint';

const ignores = [
  'node_modules/**',
  'dist/**',
  'coverage/**',
  'test-results/**',
  'playwright-report/**',
  '.cache/**',
  '.husky/_/**',
];

export default defineConfig(
  { ignores },
  {
    files: ['**/*.mjs'],
    extends: [js.configs.recommended],
    languageOptions: { globals: globals.node },
  },
  {
    files: ['**/*.ts'],
    extends: [js.configs.recommended, tseslint.configs.strictTypeChecked],
    languageOptions: {
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-floating-promises': ['error', { ignoreVoid: false }],
      '@typescript-eslint/no-misused-promises': 'error',
      '@typescript-eslint/consistent-type-imports': 'error',
      '@typescript-eslint/ban-ts-comment': [
        'error',
        {
          'ts-ignore': true,
          'ts-expect-error': 'allow-with-description',
          minimumDescriptionLength: 12,
        },
      ],
      'no-console': 'error',
      'no-restricted-properties': [
        'error',
        { object: 'Math', property: 'random', message: 'Use an injected seeded RNG.' },
      ],
    },
  },
  {
    files: ['random.ts', '**/*.gen.ts', '**/gen/**/*.ts', '**/generation/**/*.ts'],
    rules: {
      'no-restricted-properties': [
        'error',
        { object: 'Math', property: 'random', message: 'Use an injected seeded RNG.' },
        { object: 'Date', property: 'now', message: 'Generation must not depend on the clock.' },
        { object: 'performance', property: 'now', message: 'Measure timing outside generation.' },
        { object: 'crypto', property: 'getRandomValues', message: 'Use an injected seeded RNG.' },
        {
          object: 'crypto',
          property: 'randomUUID',
          message: 'Use deterministic IDs in generation.',
        },
      ],
      'no-restricted-syntax': [
        'error',
        {
          selector: "NewExpression[callee.name='Date']",
          message: 'Inject explicit time data if the generator needs it.',
        },
      ],
    },
  },
  {
    files: ['main.ts', 'preview.ts', 'random.ts', 'vite-env.d.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['node:*', '**/*.server', '**/*.server.*'],
              message: 'Server modules must never enter the browser graph.',
            },
          ],
        },
      ],
      'no-restricted-globals': [
        'error',
        { name: 'process', message: 'Use allowlisted public import.meta.env values.' },
      ],
    },
  },
  prettier,
);
