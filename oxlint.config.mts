// Konfiguration fuer den Linter oxlint
// https://oxc.rs/docs/guide/usage/linter/config.html
// angelehnt an das Beispielprojekt "hono" aus der Vorlesung

import { defineConfig } from 'oxlint';

// oxlint-disable-next-line import/no-default-export
export default defineConfig({
    plugins: ['typescript', 'unicorn', 'import', 'node', 'promise', 'oxc'],
    jsPlugins: ['@stylistic/eslint-plugin'],
    categories: {
        correctness: 'error',
        suspicious: 'error',
        perf: 'error',
        pedantic: 'error',
    },
    env: {
        es2026: true,
        node: true,
    },
    ignorePatterns: ['drizzle/**', 'node_modules/**', 'coverage/**'],
    options: {
        denyWarnings: true,
        reportUnusedDisableDirectives: 'error',
    },
    rules: {
        // --- "Guter TypeScript-Code" laut Checkliste ---
        // const / let statt var
        'no-var': 'error',
        'prefer-const': 'error',
        // Template Strings statt String-Konkatenation
        'prefer-template': 'error',
        'no-useless-concat': 'error',
        // Shorthand Properties: { id } statt { id: id }
        'object-shorthand': 'error',
        // Destructuring
        'prefer-destructuring': ['error', { object: true, array: false }],
        // Named Exports statt Default Exports
        'import/no-default-export': 'error',

        // --- TypeScript ---
        'typescript/array-type': ['error', { default: 'array' }],
        'typescript/consistent-type-definitions': ['error', 'type'],
        'typescript/consistent-type-imports': 'error',
        'typescript/no-explicit-any': 'error',
        'typescript/no-non-null-assertion': 'error',
        'typescript/prefer-nullish-coalescing': 'off',
        'typescript/explicit-member-accessibility': ['error', { accessibility: 'no-public' }],
        'typescript/no-useless-empty-export': 'error',

        // --- Imports ---
        'import/consistent-type-specifier-style': ['error', 'prefer-inline'],
        'import/first': 'error',
        'import/no-commonjs': 'error',
        'import/no-cycle': 'error',
        'import/no-duplicates': 'error',
        'import/no-mutable-exports': 'error',
        'import/no-namespace': 'error',
        'import/no-self-import': 'error',
        'import/max-dependencies': 'off',

        // --- Node ---
        // Umgebungsvariable nur zentral in der Konfiguration auslesen
        'node/no-process-env': 'error',
        'node/no-path-concat': 'error',

        // --- Allgemein ---
        'unicorn/catch-error-name': ['error', { name: 'err' }],
        'unicorn/filename-case': 'off',
        'unicorn/no-null': 'off',
        'unicorn/no-array-for-each': 'off',
        'arrow-body-style': ['error', 'as-needed'],
        curly: ['error', 'all'],
        eqeqeq: 'error',
        'func-style': ['error', 'expression'],
        'max-lines-per-function': ['error', { max: 60 }],
        'max-params': ['error', { max: 4 }],
        'no-console': 'error',
        'no-else-return': 'error',
        'no-nested-ternary': 'error',
        'no-param-reassign': 'error',
        'no-shadow': 'error',
        'no-throw-literal': 'error',
        'no-underscore-dangle': 'error',
        'no-useless-return': 'error',
        'one-var': ['error', 'never'],
        'require-unicode-regexp': 'error',
        radix: 'error',
        yoda: ['error', 'never'],

        // --- Stil (zusaetzlich zu oxfmt) ---
        '@stylistic/arrow-parens': ['error', 'always'],
        '@stylistic/brace-style': ['error', '1tbs'],
        '@stylistic/quote-props': ['error', 'as-needed'],
        '@stylistic/semi': ['error', 'always'],
    },
    overrides: [
        {
            files: ['**/*.test.mts', 'test/**/*.mts'],
            plugins: ['vitest', 'typescript', 'import'],
            rules: {
                'max-lines-per-function': 'off',
                'vitest/consistent-test-it': ['error', { fn: 'test', withinDescribe: 'test' }],
                'vitest/no-identical-title': 'error',
            },
        },
    ],
});
