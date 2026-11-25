import { NotFoundError, PreconditionFailedError } from '../../errors.mts';
import { describe, expect, test } from 'vitest';
import { matchesIfNoneMatch, parseEtag, parseId, parseIfMatch, toEtag } from './http-helper.mts';

describe('parseId', () => {
    test('gueltige ID', () => {
        expect(parseId('1000')).toBe(1000);
    });

    test.each(['0', '-1', 'abc', '1e3', undefined])('ungueltige ID "%s" => 404', (id) => {
        expect(() => parseId(id)).toThrow(NotFoundError);
    });
});

describe('ETag', () => {
    test('Version als ETag in Anfuehrungszeichen', () => {
        expect(toEtag(3)).toBe('"3"');
    });

    test('ETag lesen, auch schwacher ETag', () => {
        expect(parseEtag('"3"')).toBe(3);
        expect(parseEtag('W/"3"')).toBe(3);
        expect(parseEtag('3')).toBeUndefined();
    });

    test('If-None-Match mit passender Version, Liste oder *', () => {
        expect(matchesIfNoneMatch('"2"', 2)).toBe(true);
        expect(matchesIfNoneMatch('"1", "2"', 2)).toBe(true);
        expect(matchesIfNoneMatch('*', 2)).toBe(true);
        expect(matchesIfNoneMatch('"1"', 2)).toBe(false);
        expect(matchesIfNoneMatch(undefined, 2)).toBe(false);
    });

    test('If-Match: nur starke ETags', () => {
        expect(parseIfMatch('"7"')).toBe(7);
        expect(() => parseIfMatch('W/"7"')).toThrow(PreconditionFailedError);
        expect(() => parseIfMatch('7')).toThrow(PreconditionFailedError);
    });
});
