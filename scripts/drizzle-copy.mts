// Uebernimmt den mit "drizzle-kit pull" generierten Code aus drizzle/*.ts nach src/db/*.mts:
// - Dateiendung .mts und Import mit Endung (ESM, Node Type Stripping)
// - sprechende Namen statt der generierten Namen wie "kundeInKunde"
// Aufruf ueber: pnpm db:pull

import { readFile, writeFile } from 'node:fs/promises';

const header = `// GENERIERT mit "pnpm db:pull" (drizzle-kit pull + scripts/drizzle-copy.mts).
// Nicht manuell aendern, sondern das DB-Schema in extras/compose/postgres/init aendern
// und den Code neu generieren.
`;

// [generierter Name, sprechender Name]; Reihenfolge ist relevant
const renames: [RegExp, string][] = [
    [/\badresseInKundes\b/gu, 'adresse'],
    [/\bbestellungInKundes\b/gu, 'bestellungen'],
    [/\bkundeInKunde: r\.one\b/gu, 'kunde: r.one'],
    [/\bkundeInKunde\b/gu, 'kundeTable'],
    [/\badresseInKunde\b/gu, 'adresseTable'],
    [/\bbestellungInKunde\b/gu, 'bestellungTable'],
    [/export const kunde = pgSchema/gu, 'export const kundeSchema = pgSchema'],
    [/\bkunde\.table\(/gu, 'kundeSchema.table('],
];

const rename = (code: string) =>
    renames.reduce((result, [pattern, replacement]) => result.replace(pattern, replacement), code);

// drizzle-kit importiert pauschal Funktionen wie pgTable oder primaryKey, auch wenn sie nicht
// benutzt werden; das wuerde bei tsc (noUnusedLocals) und oxlint zu Fehlern fuehren.
const removeUnusedImports = (code: string) =>
    code.replace(
        /import \{([^}]+)\} from (["']drizzle-orm\/pg-core["'])/u,
        (_match, names: string, modul: string) => {
            const body = code.slice(code.indexOf(modul) + modul.length);
            const used = names
                .split(',')
                .map((name) => name.trim())
                // nur eigenstaendige Aufrufe zaehlen, z.B. integer(), nicht .primaryKey()
                .filter(
                    (name) => name !== '' && new RegExp(`(?<![.\\w])${name}\\(`, 'u').test(body),
                );
            return `import { ${used.join(', ')} } from ${modul}`;
        },
    );

const schemaTs = await readFile(new URL('../drizzle/schema.ts', import.meta.url), 'utf8');
const schemaMts = removeUnusedImports(rename(schemaTs));
await writeFile(new URL('../src/db/schema.mts', import.meta.url), `${header}\n${schemaMts}`);

const relationsTs = await readFile(new URL('../drizzle/relations.ts', import.meta.url), 'utf8');
const relationsMts = rename(relationsTs).replace(
    /import \* as schema from ["']\.\/schema["'];?/u,
    "// oxlint-disable-next-line import/no-namespace\nimport * as schema from './schema.mts';",
);
await writeFile(new URL('../src/db/relations.mts', import.meta.url), `${header}\n${relationsMts}`);

process.stdout.write('src/db/schema.mts und src/db/relations.mts aktualisiert\n');
