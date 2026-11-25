// GENERIERT mit "pnpm db:pull" (drizzle-kit pull + scripts/drizzle-copy.mts).
// Nicht manuell aendern, sondern das DB-Schema in extras/compose/postgres/init aendern
// und den Code neu generieren.

import {
    pgSchema,
    integer,
    text,
    numeric,
    date,
    timestamp,
    index,
    foreignKey,
    unique,
    check,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

export const kundeSchema = pgSchema('kunde');

export const adresseTable = kundeSchema.table(
    'adresse',
    {
        id: integer().primaryKey().generatedAlwaysAsIdentity({ startWith: 1000 }),
        strasse: text().notNull(),
        hausnummer: text().notNull(),
        plz: text().notNull(),
        ort: text().notNull(),
        kundeId: integer('kunde_id').notNull(),
    },
    (table) => [
        foreignKey({
            columns: [table.kundeId],
            foreignColumns: [kundeTable.id],
            name: 'adresse_kunde_id_fkey',
        }).onDelete('cascade'),
        unique('adresse_kunde_id_key').on(table.kundeId),
        check('adresse_plz_check', sql`(plz ~ '^\\d{5}$'::text)`),
    ],
);

export const bestellungTable = kundeSchema.table(
    'bestellung',
    {
        id: integer().primaryKey().generatedAlwaysAsIdentity({ startWith: 1000 }),
        produktname: text().notNull(),
        menge: integer().notNull(),
        preis: numeric({ precision: 10, scale: 2 }).notNull(),
        bestelldatum: date()
            .default(sql`CURRENT_DATE`)
            .notNull(),
        kundeId: integer('kunde_id').notNull(),
    },
    (table) => [
        foreignKey({
            columns: [table.kundeId],
            foreignColumns: [kundeTable.id],
            name: 'bestellung_kunde_id_fkey',
        }).onDelete('cascade'),
        index('bestellung_kunde_id_idx').using('btree', table.kundeId.asc().nullsLast()),
        check('bestellung_menge_check', sql`(menge > 0)`),
        check('bestellung_preis_check', sql`(preis >= (0)::numeric)`),
    ],
);

export const kundeTable = kundeSchema.table(
    'kunde',
    {
        id: integer().primaryKey().generatedAlwaysAsIdentity({ startWith: 1000 }),
        version: integer().default(0).notNull(),
        nachname: text().notNull(),
        vorname: text().notNull(),
        email: text().notNull(),
        geburtsdatum: date(),
        erzeugt: timestamp({ withTimezone: true })
            .default(sql`now()`)
            .notNull(),
        aktualisiert: timestamp({ withTimezone: true })
            .default(sql`now()`)
            .notNull(),
    },
    (table) => [unique('kunde_email_key').on(table.email)],
);
