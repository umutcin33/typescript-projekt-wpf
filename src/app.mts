// Hono-App: Middleware, Routen und globale Fehlerbehandlung mit Problem Details (RFC 9457)

import {
    BadRequestError,
    EmailExistsError,
    ForbiddenError,
    NotFoundError,
    PreconditionFailedError,
    PreconditionRequiredError,
    UnauthorizedError,
} from './errors.mts';
import { Hono } from 'hono';
import { type ContentfulStatusCode } from 'hono/utils/http-status';
import { HTTPException } from 'hono/http-exception';
import { ZodError } from 'zod';
import { authRouter } from './security/auth-router.mts';
import { getLogger } from './logger/logger.mts';
import { kundeRouter } from './kunde/router/kunde-router.mts';
import { kundeWriteRouter } from './kunde/router/kunde-write-router.mts';
import { problemDetails } from './problem-details.mts';
import { secureHeaders } from 'hono/secure-headers';

const logger = getLogger('app');

export const paths = {
    kunden: '/rest/kunden',
    auth: '/auth',
} as const;

export const app = new Hono();

app.use(secureHeaders());
app.use(async (c, next) => {
    const start = performance.now();
    await next();
    const ms = Math.round(performance.now() - start);
    logger.debug('%s %s => %d (%d ms)', c.req.method, c.req.path, c.res.status, ms);
});

app.route(paths.kunden, kundeRouter);
app.route(paths.kunden, kundeWriteRouter);
app.route(paths.auth, authRouter);

app.get('/health', (c) => c.json({ status: 'up' }));

app.notFound((c) => problemDetails(c, 404, { detail: `Unbekannter Pfad: ${c.req.path}` }));

/** Fehlerklasse => HTTP-Statuscode */
const statusMapping: [new (...args: never[]) => Error, ContentfulStatusCode][] = [
    [BadRequestError, 400],
    [UnauthorizedError, 401],
    [ForbiddenError, 403],
    [NotFoundError, 404],
    [PreconditionFailedError, 412],
    [EmailExistsError, 422],
    [PreconditionRequiredError, 428],
];

// Globaler Error Handler: alle Fehler als "application/problem+json"
app.onError((err, c) => {
    if (err instanceof ZodError) {
        return problemDetails(c, 422, {
            detail: 'Die Daten im Request-Body sind ungueltig.',
            errors: err.issues.map(({ path, message, code }) => ({
                path: path.join('.'),
                message,
                code,
            })),
        });
    }

    const status = statusMapping.find(([ErrorClass]) => err instanceof ErrorClass)?.[1];
    if (status !== undefined) {
        logger.debug('onError: %s %s', err.name, err.message);
        if (status === 401) {
            c.header('WWW-Authenticate', 'Bearer');
        }
        return problemDetails(c, status, { detail: err.message });
    }

    if (err instanceof HTTPException) {
        return problemDetails(c, err.status as ContentfulStatusCode, { detail: err.message });
    }

    logger.error(err, 'Interner Fehler');
    return problemDetails(c, 500, { detail: 'Interner Fehler' });
});
