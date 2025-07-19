// @ts-check

import eslint from '@eslint/js';
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  eslint.configs.recommended,
  tseslint.configs.recommended,
  eslintPluginPrettierRecommended,
  {
    // root: true,
    // parser: '@typescript-eslint/parser',
    // plugins: ['@typescript-eslint', 'prettier'],
    // extends: [
    //   'eslint:recommended',
    //   '@typescript-eslint/recommended',
    //   'prettier',
    // ],
    // parserOptions: {
    //   ecmaVersion: 2022,
    //   sourceType: 'module',
    //   project: './tsconfig.json',
    // },
    // env: {
    //   node: true,
    //   es2022: true,
    // },
    rules: {
      'prettier/prettier': 'error',
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-non-null-assertion': 'warn',
      '@typescript-eslint/no-empty-object-type': 'warn',
      'prefer-const': 'error',
      'no-var': 'error',
      'object-shorthand': 'error',
      'prefer-template': 'error',
      // React-specific rules for JSX files
      'react/react-in-jsx-scope': 'off',
      'react/jsx-uses-react': 'off',
      'react/prop-types': 'off',
      'react/no-unescaped-entities': 'warn',
    },
    ignores: ['dist/', 'node_modules/', '*.js', '*.d.ts'],
  }
);
