// Service fuer lesende Zugriffe: Fachlogik zwischen Router und Repository

import { type Page, type Pageable, createPage } from './pageable.mts';
import { find as findInDb, findById as findByIdInDb } from '../repository/kunde-repository.mts';
import { NotFoundError } from '../../errors.mts';
import { type Suchkriterien } from '../validation/kunde-validation.mts';
import { getLogger } from '../../logger/logger.mts';

const logger = getLogger('kunde-service');

type KundeRow = NonNullable<Awaited<ReturnType<typeof findByIdInDb>>>;

/** Kunde fuer die Ausgabe: der Preis (numeric in PostgreSQL) wird als Zahl geliefert */
export const toDto = ({ bestellungen, ...kunde }: KundeRow) => ({
    ...kunde,
    bestellungen: bestellungen.map(({ preis, ...bestellung }) => ({
        ...bestellung,
        preis: Number(preis),
    })),
});

export type KundeDto = ReturnType<typeof toDto>;

/**
 * Kunde mit Adresse und Bestellungen zur ID suchen.
 * @throws NotFoundError falls es keinen Kunden mit der ID gibt
 */
export const findById = async (id: number): Promise<KundeDto> => {
    const kunde = await findByIdInDb(id);
    if (kunde === undefined) {
        throw new NotFoundError(`Es gibt keinen Kunden mit der ID ${id}.`);
    }
    logger.debug('findById: id=%d, version=%d', id, kunde.version);
    return toDto(kunde);
};

/**
 * Kunden zu Suchkriterien seitenweise suchen.
 * @throws NotFoundError falls es keine passenden Kunden (auf der Seite) gibt
 */
export const find = async (
    suchkriterien: Suchkriterien,
    pageable: Pageable,
): Promise<Page<KundeDto>> => {
    logger.debug('find: suchkriterien=%o, pageable=%o', suchkriterien, pageable);
    const { kunden, totalElements } = await findInDb(suchkriterien, pageable);
    if (kunden.length === 0) {
        throw new NotFoundError('Es wurden keine Kunden gefunden.');
    }
    return createPage(
        kunden.map((kunde) => toDto(kunde)),
        totalElements,
        pageable,
    );
};
