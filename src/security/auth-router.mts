// Hilfsendpunkt fuer Clients (z.B. Bruno, Tests): Benutzername und Passwort gegen einen
// Access Token von Keycloak tauschen (OAuth 2.0 "Resource Owner Password Credentials").

import { BadRequestError, UnauthorizedError } from '../errors.mts';
import { Hono } from 'hono';
import { config } from '../config/config.mts';
import { getLogger } from '../logger/logger.mts';
import { z } from 'zod';

export const authRouter = new Hono();

const logger = getLogger('auth-router');

const { url, realm, clientId, clientSecret } = config.keycloak;
const tokenUrl = `${url}/realms/${realm}/protocol/openid-connect/token`;

const LoginSchema = z.object({
    username: z.string().min(1),
    password: z.string().min(1),
});

// POST /auth/token  { "username": "admin", "password": "p" }
authRouter.post('/token', async (c) => {
    const body: unknown = await c.req.json().catch(() => {
        throw new BadRequestError('Der Request-Body ist kein gueltiges JSON.');
    });
    const { username, password } = LoginSchema.parse(body);
    logger.debug('token: username=%s', username);

    const response = await fetch(tokenUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
            grant_type: 'password',
            client_id: clientId,
            client_secret: clientSecret,
            username,
            password,
        }),
    });
    if (!response.ok) {
        throw new UnauthorizedError('Benutzername oder Passwort ist falsch.');
    }
    return c.json(await response.json());
});
