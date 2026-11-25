// GENERIERT mit "pnpm db:pull" (drizzle-kit pull + scripts/drizzle-copy.mts).
// Nicht manuell aendern, sondern das DB-Schema in extras/compose/postgres/init aendern
// und den Code neu generieren.

import { defineRelations } from 'drizzle-orm';
// oxlint-disable-next-line import/no-namespace
import * as schema from './schema.mts';

export const relations = defineRelations(schema, (r) => ({
    adresseTable: {
        kunde: r.one.kundeTable({
            from: r.adresseTable.kundeId,
            to: r.kundeTable.id,
        }),
    },
    kundeTable: {
        adresse: r.one.adresseTable(),
        bestellungen: r.many.bestellungTable(),
    },
    bestellungTable: {
        kunde: r.one.kundeTable({
            from: r.bestellungTable.kundeId,
            to: r.kundeTable.id,
        }),
    },
}));
