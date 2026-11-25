// Problem Details fuer HTTP APIs gemaess RFC 9457
// https://www.rfc-editor.org/rfc/rfc9457.html

import { type Context } from 'hono';
import { type ContentfulStatusCode } from 'hono/utils/http-status';

export const PROBLEM_JSON = 'application/problem+json';

const titles: Record<number, string> = {
    400: 'Bad Request',
    401: 'Unauthorized',
    403: 'Forbidden',
    404: 'Not Found',
    406: 'Not Acceptable',
    412: 'Precondition Failed',
    415: 'Unsupported Media Type',
    422: 'Unprocessable Content',
    428: 'Precondition Required',
    500: 'Internal Server Error',
};

/** Aufbau eines Problem-Details-Objekts (RFC 9457, Abschnitt 3.1) */
export type ProblemDetails = {
    /** URI des Problemtyps; "about:blank" = nur der HTTP-Statuscode ist relevant */
    readonly type: string;
    readonly title: string;
    readonly status: number;
    readonly detail?: string;
    /** URI des Requests, bei dem das Problem aufgetreten ist */
    readonly instance: string;
    /** Erweiterung: Validierungsfehler von Zod */
    readonly errors?: readonly unknown[];
};

type ProblemOptions = {
    readonly detail?: string | undefined;
    readonly errors?: readonly unknown[] | undefined;
};

/**
 * Response mit Content-Type "application/problem+json" erzeugen.
 * @param c Hono-Context
 * @param status HTTP-Statuscode (4xx oder 5xx)
 * @param options optionale Detailbeschreibung und Validierungsfehler
 */
export const problemDetails = (
    c: Context,
    status: ContentfulStatusCode,
    { detail, errors }: ProblemOptions = {},
): Response => {
    const body: ProblemDetails = {
        type: 'about:blank',
        title: titles[status] ?? 'Error',
        status,
        ...(detail === undefined ? {} : { detail }),
        instance: new URL(c.req.url).pathname,
        ...(errors === undefined ? {} : { errors }),
    };
    return c.body(JSON.stringify(body), status, { 'Content-Type': PROBLEM_JSON });
};
