// REST-Schnittstelle fuer lesende Zugriffe: GET mit Pfad- bzw. Query-Parametern und QUERY

import { BadRequestError } from '../../errors.mts';
import { find, findById } from '../service/kunde-service.mts';
import { matchesIfNoneMatch, parseId, readJson, toEtag } from './http-helper.mts';
import { Hono } from 'hono';
import { SuchkriterienSchema } from '../validation/kunde-validation.mts';
import { createPageable } from '../service/pageable.mts';
import { getLogger } from '../../logger/logger.mts';

export const kundeRouter = new Hono();

const logger = getLogger('kunde-router');

/** Suchkriterien und Pagination aus Query-Parametern bzw. QUERY-Body trennen und pruefen */
const parseSuche = (params: Record<string, unknown>) => {
    const { page, size, ...kriterien } = params;
    const result = SuchkriterienSchema.safeParse(kriterien);
    if (!result.success) {
        // z.B. 'Unrecognized key: "foo"' oder 'plz: Invalid string'
        const meldungen = result.error.issues.map(({ path, message }) =>
            path.length === 0 ? message : `${path.join('.')}: ${message}`,
        );
        throw new BadRequestError(`Ungueltige Suchkriterien: ${meldungen.join('; ')}`);
    }
    return { suchkriterien: result.data, pageable: createPageable({ page, size }) };
};

// GET /rest/kunden/1000
// Bedingter GET-Request: bei "If-None-Match" mit aktueller Version => 304 Not Modified
kundeRouter.get('/:id', async (c) => {
    const id = parseId(c.req.param('id'));
    const kunde = await findById(id);
    const { version } = kunde;

    c.header('ETag', toEtag(version));
    if (matchesIfNoneMatch(c.req.header('If-None-Match'), version)) {
        logger.debug('get: id=%d, Not Modified', id);
        return c.body(null, 304);
    }
    return c.json(kunde);
});

// GET /rest/kunden?nachname=mu&plz=76&page=1&size=5
kundeRouter.get('/', async (c) => {
    const { suchkriterien, pageable } = parseSuche(c.req.query());
    return c.json(await find(suchkriterien, pageable));
});

// QUERY /rest/kunden   Body: { "nachname": "mu", "page": 1, "size": 5 }
// HTTP-Methode QUERY: sichere, idempotente Suche mit Request-Body
// https://datatracker.ietf.org/doc/draft-ietf-httpbis-safe-method-w-body/
kundeRouter.query('/', async (c) => {
    const body = await readJson(c.req);
    if (body === null || typeof body !== 'object' || Array.isArray(body)) {
        throw new BadRequestError('Der Request-Body muss ein JSON-Objekt sein.');
    }
    const { suchkriterien, pageable } = parseSuche(body as Record<string, unknown>);
    return c.json(await find(suchkriterien, pageable));
});
