// oxlint-disable max-classes-per-file -- bewusst alle Fehlerklassen zentral in einer Datei
// Fachliche und technische Fehler. Die Abbildung auf HTTP-Statuscodes und Problem Details
// erfolgt zentral im globalen Error Handler (src/app.mts).

/** 400: z.B. kein gueltiges JSON im Request-Body */
export class BadRequestError extends Error {
    override name = 'BadRequestError';
}

/** 401: kein oder ungueltiger Token */
export class UnauthorizedError extends Error {
    override name = 'UnauthorizedError';
}

/** 403: Token gueltig, aber erforderliche Rolle fehlt */
export class ForbiddenError extends Error {
    override name = 'ForbiddenError';
}

/** 404: kein Kunde mit der ID bzw. zu den Suchkriterien */
export class NotFoundError extends Error {
    override name = 'NotFoundError';
}

/** 412: Versionsnummer im Header "If-Match" ist ungueltig oder veraltet */
export class PreconditionFailedError extends Error {
    override name = 'PreconditionFailedError';
}

/** 422: Email-Adresse ist bereits vergeben */
export class EmailExistsError extends Error {
    override name = 'EmailExistsError';

    constructor(email: string) {
        super(`Die Email-Adresse ${email} existiert bereits.`);
    }
}

/** 428: Header "If-Match" fehlt bei PUT/PATCH */
export class PreconditionRequiredError extends Error {
    override name = 'PreconditionRequiredError';
}
