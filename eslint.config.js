import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: [
      'dist/**',
      'node_modules/**',
      'data/entities.json',
      'js/**',
      'css/**',
      'test/**',
      'tools/**',
      'docs/**'
    ]
  },
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{js,mjs}'],
    rules: {
      'no-unused-vars': ['error', { argsIgnorePattern: '^_' }]
    }
  }
);
