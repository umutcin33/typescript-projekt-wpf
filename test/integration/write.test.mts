import { ID_NICHT_VORHANDEN, kundeAnlegen, neuerKunde } from './testdaten.mts';
import { authHeader, client, getToken } from './client.mts';
import { beforeAll, describe, expect, test } from 'vitest';
import { type KundeDto } from '../../src/kunde/service/kunde-service.mts';
import { type ProblemDetails } from '../../src/problem-details.mts';

let admin: string;
let user: string;

beforeAll(async () => {
    [admin, user] = await Promise.all([getToken('admin', 'p'), getToken('user', 'p')]);
});

const ohneBestellungen = (kunde: ReturnType<typeof neuerKunde>) => {
    const { bestellungen: _, ...rest } = kunde;
    return rest;
};

describe('POST /rest/kunden', () => {
    test('Neuer Kunde => 201 mit Location; Daten inkl. Beziehungen gespeichert', async () => {
        const kunde = neuerKunde();
        const { status, headers } = await client.post('', kunde, { headers: authHeader(admin) });

        expect(status).toBe(201);
        const location = String(headers['location']);
        expect(location).toMatch(/\/rest\/kunden\/\d+$/u);

        const { data } = await client.get<KundeDto>(location);
        expect(data.email).toBe(kunde.email);
        expect(data.version).toBe(0);
        expect(data.adresse?.ort).toBe('Karlsruhe');
        expect(data.bestellungen.map(({ preis }) => preis)).toStrictEqual([7.49, 12]);
        expect(data.erzeugt).toBe(data.aktualisiert);
    });

    test('Ungueltige Daten => 422 mit Validierungsfehlern', async () => {
        const kunde = { ...neuerKunde(), email: 'falsch', adresse: { plz: '123' } };
        const { status, headers, data } = await client.post<ProblemDetails>('', kunde, {
            headers: authHeader(admin),
        });

        expect(status).toBe(422);
        expect(headers['content-type']).toMatch(/application\/problem\+json/u);
        expect(data.errors?.length).toBeGreaterThan(0);
    });

    test('Kein JSON => 400', async () => {
        const { status } = await client.post('', '{kaputt', {
            headers: { ...authHeader(admin), 'Content-Type': 'application/json' },
            // Body unveraendert senden; sonst macht Axios daraus den JSON-String "{kaputt"
            transformRequest: [(data: unknown) => data],
        });
        expect(status).toBe(400);
    });

    test('Email existiert bereits => 422', async () => {
        const kunde = neuerKunde();
        await kundeAnlegen(admin, kunde);
        const { status, data } = await client.post<ProblemDetails>('', kunde, {
            headers: authHeader(admin),
        });
        expect(status).toBe(422);
        expect(data.detail).toContain(kunde.email);
    });
});

describe('Security', () => {
    test('Ohne Token => 401', async () => {
        const { status, headers } = await client.post('', neuerKunde());
        expect(status).toBe(401);
        expect(headers['www-authenticate']).toBe('Bearer');
    });

    test('Ungueltiger Token => 401', async () => {
        const { status } = await client.post('', neuerKunde(), {
            headers: authHeader('ungueltig.token.xyz'),
        });
        expect(status).toBe(401);
    });

    test('Token ohne Rolle "admin" => 403', async () => {
        const { status } = await client.post('', neuerKunde(), { headers: authHeader(user) });
        expect(status).toBe(403);
    });

    test('Falsches Passwort => 401', async () => {
        await expect(getToken('admin', 'falsch')).rejects.toThrow('401');
    });
});

