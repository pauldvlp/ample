import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';
import prettier from 'eslint-config-prettier';

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Last: turns off every rule Prettier owns, so ESLint and Prettier never disagree.
  prettier,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    '.next/**',
    'out/**',
    'build/**',
    'next-env.d.ts',
    // Build artifacts ESLint would otherwise lint if present on disk (they exist locally
    // after a pack, and never in CI at lint time — ignoring them makes lint robust either way).
    'dist-npm/**',
    '**/.next/**',
  ]),
]);

export default eslintConfig;
