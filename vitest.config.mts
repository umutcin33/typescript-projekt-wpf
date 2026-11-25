// Konfiguration fuer Vitest: Unit-Tests (ohne DB/Server) und Integrationstests (HTTP/2 gegen
// den laufenden Appserver)
// https://vitest.dev/config

import { defineConfig } from 'vitest/config';

// oxlint-disable-next-line import/no-default-export
export default defineConfig({
    test: {
        projects: [
            {
                test: {
                    name: 'unit',
                    include: ['src/**/*.test.mts'],
                    testTimeout: 2_000,
                },
            },
            {
                test: {
                    name: 'integration',
                    include: ['test/integration/**/*.test.mts'],
                    // Tests mit schreibendem Zugriff nacheinander ausfuehren
                    fileParallelism: false,
                    testTimeout: 10_000,
                },
            },
        ],
    },
});
