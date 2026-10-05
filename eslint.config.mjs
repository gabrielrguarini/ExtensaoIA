import js from '@eslint/js';
import { defineConfig, globalIgnores } from 'eslint/config';
import tseslint from 'typescript-eslint';

export default defineConfig(
  globalIgnores([
    'dist/**',
    'release/**',
    'node_modules/**',
    '.cache/**',
    '.vitest/**',
    'coverage/**',
  ]),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [js.configs.recommended, ...tseslint.configs.recommendedTypeChecked],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/consistent-type-imports': 'error',
      'no-eval': 'error',
      'no-new-func': 'error',
    },
  },
  {
    files: ['src/**/*.{ts,tsx}'],
    rules: {
      'no-console': 'error',
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['node:*'],
              message: 'O código do navegador não pode importar APIs do Node.js.',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['**/*.mjs'],
    extends: [js.configs.recommended],
  },
  {
    files: ['tests/browser/*.mjs'],
    languageOptions: {
      globals: {
        URL: 'readonly',
        process: 'readonly',
        navigator: 'readonly',
        caches: 'readonly',
        chrome: 'readonly',
      },
    },
  },
);
