// Repository: ausschliesslich DB-Zugriff mit Drizzle (keine Fachlogik, kein HTTP)

import { type SQL, and, count, eq, ilike, like, sql } from 'drizzle-orm';
import { adresseTable, bestellungTable, kundeTable } from '../../db/schema.mts';
import { type Adresse, type Suchkriterien } from '../validation/kunde-validation.mts';
import { type Tx, db } from '../../config/db.mts';
import { type Pageable } from '../service/pageable.mts';

export type KundeInsert = typeof kundeTable.$inferInsert;
export type AdresseInsert = Omit<typeof adresseTable.$inferInsert, 'kundeId'>;
export type BestellungInsert = Omit<typeof bestellungTable.$inferInsert, 'kundeId'>;
/** Aenderbare Felder; bei PATCH koennen Felder fehlen bzw. undefined sein */
export type KundeSet = {
    [K in 'nachname' | 'vorname' | 'email' | 'geburtsdatum']?: KundeInsert[K] | undefined;
};
export type AdresseSet = { [K in keyof Adresse]?: Adresse[K] | undefined };

/** Felder mit Wert undefined entfernen, damit sie beim UPDATE unveraendert bleiben */
const definedOnly = <T extends object>(obj: T) =>
    Object.fromEntries(Object.entries(obj).filter(([, value]) => value !== undefined)) as {
        [K in keyof T]?: Exclude<T[K], undefined>;
    };

/** Kunde mit Adresse (1:1) und Bestellungen (1:N) gemeinsam laden */
const withBeziehungen = {
    adresse: true,
    bestellungen: { orderBy: { id: 'asc' } },
} as const;

export const findById = async (id: number) =>
    await db.query.kundeTable.findFirst({ where: { id }, with: withBeziehungen });

const buildWhere = ({ nachname, vorname, email, plz, ort }: Suchkriterien) => {
    const conditions: SQL[] = [];
    if (nachname !== undefined) {
        conditions.push(ilike(kundeTable.nachname, `%${nachname}%`));
    }
    if (vorname !== undefined) {
        conditions.push(ilike(kundeTable.vorname, `%${vorname}%`));
    }
    if (email !== undefined) {
        conditions.push(ilike(kundeTable.email, `%${email}%`));
    }
    if (plz !== undefined) {
        // PLZ-Praefix, z.B. "76" fuer alle PLZ im Raum Karlsruhe
        conditions.push(like(adresseTable.plz, `${plz}%`));
    }
    if (ort !== undefined) {
        conditions.push(ilike(adresseTable.ort, `%${ort}%`));
    }
    return and(...conditions);
};

/**
 * Kunden zu den Suchkriterien seitenweise suchen.
 * 1. IDs der Seite und Gesamtanzahl ermitteln (Join mit Adresse fuer PLZ und Ort)
 * 2. Kunden der Seite mit Adresse und Bestellungen laden
 */
export const find = async (suchkriterien: Suchkriterien, { number, size }: Pageable) => {
    const where = buildWhere(suchkriterien);

    const idRows = await db
        .select({ id: kundeTable.id })
        .from(kundeTable)
        .leftJoin(adresseTable, eq(adresseTable.kundeId, kundeTable.id))
        .where(where)
        .orderBy(kundeTable.id)
        .limit(size)
        .offset(number * size);

    const [countRow] = await db
        .select({ total: count() })
        .from(kundeTable)
        .leftJoin(adresseTable, eq(adresseTable.kundeId, kundeTable.id))
        .where(where);

    const ids = idRows.map(({ id }) => id);
    const kunden =
        ids.length === 0
            ? []
            : await db.query.kundeTable.findMany({
                  where: { id: { in: ids } },
                  with: withBeziehungen,
                  orderBy: { id: 'asc' },
              });
    return { kunden, totalElements: countRow?.total ?? 0 };
};

export const findIdByEmail = async (email: string) => {
    const [row] = await db
        .select({ id: kundeTable.id })
        .from(kundeTable)
        .where(eq(sql`lower(${kundeTable.email})`, email.toLowerCase()))
        .limit(1);
    return row?.id;
};

export const findVersionById = async (id: number) => {
    const [row] = await db
        .select({ version: kundeTable.version })
        .from(kundeTable)
        .where(eq(kundeTable.id, id))
        .limit(1);
    return row?.version;
};

/** Kunde, Adresse und Bestellungen in EINER Transaktion anlegen; liefert die generierte ID */
export const insert = async (
    kunde: KundeInsert,
    adresse: AdresseInsert,
    bestellungen: readonly BestellungInsert[],
) =>
    await db.transaction(async (tx) => {
        const [row] = await tx.insert(kundeTable).values(kunde).returning({ id: kundeTable.id });
        if (row === undefined) {
            throw new Error('Der Kunde wurde nicht angelegt.');
        }
        const { id: kundeId } = row;
        await tx.insert(adresseTable).values({ ...adresse, kundeId });
        if (bestellungen.length > 0) {
            await tx
                .insert(bestellungTable)
                .values(bestellungen.map((bestellung) => ({ ...bestellung, kundeId })));
        }
        return kundeId;
    });

const updateAdresse = async (tx: Tx, kundeId: number, adresse: AdresseSet) => {
    const werte = definedOnly(adresse);
    if (Object.keys(werte).length > 0) {
        await tx.update(adresseTable).set(werte).where(eq(adresseTable.kundeId, kundeId));
    }
};

/**
 * Optimistische Synchronisation: UPDATE nur, wenn die Version in der DB noch der erwarteten
 * Version entspricht ("WHERE id = ? AND version = ?"). Dadurch gibt es keine Lost Updates,
 * auch nicht bei zeitgleichen Requests. Die Version wird hochgezaehlt und der Zeitstempel
 * "aktualisiert" gesetzt.
 * @returns neue Version oder undefined, falls kein Datensatz passte
 */
export const update = async (
    id: number,
    version: number,
    kunde: KundeSet,
    adresse: AdresseSet = {},
) =>
    await db.transaction(async (tx) => {
        const [row] = await tx
            .update(kundeTable)
            .set({
                ...definedOnly(kunde),
                version: sql`${kundeTable.version} + 1`,
                aktualisiert: sql`now()`,
            })
            .where(and(eq(kundeTable.id, id), eq(kundeTable.version, version)))
            .returning({ version: kundeTable.version });
        if (row !== undefined) {
            await updateAdresse(tx, id, adresse);
        }
        return row?.version;
    });

/** Loeschen; Adresse und Bestellungen werden per ON DELETE CASCADE mitgeloescht */
export const deleteById = async (id: number) => {
    const rows = await db
        .delete(kundeTable)
        .where(eq(kundeTable.id, id))
        .returning({ id: kundeTable.id });
    return rows.length > 0;
};
