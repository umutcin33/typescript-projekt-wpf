// Service fuer schreibende Zugriffe: Fachlogik zwischen Router und Repository

import { EmailExistsError, NotFoundError, PreconditionFailedError } from '../../errors.mts';
import {
    type KundeNeu,
    type KundePatch,
    type KundeUpdate,
} from '../validation/kunde-validation.mts';
import {
    type AdresseSet,
    type KundeSet,
    deleteById,
    findIdByEmail,
    findVersionById,
    insert,
    update as updateInDb,
} from '../repository/kunde-repository.mts';
import { getLogger } from '../../logger/logger.mts';

const logger = getLogger('kunde-write-service');

/** Email-Adressen sind eindeutig; beim Aendern darf der Kunde seine eigene behalten */
const checkEmail = async (email: string, eigeneId?: number) => {
    const id = await findIdByEmail(email);
    if (id !== undefined && id !== eigeneId) {
        throw new EmailExistsError(email);
    }
};

/**
 * Neuen Kunden mit Adresse und Bestellungen anlegen.
 * @returns generierte ID
 * @throws EmailExistsError falls die Email-Adresse bereits vergeben ist
 */
export const create = async ({ adresse, bestellungen, ...kunde }: KundeNeu): Promise<number> => {
    await checkEmail(kunde.email);
    const id = await insert(
        kunde,
        adresse,
        bestellungen.map(({ preis, ...bestellung }) => ({
            ...bestellung,
            preis: preis.toFixed(2),
        })),
    );
    logger.debug('create: id=%d', id);
    return id;
};

const updateMitVersion = async (
    id: number,
    version: number,
    { adresse, ...kunde }: KundeSet & { adresse?: AdresseSet | undefined },
) => {
    if (kunde.email !== undefined) {
        await checkEmail(kunde.email, id);
    }
    const neueVersion = await updateInDb(id, version, kunde, adresse);
    if (neueVersion !== undefined) {
        logger.debug('update: id=%d, neueVersion=%d', id, neueVersion);
        return neueVersion;
    }

    // Kein Datensatz aktualisiert: entweder gibt es den Kunden nicht oder die Version ist veraltet
    const versionDb = await findVersionById(id);
    if (versionDb === undefined) {
        throw new NotFoundError(`Es gibt keinen Kunden mit der ID ${id}.`);
    }
    throw new PreconditionFailedError(
        `Die Version ${version} ist nicht aktuell; aktuelle Version: ${versionDb}.`,
    );
};

/**
 * Kunden einschliesslich Adresse vollstaendig aendern (PUT).
 * @param version erwartete Version aus dem Header "If-Match"
 * @returns neue Version
 * @throws NotFoundError, PreconditionFailedError, EmailExistsError
 */
export const update = async (id: number, version: number, kunde: KundeUpdate) =>
    await updateMitVersion(id, version, kunde);

/**
 * Einzelne Felder des Kunden bzw. seiner Adresse aendern (PATCH).
 * @returns neue Version
 */
export const patch = async (id: number, version: number, kunde: KundePatch) =>
    await updateMitVersion(id, version, kunde);

/** Kunden loeschen; idempotent, d.h. auch bei nicht vorhandener ID kein Fehler */
export const remove = async (id: number) => {
    const deleted = await deleteById(id);
    logger.debug('remove: id=%d, deleted=%s', id, deleted);
    return deleted;
};