describe('PUT und PATCH /rest/kunden/:id mit If-Match', () => {
    test('PUT mit aktueller Version => 204 und neue Version als ETag', async () => {
        const kunde = neuerKunde();
        const id = await kundeAnlegen(admin, kunde);

        const { status, headers } = await client.put(
            `/${id}`,
            { ...ohneBestellungen(kunde), nachname: 'Geaendert' },
            { headers: { ...authHeader(admin), 'If-Match': '"0"' } },
        );

        expect(status).toBe(204);
        expect(headers['etag']).toBe('"1"');
        const { data } = await client.get<KundeDto>(`/${id}`);
        expect(data.nachname).toBe('Geaendert');
        expect(data.version).toBe(1);
        expect(new Date(data.aktualisiert).getTime()).toBeGreaterThan(
            new Date(data.erzeugt).getTime(),
        );
    });

    test('Lost Update: zweiter PUT mit veralteter Version => 412', async () => {
        const kunde = neuerKunde();
        const id = await kundeAnlegen(admin, kunde);
        const headers = { ...authHeader(admin), 'If-Match': '"0"' };
        const body = ohneBestellungen(kunde);

        const erster = await client.put(`/${id}`, { ...body, vorname: 'Erster' }, { headers });
        const zweiter = await client.put(`/${id}`, { ...body, vorname: 'Zweiter' }, { headers });

        expect(erster.status).toBe(204);
        expect(zweiter.status).toBe(412);
        const { data } = await client.get<KundeDto>(`/${id}`);
        expect(data.vorname).toBe('Erster');
    });

    test('Ohne If-Match => 428', async () => {
        const kunde = neuerKunde();
        const id = await kundeAnlegen(admin, kunde);
        const { status, data } = await client.put<ProblemDetails>(
            `/${id}`,
            ohneBestellungen(kunde),
            { headers: authHeader(admin) },
        );
        expect(status).toBe(428);
        expect(data.title).toBe('Precondition Required');
    });

    test('Ungueltiges If-Match => 412', async () => {
        const kunde = neuerKunde();
        const id = await kundeAnlegen(admin, kunde);
        const { status } = await client.put(`/${id}`, ohneBestellungen(kunde), {
            headers: { ...authHeader(admin), 'If-Match': 'abc' },
        });
        expect(status).toBe(412);
    });

    test('PUT bei nicht vorhandener ID => 404', async () => {
        const { status } = await client.put(
            `/${ID_NICHT_VORHANDEN}`,
            ohneBestellungen(neuerKunde()),
            { headers: { ...authHeader(admin), 'If-Match': '"0"' } },
        );
        expect(status).toBe(404);
    });

    test('PATCH aendert nur einzelne Felder (auch der Adresse)', async () => {
        const kunde = neuerKunde();
        const id = await kundeAnlegen(admin, kunde);

        const { status, headers } = await client.patch(
            `/${id}`,
            { adresse: { ort: 'Bruchsal', plz: '76646' } },
            { headers: { ...authHeader(admin), 'If-Match': '"0"' } },
        );

        expect(status).toBe(204);
        expect(headers['etag']).toBe('"1"');
        const { data } = await client.get<KundeDto>(`/${id}`);
        expect(data.adresse?.ort).toBe('Bruchsal');
        expect(data.adresse?.strasse).toBe(kunde.adresse.strasse);
        expect(data.nachname).toBe(kunde.nachname);
    });

    test('PATCH mit ungueltigen Daten => 422', async () => {
        const id = await kundeAnlegen(admin);
        const { status } = await client.patch(
            `/${id}`,
            { adresse: { plz: 'abc' } },
            { headers: { ...authHeader(admin), 'If-Match': '"0"' } },
        );
        expect(status).toBe(422);
    });
});

describe('DELETE /rest/kunden/:id', () => {
    test('Loeschen => 204, danach 404', async () => {
        const id = await kundeAnlegen(admin);

        const { status } = await client.delete(`/${id}`, { headers: authHeader(admin) });
        expect(status).toBe(204);

        const get = await client.get(`/${id}`);
        expect(get.status).toBe(404);
    });

    test('Nicht vorhandene ID => 204 (idempotent)', async () => {
        const { status } = await client.delete(`/${ID_NICHT_VORHANDEN}`, {
            headers: authHeader(admin),
        });
        expect(status).toBe(204);
    });

    test('Loeschen nur mit Rolle "admin" => 403', async () => {
        const { status } = await client.delete(`/${ID_NICHT_VORHANDEN}`, {
            headers: authHeader(user),
        });
        expect(status).toBe(403);
    });
});
