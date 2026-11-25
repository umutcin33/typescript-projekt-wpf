// Konfiguration fuer drizzle-kit
//   pnpm db:pull    Schema aus der laufenden DB lesen und TypeScript-Code generieren
//   pnpm db:studio  Drizzle Studio als DB-Browser starten
// https://orm.drizzle.team/docs/drizzle-config-file

import { defineConfig } from 'drizzle-kit';
import process from 'node:process';

// Umgebungsvariable aus .env laden (ab Node 21 ohne das Package "dotenv")
process.loadEnvFile();
const { DATABASE_URL } = process.env;
if (DATABASE_URL === undefined) {
    throw new Error('DATABASE_URL ist nicht in .env gesetzt');
}

// oxlint-disable-next-line import/no-default-export
export default defineConfig({
    dialect: 'postgresql',
    dbCredentials: {
        url: DATABASE_URL,
    },
    // nur das Schema "kunde" introspektieren
    schemaFilter: ['kunde'],
    // Ausgabe von "drizzle-kit pull": drizzle/schema.ts und drizzle/relations.ts
    out: './drizzle',
});
