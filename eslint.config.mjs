// @ts-check

import js from '@eslint/js';
import eslintConfigPrettier from 'eslint-config-prettier';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
    {
      ignores: ['**/dist/**', '**/node_modules/**'],
    },

    js.configs.recommended,

    ...tseslint.configs.recommendedTypeChecked,

    {
      files: ['**/*.ts'],
      languageOptions: {
        globals: {
          ...globals.node,
          ...globals.jest,
        },
        parserOptions: {
          projectService: true,
          tsconfigRootDir: import.meta.dirname,
        },
      },
      rules: {
        '@typescript-eslint/consistent-type-imports': 'error',
        '@typescript-eslint/no-explicit-any': 'error',
        '@typescript-eslint/no-floating-promises': 'error',
        '@typescript-eslint/no-misused-promises': 'error',
      },
    },

    {
      files: ['**/*.spec.ts'],
      rules: {
        '@typescript-eslint/no-floating-promises': 'off',
        '@typescript-eslint/no-unnecessary-type-assertion': 'off',
        '@typescript-eslint/require-await': 'off',
      },
    },

    eslintConfigPrettier,
);