// Hilfsfunktionen fuer die Router: IDs, ETags, JSON-Body und Location-Header

import { BadRequestError, NotFoundError, PreconditionFailedError } from '../../errors.mts';
import { type HonoRequest } from 'hono';

const ID_PATTERN = /^[1-9]\d{0,9}$/u;
// starker ETag mit Versionsnummer, z.B. "3"; bei If-None-Match ist auch ein schwacher W/"3" erlaubt
const ETAG_PATTERN = /^(?:W\/)?"(?<version>\d{1,9})"$/u;

/**
 * Pfadparameter ":id" in eine Zahl umwandeln.
 * @throws NotFoundError bei ungueltiger ID, da es dazu keine Ressource geben kann
 */
export const parseId = (id: string | undefined) => {
    if (id === undefined || !ID_PATTERN.test(id)) {
        throw new NotFoundError(`Ungueltige ID: ${id}`);
    }
    return Number(id);
};

/** ETag zur Versionsnummer, z.B. 3 => "3" */
export const toEtag = (version: number) => `"${version}"`;

/** Versionsnummer aus einem ETag lesen; undefined falls das Format nicht passt */
export const parseEtag = (etag: string) => {
    const version = ETAG_PATTERN.exec(etag.trim())?.groups?.['version'];
    return version === undefined ? undefined : Number(version);
};

/**
 * Versionsnummer aus dem Header "If-Match" lesen.
 * @throws PreconditionFailedError bei ungueltigem Format
 */
export const parseIfMatch = (ifMatch: string) => {
    const version = parseEtag(ifMatch);
    if (version === undefined || ifMatch.trim().startsWith('W/')) {
        throw new PreconditionFailedError(`Ungueltiger Header "If-Match": ${ifMatch}`);
    }
    return version;
};

/**
 * Prueft, ob einer der ETags in "If-None-Match" zur aktuellen Version passt (=> 304).
 * Mehrere ETags sind kommagetrennt erlaubt, "*" passt immer.
 */
export const matchesIfNoneMatch = (ifNoneMatch: string | undefined, version: number) =>
    ifNoneMatch !== undefined &&
    ifNoneMatch.split(',').some((etag) => etag.trim() === '*' || parseEtag(etag) === version);

/**
 * Request-Body als JSON lesen.
 * @throws BadRequestError falls der Body kein gueltiges JSON ist
 */
export const readJson = async (req: HonoRequest): Promise<unknown> => {
    try {
        return await req.json<unknown>();
    } catch (err) {
        throw new BadRequestError('Der Request-Body ist kein gueltiges JSON.', { cause: err });
    }
};

/** URL der neuen Ressource fuer den Header "Location", z.B. https://localhost:3000/rest/kunden/1000 */
export const createLocation = (req: HonoRequest, id: number) => {
    const { origin, pathname } = new URL(req.url);
    return `${origin}${pathname.replace(/\/$/u, '')}/${id}`;
};
