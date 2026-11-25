// Konfiguration fuer den Formatter oxfmt (Prettier-kompatibel)
// https://oxc.rs/docs/guide/usage/formatter/config.html

import { defineConfig } from 'oxfmt';

// oxlint-disable-next-line import/no-default-export
export default defineConfig({
    // Einrueckung: 4 Leerzeichen fuer TypeScript (siehe .editorconfig)
    tabWidth: 4,
    printWidth: 100,
    singleQuote: true,
    trailingComma: 'all',
    overrides: [
        {
            files: ['*.json', '*.toml', '*.yml', '*.yaml', '*.bru'],
            options: {
                tabWidth: 2,
                singleQuote: false,
            },
        },
    ],
    ignorePatterns: [
        '*.md',
        'pnpm-lock.yaml',
        'extras/compose/**/*.sql',
        'extras/compose/**/*.csv',
        'extras/compose/keycloak/realm/*.json',
        'src/config/resources/tls/*',
        'drizzle/**',
    ],
});
