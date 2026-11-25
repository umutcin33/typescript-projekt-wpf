// HTTP/2-Client fuer die Integrationstests: Axios mit httpVersion 2.
// Dem selbst-signierten Zertifikat des Appservers wird explizit vertraut (ca), statt die
// TLS-Pruefung abzuschalten.

import { type AxiosResponse, create } from 'axios';
import { readFile } from 'node:fs/promises';

const port = 3000;
export const baseURL = `https://localhost:${port}`;
export const restURL = `${baseURL}/rest/kunden`;

const ca = await readFile(
    new URL('../../src/config/resources/tls/certificate.crt', import.meta.url),
);

export const client = create({
    baseURL: restURL,
    httpVersion: 2,
    http2Options: { ca },
    // Statuscodes werden in den Tests geprueft, nicht als Exception geworfen
    validateStatus: () => true,
});

const authClient = create({
    baseURL: `${baseURL}/auth`,
    httpVersion: 2,
    http2Options: { ca },
    validateStatus: () => true,
});

/** Access Token von Keycloak ueber POST /auth/token holen */
export const getToken = async (username: string, password: string) => {
    const { status, data }: AxiosResponse<{ access_token?: string }> = await authClient.post(
        '/token',
        { username, password },
    );
    if (status !== 200 || typeof data.access_token !== 'string') {
        throw new Error(`Kein Token fuer ${username}: Status ${status}`);
    }
    return data.access_token;
};

export const authHeader = (token: string) => ({ Authorization: `Bearer ${token}` });
