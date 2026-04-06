import {createRequire} from 'node:module';

const require = createRequire(import.meta.url);
const gts = require('gts');

export default [
  ...gts,
  {
    ignores: [
      '.temp/**',
      'examples/**',
      'dist/**',
      'docs/**',
      'src/parser/sonic-weave-ast.js',
      'src/parser/sonic-weave-chord.js',
      'src/scale-workshop-2-ast.js',
      'src/parser/paren-counter.js',
      'eslint.config.js',
      '.prettierrc.js',
    ],
  },
  {
    files: ['bin/*.js'],
    languageOptions: {
      sourceType: 'module',
      globals: {
        process: 'readonly',
      },
    },
  },
  {
    files: ['scripts/inspect-printable-ascii.js', 'scripts/inspect-random-programs.js'],
    languageOptions: {
      sourceType: 'module',
      globals: {
        process: 'readonly',
        console: 'readonly',
      },
    },
  },
  {
    files: ['**/*.js'],
    ignores: ['bin/*.js', 'scripts/inspect-printable-ascii.js', 'scripts/inspect-random-programs.js'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'commonjs',
      globals: {
        console: 'readonly',
        module: 'readonly',
        process: 'readonly',
        require: 'readonly',
      },
    },
  },
  {
    files: ['**/*.ts'],
    languageOptions: {
      parserOptions: {
        project: './tsconfig.eslint.json',
      },
    },
    rules: {
      'no-empty': 0,
      'no-constant-condition': 0,
      'prefer-const': ['error', {destructuring: 'all'}],
      'no-restricted-syntax': ['error', 'SequenceExpression'],
      '@typescript-eslint/no-explicit-any': 0,
      '@typescript-eslint/ban-ts-comment': 0,
      '@typescript-eslint/no-this-alias': [
        'error',
        {
          allowedNames: ['self'],
        },
      ],
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          varsIgnorePattern: '_',
        },
      ],
    },
  },
];
