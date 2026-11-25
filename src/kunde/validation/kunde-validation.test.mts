import { KundeNeuSchema, KundePatchSchema, SuchkriterienSchema } from './kunde-validation.mts';
import { describe, expect, test } from 'vitest';

const kundeNeu = {
    nachname: 'Neu',
    vorname: 'Nina',
    email: 'nina.neu@acme.de',
    geburtsdatum: '2001-02-03',
    adresse: { strasse: 'Weg', hausnummer: '1', plz: '76133', ort: 'Karlsruhe' },
    bestellungen: [{ produktname: 'Stift', menge: 3, preis: 1.99 }],
};

describe('KundeNeuSchema', () => {
    test('gueltiger Kunde', () => {
        expect(KundeNeuSchema.safeParse(kundeNeu).success).toBe(true);
    });

    test('Bestellungen sind optional', () => {
        const { bestellungen: _, ...ohneBestellungen } = kundeNeu;
        expect(KundeNeuSchema.parse(ohneBestellungen).bestellungen).toStrictEqual([]);
    });

    test('ungueltige Email, PLZ, Menge und Preis', () => {
        const result = KundeNeuSchema.safeParse({
            ...kundeNeu,
            email: 'keine-email',
            adresse: { ...kundeNeu.adresse, plz: '7613' },
            bestellungen: [{ produktname: 'Stift', menge: 0, preis: -1 }],
        });
        expect(result.success).toBe(false);
        const pfade = result.error?.issues.map(({ path }) => path.join('.'));
        expect(pfade).toStrictEqual(
            expect.arrayContaining([
                'email',
                'adresse.plz',
                'bestellungen.0.menge',
                'bestellungen.0.preis',
            ]),
        );
    });

    test('unbekannte Felder werden abgelehnt', () => {
        expect(KundeNeuSchema.safeParse({ ...kundeNeu, version: 5 }).success).toBe(false);
    });
});

describe('KundePatchSchema', () => {
    test('einzelnes Feld', () => {
        expect(KundePatchSchema.safeParse({ adresse: { ort: 'Bruchsal' } }).success).toBe(true);
    });

    test('leerer Body ist ungueltig', () => {
        expect(KundePatchSchema.safeParse({}).success).toBe(false);
    });
});

describe('SuchkriterienSchema', () => {
    test('PLZ-Praefix und unbekannter Parameter', () => {
        expect(SuchkriterienSchema.safeParse({ plz: '76' }).success).toBe(true);
        expect(SuchkriterienSchema.safeParse({ foo: 'bar' }).success).toBe(false);
    });
});
