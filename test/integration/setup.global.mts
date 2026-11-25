// Vor den Integrationstests pruefen, ob der Appserver per HTTP/2 erreichbar ist
import { baseURL, client } from './client.mts';

// oxlint-disable-next-line import/no-default-export
export default async function setup() {
    try {
        await client.get(`${baseURL}/health`);
    } catch (err) {
        throw new Error(
            `Der Appserver ist unter ${baseURL} nicht erreichbar. Zuerst "docker compose" und "pnpm start" ausfuehren.`,
            { cause: err },
        );
    }
}
