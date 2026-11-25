import { ID_NICHT_VORHANDEN, ID_VORHANDEN } from './testdaten.mts';
import { describe, expect, test } from 'vitest';
import { type KundeDto } from '../../src/kunde/service/kunde-service.mts';
import { type Page } from '../../src/kunde/service/pageable.mts';
import { type ProblemDetails } from '../../src/problem-details.mts';
import { client } from './client.mts';

describe('GET /rest/kunden/:id', () => {
    test('Kunde mit Adresse (1:1) und Bestellungen (1:N) ueber HTTP/2', async () => {
        const { status, headers, data } = await client.get<KundeDto>(`/${ID_VORHANDEN}`);

        expect(status).toBe(200);
        expect(headers['content-type']).toMatch(/application\/json/u);
        expect(headers['etag']).toMatch(/^"\d+"$/u);
        expect(data.id).toBe(ID_VORHANDEN);
        expect(data.adresse?.plz).toMatch(/^\d{5}$/u);
        expect(data.bestellungen.length).toBeGreaterThanOrEqual(1);
        expect(typeof data.bestellungen[0]?.preis).toBe('number');
    });

    test('Bedingter GET mit aktuellem ETag => 304 Not Modified', async () => {
        const { headers } = await client.get(`/${ID_VORHANDEN}`);
        const etag = String(headers['etag']);

        const { status, data } = await client.get(`/${ID_VORHANDEN}`, {
            headers: { 'If-None-Match': etag },
        });

        expect(status).toBe(304);
        expect(data).toBe('');
    });

    test('Bedingter GET mit veraltetem ETag => 200', async () => {
        const { status } = await client.get(`/${ID_VORHANDEN}`, {
            headers: { 'If-None-Match': '"-1"' },
        });
        expect(status).toBe(200);
    });

    test('Nicht vorhandene ID => 404 mit Problem Details', async () => {
        const { status, headers, data } = await client.get<ProblemDetails>(
            `/${ID_NICHT_VORHANDEN}`,
        );

        expect(status).toBe(404);
        expect(headers['content-type']).toMatch(/application\/problem\+json/u);
        expect(data.status).toBe(404);
        expect(data.title).toBe('Not Found');
        expect(data.instance).toBe(`/rest/kunden/${ID_NICHT_VORHANDEN}`);
    });

    test('Ungueltige ID => 404', async () => {
        const { status } = await client.get('/abc');
        expect(status).toBe(404);
    });
});

describe('GET /rest/kunden mit Query-Parametern', () => {
    test('Suche nach Teil des Nachnamens', async () => {
        const { status, data } = await client.get<Page<KundeDto>>('', {
            params: { nachname: 'ue' },
        });

        expect(status).toBe(200);
        expect(data.content.length).toBeGreaterThan(0);
        data.content.forEach(({ nachname }) => {
            expect(nachname.toLowerCase()).toContain('ue');
        });
    });

    test('Suche ueber die Adresse (PLZ-Praefix) mit Pagination', async () => {
        const { status, data } = await client.get<Page<KundeDto>>('', {
            params: { plz: '7', page: 1, size: 2 },
        });

        expect(status).toBe(200);
        expect(data.content).toHaveLength(2);
        expect(data.page.number).toBe(1);
        expect(data.page.size).toBe(2);
        expect(data.page.totalElements).toBeGreaterThan(2);
        data.content.forEach(({ adresse }) => {
            expect(adresse?.plz.startsWith('7')).toBe(true);
        });
    });

    test('Keine Treffer => 404', async () => {
        const { status } = await client.get('', { params: { nachname: 'gibtsnicht' } });
        expect(status).toBe(404);
    });

    test('Unbekannter Suchparameter => 400', async () => {
        const { status, data } = await client.get<ProblemDetails>('', { params: { foo: 'x' } });
        expect(status).toBe(400);
        expect(data.detail).toContain('foo');
    });

    test('Ungueltige Seitengroesse => 400', async () => {
        const { status } = await client.get('', { params: { size: 0 } });
        expect(status).toBe(400);
    });
});

describe('QUERY /rest/kunden', () => {
    test('Suchkriterien und Pagination im Request-Body', async () => {
        const { status, data } = await client.query<Page<KundeDto>>('', {
            ort: 'karlsruhe',
            page: 1,
            size: 5,
        });

        expect(status).toBe(200);
        expect(data.content.length).toBeGreaterThan(0);
        data.content.forEach(({ adresse }) => {
            expect(adresse?.ort).toBe('Karlsruhe');
        });
    });

    test('Kein JSON-Objekt im Body => 400', async () => {
        const { status } = await client.query('', [1, 2], {
            headers: { 'Content-Type': 'application/json' },
        });
        expect(status).toBe(400);
    });
});
