// Unit-Test des Write-Service: das Repository (DB-Zugriff) wird mit Vitest gemockt
import { EmailExistsError, NotFoundError, PreconditionFailedError } from '../../errors.mts';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { create, update } from './kunde-write-service.mts';
import {
    type deleteById,
    findIdByEmail,
    findVersionById,
    insert,
    update as updateInDb,
} from '../repository/kunde-repository.mts';

vi.mock(import('../repository/kunde-repository.mts'), () => ({
    deleteById: vi.fn<typeof deleteById>(),
    findIdByEmail: vi.fn<typeof findIdByEmail>(),
    findVersionById: vi.fn<typeof findVersionById>(),
    insert: vi.fn<typeof insert>(),
    update: vi.fn<typeof updateInDb>(),
}));

const kunde = {
    nachname: 'Mock',
    vorname: 'Max',
    email: 'max.mock@acme.de',
    adresse: { strasse: 'Weg', hausnummer: '1', plz: '76133', ort: 'Karlsruhe' },
};

describe('kunde-write-service', () => {
    beforeEach(() => {
        vi.resetAllMocks();
    });

    test('create: neue ID und Preis als numeric-String', async () => {
        vi.mocked(findIdByEmail).mockResolvedValue(undefined);
        vi.mocked(insert).mockResolvedValue(1000);

        const id = await create({
            ...kunde,
            bestellungen: [{ produktname: 'Stift', menge: 1, preis: 2.5 }],
        });

        expect(id).toBe(1000);
        expect(insert).toHaveBeenCalledWith(
            { nachname: 'Mock', vorname: 'Max', email: 'max.mock@acme.de' },
            kunde.adresse,
            [{ produktname: 'Stift', menge: 1, preis: '2.50' }],
        );
    });

    test('create: Email existiert bereits => EmailExistsError', async () => {
        vi.mocked(findIdByEmail).mockResolvedValue(20);
        await expect(create({ ...kunde, bestellungen: [] })).rejects.toThrow(EmailExistsError);
        expect(insert).not.toHaveBeenCalled();
    });

    test('update: aktuelle Version => neue Version', async () => {
        vi.mocked(findIdByEmail).mockResolvedValue(30);
        vi.mocked(updateInDb).mockResolvedValue(4);
        await expect(update(30, 3, kunde)).resolves.toBe(4);
    });

    test('update: veraltete Version => PreconditionFailedError (Lost Update verhindert)', async () => {
        vi.mocked(findIdByEmail).mockResolvedValue(undefined);
        vi.mocked(updateInDb).mockResolvedValue(undefined);
        vi.mocked(findVersionById).mockResolvedValue(5);
        await expect(update(30, 3, kunde)).rejects.toThrow(PreconditionFailedError);
    });

    test('update: Kunde existiert nicht => NotFoundError', async () => {
        vi.mocked(findIdByEmail).mockResolvedValue(undefined);
        vi.mocked(updateInDb).mockResolvedValue(undefined);
        vi.mocked(findVersionById).mockResolvedValue(undefined);
        await expect(update(999, 0, kunde)).rejects.toThrow(NotFoundError);
    });
});
