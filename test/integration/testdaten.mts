// Testdaten fuer die Integrationstests

import { authHeader, client } from './client.mts';
import { type KundeNeu } from '../../src/kunde/validation/kunde-validation.mts';

/** Kunden aus extras/compose/postgres/csv/kunde.csv */
export const ID_VORHANDEN = 20;
export const ID_NICHT_VORHANDEN = 999_999;

/** Neuer Kunde mit eindeutiger Email-Adresse */
export const neuerKunde = (): KundeNeu => ({
    nachname: 'Integration',
    vorname: 'Ines',
    email: `ines.${Date.now()}.${Math.trunc(Math.random() * 1000)}@acme.de`,
    geburtsdatum: '1995-05-05',
    adresse: { strasse: 'Teststrasse', hausnummer: '9', plz: '76131', ort: 'Karlsruhe' },
    bestellungen: [
        { produktname: 'Kaffee', menge: 2, preis: 7.49 },
        { produktname: 'Tasse', menge: 1, preis: 12 },
    ],
});

/** Kunden per POST anlegen und die ID aus dem Header "Location" liefern */
export const kundeAnlegen = async (token: string, kunde: KundeNeu = neuerKunde()) => {
    const { status, headers } = await client.post('', kunde, { headers: authHeader(token) });
    if (status !== 201) {
        throw new Error(`POST fehlgeschlagen: ${status}`);
    }
    const id = String(headers['location']).split('/').at(-1);
    return Number(id);
};
