// Absicherung von Routen: Bearer-Token von Keycloak mit jose validieren und Rollen pruefen.
// Signatur gegen die oeffentlichen Schluessel (JWKS) von Keycloak; Issuer, Audience und Ablauf
// werden von jwtVerify geprueft.
// https://github.com/panva/jose

import { ForbiddenError, UnauthorizedError } from '../errors.mts';
import { type JWTPayload, createRemoteJWKSet, jwtVerify } from 'jose';
import { config } from '../config/config.mts';
import { createMiddleware } from 'hono/factory';
import { getLogger } from '../logger/logger.mts';

export type Rolle = 'admin' | 'user';

/** Payload des Access Tokens von Keycloak (nur die benoetigten Claims) */
export type TokenPayload = JWTPayload & {
    preferred_username?: string;
    resource_access?: Record<string, { roles?: string[] }>;
};

const logger = getLogger('roles-required');

const { url, realm, clientId } = config.keycloak;
const issuer = `${url}/realms/${realm}`;
// JWKS werden von jose gecacht und nur bei unbekannter Key-ID neu geladen
const jwks = createRemoteJWKSet(new URL(`${issuer}/protocol/openid-connect/certs`));

const BEARER = /^Bearer (?<token>\S+)$/u;

const verifyToken = async (token: string): Promise<TokenPayload> => {
    try {
        const { payload } = await jwtVerify<TokenPayload>(token, jwks, {
            issuer,
            audience: clientId,
            algorithms: ['RS256'],
        });
        return payload;
    } catch (err) {
        logger.debug('verifyToken: %s', (err as Error).message);
        throw new UnauthorizedError('Der Token ist ungueltig oder abgelaufen.', { cause: err });
    }
};

/**
 * Middleware: Request nur zulassen, wenn der Token eine der Rollen des Clients enthaelt.
 * @param rollen erlaubte Client-Rollen, z.B. 'admin'
 */
export const rolesRequired = (...rollen: Rolle[]) =>
    createMiddleware(async (c, next) => {
        const token = BEARER.exec(c.req.header('Authorization') ?? '')?.groups?.['token'];
        if (token === undefined) {
            throw new UnauthorizedError('Header "Authorization: Bearer <Token>" fehlt.');
        }

        const payload = await verifyToken(token);
        const tokenRollen = payload.resource_access?.[clientId]?.roles ?? [];
        logger.debug('rolesRequired: user=%s, rollen=%o', payload.preferred_username, tokenRollen);

        if (!rollen.some((rolle) => tokenRollen.includes(rolle))) {
            throw new ForbiddenError(`Erforderliche Rolle: ${rollen.join(' oder ')}`);
        }
        await next();
    });
