import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE, createPage, createPageable } from './pageable.mts';
import { describe, expect, test } from 'vitest';
import { BadRequestError } from '../../errors.mts';

describe('createPageable', () => {
    test('ohne Parameter: erste Seite mit Default-Groesse', () => {
        expect(createPageable({})).toStrictEqual({ number: 0, size: DEFAULT_PAGE_SIZE });
    });

    test('page ab 1 in der URL, number ab 0 fuer OFFSET', () => {
        expect(createPageable({ page: '3', size: '10' })).toStrictEqual({ number: 2, size: 10 });
    });

    test('Zahlen aus dem QUERY-Body', () => {
        expect(createPageable({ page: 2, size: 2 })).toStrictEqual({ number: 1, size: 2 });
    });

    test.each(['0', '-1', 'abc', '1.5'])('ungueltige Seite "%s" => BadRequestError', (page) => {
        expect(() => createPageable({ page })).toThrow(BadRequestError);
    });

    test('zu grosse Seite => BadRequestError', () => {
        expect(() => createPageable({ size: MAX_PAGE_SIZE + 1 })).toThrow(BadRequestError);
    });
});

describe('createPage', () => {
    test('Seitennummer ab 1 und Anzahl der Seiten', () => {
        const page = createPage(['a', 'b'], 5, { number: 1, size: 2 });
        expect(page.page).toStrictEqual({ number: 2, size: 2, totalElements: 5, totalPages: 3 });
        expect(page.content).toStrictEqual(['a', 'b']);
    });
});
