// Validierung der Request-Bodies und Suchparameter mit Zod
// https://zod.dev

import { z } from 'zod';

const MAX_NAME = 40;

export const AdresseSchema = z.strictObject({
    strasse: z.string().trim().min(1).max(MAX_NAME),
    hausnummer: z.string().trim().min(1).max(10),
    plz: z.string().regex(/^\d{5}$/u, 'Die PLZ muss aus genau 5 Ziffern bestehen.'),
    ort: z.string().trim().min(1).max(MAX_NAME),
});

export const BestellungSchema = z.strictObject({
    produktname: z.string().trim().min(1).max(80),
    menge: z.number().int().positive(),
    preis: z.number().nonnegative().multipleOf(0.01),
    bestelldatum: z.iso.date().optional(),
});

const kundeFelder = {
    nachname: z.string().trim().min(1).max(MAX_NAME),
    vorname: z.string().trim().min(1).max(MAX_NAME),
    email: z.email(),
    geburtsdatum: z.iso.date().nullable().optional(),
};

/** POST: neuer Kunde mit Adresse (1:1) und optional Bestellungen (1:N) */
export const KundeNeuSchema = z.strictObject({
    ...kundeFelder,
    adresse: AdresseSchema,
    bestellungen: z.array(BestellungSchema).default([]),
});

/** PUT: Kunde einschliesslich Adresse vollstaendig ersetzen (ohne Bestellungen) */
export const KundeUpdateSchema = z.strictObject({
    ...kundeFelder,
    adresse: AdresseSchema,
});

/** PATCH: einzelne Felder aendern; mindestens ein Feld muss vorhanden sein */
export const KundePatchSchema = z
    .strictObject({
        ...kundeFelder,
        adresse: AdresseSchema.partial(),
    })
    .partial()
    .refine((patch) => Object.keys(patch).length > 0, 'Es wurde kein Feld zum Aendern angegeben.');

/** Suchkriterien fuer GET mit Query-Parametern und fuer QUERY mit Request-Body */
export const SuchkriterienSchema = z.strictObject({
    nachname: z.string().min(1).optional(),
    vorname: z.string().min(1).optional(),
    email: z.string().min(1).optional(),
    plz: z
        .string()
        .regex(/^\d{1,5}$/u)
        .optional(),
    ort: z.string().min(1).optional(),
});

export type KundeNeu = z.infer<typeof KundeNeuSchema>;
export type KundeUpdate = z.infer<typeof KundeUpdateSchema>;
export type KundePatch = z.infer<typeof KundePatchSchema>;
export type Adresse = z.infer<typeof AdresseSchema>;
export type Suchkriterien = z.infer<typeof SuchkriterienSchema>;
