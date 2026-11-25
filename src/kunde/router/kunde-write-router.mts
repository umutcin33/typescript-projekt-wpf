// REST-Schnittstelle fuer schreibende Zugriffe: POST, PUT, PATCH und DELETE.
// Alle Methoden sind geschuetzt und erfordern einen Token mit der Rolle "admin".

import {
    KundeNeuSchema,
    KundePatchSchema,
    KundeUpdateSchema,
} from '../validation/kunde-validation.mts';
import { create, patch, remove, update } from '../service/kunde-write-service.mts';
import { createLocation, parseId, parseIfMatch, readJson, toEtag } from './http-helper.mts';
import { type HonoRequest, Hono } from 'hono';
import { PreconditionRequiredError } from '../../errors.mts';
import { getLogger } from '../../logger/logger.mts';
import { rolesRequired } from '../../security/roles-required.mts';

export const kundeWriteRouter = new Hono();

const logger = getLogger('kunde-write-router');

/**
 * Erwartete Version aus "If-Match" lesen (Vermeidung von Lost Updates).
 * @throws PreconditionRequiredError (428) falls der Header fehlt
 */
const versionFromIfMatch = (req: HonoRequest) => {
    const ifMatch = req.header('If-Match');
    if (ifMatch === undefined) {
        throw new PreconditionRequiredError('Der Header "If-Match" fehlt.');
    }
    return parseIfMatch(ifMatch);
};

// POST /rest/kunden  => 201 Created mit Header "Location"
kundeWriteRouter.post('/', rolesRequired('admin'), async (c) => {
    const kundeNeu = KundeNeuSchema.parse(await readJson(c.req));
    const id = await create(kundeNeu);
    logger.debug('post: id=%d', id);
    c.header('Location', createLocation(c.req, id));
    return c.body(null, 201);
});

// PUT /rest/kunden/1000  mit "If-Match: \"0\""  => 204 No Content mit neuem ETag
kundeWriteRouter.put('/:id', rolesRequired('admin'), async (c) => {
    const id = parseId(c.req.param('id'));
    const version = versionFromIfMatch(c.req);
    const kunde = KundeUpdateSchema.parse(await readJson(c.req));
    const neueVersion = await update(id, version, kunde);
    c.header('ETag', toEtag(neueVersion));
    return c.body(null, 204);
});

// PATCH /rest/kunden/1000  mit "If-Match: \"0\""  => 204 No Content mit neuem ETag
kundeWriteRouter.patch('/:id', rolesRequired('admin'), async (c) => {
    const id = parseId(c.req.param('id'));
    const version = versionFromIfMatch(c.req);
    const kunde = KundePatchSchema.parse(await readJson(c.req));
    const neueVersion = await patch(id, version, kunde);
    c.header('ETag', toEtag(neueVersion));
    return c.body(null, 204);
});

// DELETE /rest/kunden/1000  => 204 No Content (idempotent)
kundeWriteRouter.delete('/:id', rolesRequired('admin'), async (c) => {
    const id = parseId(c.req.param('id'));
    await remove(id);
    return c.body(null, 204);
});
