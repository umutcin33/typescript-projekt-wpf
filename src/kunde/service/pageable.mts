// Pagination: Seitennummer (ab 1, wie in der URL) und Seitengroesse aus Query-Parametern

import { BadRequestError } from '../../errors.mts';

export const DEFAULT_PAGE_SIZE = 5;
export const MAX_PAGE_SIZE = 100;

/** Seite fuer die DB-Abfrage: number beginnt bei 0 (OFFSET = number * size) */
export type Pageable = {
    readonly number: number;
    readonly size: number;
};

/** Ergebnis-Seite fuer den Client (Seitennummer ab 1) */
export type Page<T> = {
    readonly content: readonly T[];
    readonly page: {
        readonly number: number;
        readonly size: number;
        readonly totalElements: number;
        readonly totalPages: number;
    };
};

const POSITIVE_INT = /^[1-9]\d{0,5}$/u;

const toPositiveInt = (value: unknown, name: string, defaultValue: number) => {
    if (value === undefined || value === '') {
        return defaultValue;
    }
    const str = String(value);
    if (!POSITIVE_INT.test(str)) {
        throw new BadRequestError(`Der Parameter "${name}" muss eine positive Ganzzahl sein.`);
    }
    return Number(str);
};

/**
 * Pageable aus den Parametern "page" (ab 1) und "size" erzeugen.
 * @throws BadRequestError bei ungueltigen Werten
 */
export const createPageable = ({ page, size }: { page?: unknown; size?: unknown }): Pageable => {
    const number = toPositiveInt(page, 'page', 1) - 1;
    const sizeInt = toPositiveInt(size, 'size', DEFAULT_PAGE_SIZE);
    if (sizeInt > MAX_PAGE_SIZE) {
        throw new BadRequestError(`Der Parameter "size" darf maximal ${MAX_PAGE_SIZE} sein.`);
    }
    return { number, size: sizeInt };
};

export const createPage = <T,>(
    content: readonly T[],
    totalElements: number,
    { number, size }: Pageable,
): Page<T> => ({
    content,
    page: {
        number: number + 1,
        size,
        totalElements,
        totalPages: Math.ceil(totalElements / size),
    },
});
