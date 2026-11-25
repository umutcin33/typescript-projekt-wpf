# TypeScript-Projekt: Kundenverwaltung

Projekt im Wahlpflichtfach _KI-gestützte Serverentwicklung_ (Prof. Zimmermann,
Hochschule Karlsruhe), Abgabe 26.11.2026. Einzelprojekt.

REST-Appserver mit **Hono über HTTP/2**, **Drizzle** und **PostgreSQL 18**,
abgesichert durch **Keycloak**. Domäne:

| Tabelle      | Beziehung                      | Felder                                                                                  |
| ------------ | ------------------------------ | --------------------------------------------------------------------------------------- |
| `kunde`      | –                              | id (Identity), version, nachname, vorname, email (unique), geburtsdatum, erzeugt, aktualisiert |
| `adresse`    | **1:1** zu kunde (unique FK)   | strasse, hausnummer, plz (5 Ziffern), ort                                               |
| `bestellung` | **1:N** zu kunde               | produktname, menge (> 0), preis (numeric ≥ 0), bestelldatum                             |

## Inhalt

- [Voraussetzungen](#voraussetzungen)
- [Start](#start)
- [Token von Keycloak](#token-von-keycloak)
- [Endpunkte](#endpunkte)
- [Tests, Lint und Format](#tests-lint-und-format)
- [Drizzle-Code generieren](#drizzle-code-generieren)
- [Projektstruktur](#projektstruktur)
- [Checkliste](#checkliste)

## Voraussetzungen

- Node 26.13.1 und pnpm 12.21.0 (wird durch `engines` und `pmOnFail: error` geprüft)
- Docker Desktop

## Start

```powershell
# 1. Infrastruktur: PostgreSQL (Port 5434), pgAdmin (8889), Keycloak (8880)
docker compose -f extras/compose/compose.yml up -d

# 2. Abhängigkeiten installieren und .env anlegen
pnpm install
Copy-Item .env.example .env

# 3. Appserver starten: https://localhost:3000 (HTTP/2 mit TLS 1.3)
pnpm start
```

- **Schema und Beispieldaten:** Beim _ersten_ Start des Postgres-Containers werden die
  Skripte in [extras/compose/postgres/init](extras/compose/postgres/init) ausgeführt:
  DB-User und DB `kunde` anlegen, Tabellen anlegen und Beispieldaten aus
  [extras/compose/postgres/csv](extras/compose/postgres/csv) per `COPY` laden.
  Ein separater Migrations-Schritt ist nicht notwendig.
- **DB zurücksetzen:** `docker compose -f extras/compose/compose.yml down -v` löscht das
  Volume; beim nächsten `up` werden Schema und Daten neu angelegt.
- **DB-Browser:** pgAdmin unter <http://localhost:8889> (Server `kunde` ist vorkonfiguriert,
  Passwort `p`) oder Drizzle Studio mit `pnpm db:studio`.
- **Keycloak-Admin-Konsole:** <http://localhost:8880/admin> mit `admin` / `p`.
- Die Ports 5434/8889/8880 sind bewusst keine Standardports, um Konflikte mit anderen
  lokalen Containern zu vermeiden.

Das Zertifikat in [src/config/resources/tls](src/config/resources/tls) ist selbst-signiert
für `localhost` (nur für die Entwicklung). Clients müssen ihm vertrauen oder die
Zertifikatsprüfung abschalten (z.B. `--insecure` bei Bruno).

## Token von Keycloak

Realm `kunde`, Client `kunde-client` (confidential, Password Grant), Client-Rollen
`admin` und `user`:

| User    | Passwort | Rollen          |
| ------- | -------- | --------------- |
| `admin` | `p`      | `admin`, `user` |
| `user`  | `p`      | `user`          |

Variante 1 über den Appserver:

```powershell
$token = (Invoke-RestMethod -Method Post -Uri https://localhost:3000/auth/token `
    -ContentType application/json -Body '{"username":"admin","password":"p"}' `
    -SkipCertificateCheck).access_token
```

Variante 2 direkt bei Keycloak:

```powershell
$token = (Invoke-RestMethod -Method Post `
    -Uri http://localhost:8880/realms/kunde/protocol/openid-connect/token `
    -Body @{ grant_type = 'password'; client_id = 'kunde-client'
             client_secret = 'i7Q2rTMwWzuOZ6WHA-G-i_XZfT5oIjjQ'
             username = 'admin'; password = 'p' }).access_token
```

(`-SkipCertificateCheck` erfordert PowerShell 7.) Der Token wird als
`Authorization: Bearer <token>` gesendet.

Der Realm wird beim Start des Containers aus
[keycloak/realm/kunde-realm.json](extras/compose/keycloak/realm/kunde-realm.json)
importiert und ist damit reproduzierbar. Zusätzlich liegt ein mit `kc.sh export`
erzeugter Export in
[keycloak/kunde-realm-export.json](extras/compose/keycloak/kunde-realm-export.json).

## Endpunkte

Basis-URL: `https://localhost:3000`

| Methode | Pfad                 | Rolle   | Beschreibung                                                                 | Status                    |
| ------- | -------------------- | ------- | ---------------------------------------------------------------------------- | ------------------------- |
| GET     | `/rest/kunden/:id`   | –       | Kunde mit Adresse und Bestellungen, Header `ETag`; `If-None-Match` ⇒ 304     | 200, 304, 404             |
| GET     | `/rest/kunden`       | –       | Suche mit Query-Parametern `nachname`, `vorname`, `email`, `plz` (Präfix), `ort` sowie `page` (ab 1) und `size` (max. 100) | 200, 400, 404 |
| QUERY   | `/rest/kunden`       | –       | wie GET, Suchkriterien und `page`/`size` als JSON im Request-Body            | 200, 400, 404             |
| POST    | `/rest/kunden`       | `admin` | Kunde mit Adresse und Bestellungen anlegen, Header `Location`                | 201, 400, 401, 403, 422   |
| PUT     | `/rest/kunden/:id`   | `admin` | Kunde inkl. Adresse ersetzen, Header `If-Match: "<version>"`, neuer `ETag`   | 204, 401, 403, 404, 412, 422, 428 |
| PATCH   | `/rest/kunden/:id`   | `admin` | einzelne Felder (auch der Adresse) ändern, `If-Match` wie bei PUT            | 204, 401, 403, 404, 412, 422, 428 |
| DELETE  | `/rest/kunden/:id`   | `admin` | Kunde löschen (Adresse und Bestellungen per `ON DELETE CASCADE`)             | 204, 401, 403             |
| POST    | `/auth/token`        | –       | `{ "username", "password" }` ⇒ Access Token von Keycloak                     | 200, 401                  |
| GET     | `/health`            | –       | Health Check                                                                 | 200                       |

Alle Fehler werden als **Problem Details (RFC 9457)** mit
`Content-Type: application/problem+json` geliefert, z.B.:

```json
{
  "type": "about:blank",
  "title": "Precondition Failed",
  "status": 412,
  "detail": "Die Version 0 ist nicht aktuell; aktuelle Version: 1.",
  "instance": "/rest/kunden/1000"
}
```

## Tests, Lint und Format

```powershell
pnpm test:unit          # Unit-Tests ohne DB und Server
pnpm test:integration   # Integrationstests per HTTP/2 (Container und "pnpm start" muessen laufen)
pnpm test               # beides
pnpm lint               # oxlint
pnpm fmt:check          # oxfmt (pnpm fmt formatiert)
pnpm tsc                # Typprüfung
```

**Bruno:** Die Kollektion [extras/bruno/kunde](extras/bruno/kunde) in Bruno öffnen, das
Environment `localhost` wählen, in den Einstellungen _SSL/TLS Certificate Verification_
ausschalten und die Ordner der Reihe nach ausführen (zuerst `01-token`). Alternativ per
CLI:

```powershell
cd extras/bruno/kunde
pnpm dlx @usebruno/cli@2 run --env localhost --insecure -r
```

Die Methode QUERY ist in Bruno nicht enthalten; sie wird durch die Integrationstests
abgedeckt.

## Drizzle-Code generieren

Der Drizzle-Code wird aus der laufenden DB erzeugt und **nicht** von Hand geschrieben:

```powershell
pnpm db:pull
```

Das führt `drizzle-kit pull` aus ([drizzle.config.ts](drizzle.config.ts)) und übernimmt
das Ergebnis mit [scripts/drizzle-copy.mts](scripts/drizzle-copy.mts) nach
[src/db/schema.mts](src/db/schema.mts) und [src/db/relations.mts](src/db/relations.mts)
(Endung `.mts`, sprechende Namen wie `kundeTable` statt `kundeInKunde`, ohne ungenutzte
Imports).

## Projektstruktur

```text
extras/
  bruno/kunde/             Bruno-Kollektion
  compose/compose.yml      PostgreSQL, pgAdmin, Keycloak
  compose/postgres/        Init-Skripte (SQL) und Beispieldaten (CSV)
  compose/keycloak/        Realm-Import und Realm-Export
scripts/drizzle-copy.mts   generierten Drizzle-Code nach src/db übernehmen
src/
  index.mts                Start: HTTP/2-Server (node:http2 + @hono/node-server)
  app.mts                  Hono-App, Routen, globaler Error Handler
  problem-details.mts      RFC 9457
  errors.mts               Fehlerklassen
  config/                  config.toml + Zod, DB-Pool + Drizzle, TLS-Zertifikat
  db/                      generiert: schema.mts, relations.mts
  logger/                  Pino
  security/                Keycloak-Token mit jose, /auth/token
  kunde/router/            HTTP: Pfad/Query-Parameter, ETag, If-Match, Location
  kunde/service/           Fachlogik, Pagination
  kunde/repository/        DB-Zugriff mit Drizzle
  kunde/validation/        Zod-Schemas
test/integration/          Vitest + Axios (HTTP/2)
```

## Checkliste

| Punkt der Checkliste | Umsetzung |
| --- | --- |
| Node 26.13.1, pnpm 12.21.0 | `engines`/`devEngines` in [package.json](package.json), `pmOnFail: error` in [pnpm-workspace.yaml](pnpm-workspace.yaml) |
| PostgreSQL 18 als Docker-Container | [extras/compose/compose.yml](extras/compose/compose.yml) |
| 1:1- und 1:N-Beziehung | [02-create-table.sql](extras/compose/postgres/init/02-create-table.sql): `adresse.kunde_id UNIQUE`, `bestellung.kunde_id` |
| DB-Browser | pgAdmin (Port 8889) und Drizzle Studio (`pnpm db:studio`) |
| Keycloak: 1 Realm, 1 Client, User, Rolle | Realm `kunde`, Client `kunde-client`, Rollen `admin`/`user`, User `admin`/`user`: [kunde-realm.json](extras/compose/keycloak/realm/kunde-realm.json), Export: [kunde-realm-export.json](extras/compose/keycloak/kunde-realm-export.json) |
| Generierter Drizzle-Code (schema.mts, relations.mts) | `pnpm db:pull` ⇒ [src/db/schema.mts](src/db/schema.mts), [src/db/relations.mts](src/db/relations.mts) |
| Commit early, commit often | Git-Historie mit kleinen Schritten |
| package.json und pnpm | [package.json](package.json), [pnpm-lock.yaml](pnpm-lock.yaml) |
| oxlint und oxfmt mit Konfiguration | [oxlint.config.mts](oxlint.config.mts), [oxfmt.config.mts](oxfmt.config.mts), Scripts `lint`, `fmt`, `fmt:check` |
| TypeScript State-of-the-Art | ESM mit `.mts`, Node Type Stripping (ohne Build), TS 7, `@tsconfig/strictest` in [tsconfig.json](tsconfig.json), Top-Level `await`, Zod-Typinferenz |
| Hono einschl. HTTP/2 | [src/index.mts](src/index.mts): `createSecureServer`, TLS 1.3 |
| GET mit Pfad- und Query-Parametern | [kunde-router.mts](src/kunde/router/kunde-router.mts): `/:id` sowie `?nachname=&plz=&page=&size=` |
| Bedingte GET-Requests (If-None-Match) | `ETag` aus `version`, 304 in [kunde-router.mts](src/kunde/router/kunde-router.mts) |
| POST mit Zod und Location | [kunde-write-router.mts](src/kunde/router/kunde-write-router.mts), [kunde-validation.mts](src/kunde/validation/kunde-validation.mts) |
| PUT/PATCH mit Zod und If-Match | [kunde-write-router.mts](src/kunde/router/kunde-write-router.mts): 428 ohne, 412 bei veralteter/ungültiger Version |
| QUERY, DELETE | [kunde-router.mts](src/kunde/router/kunde-router.mts) (`kundeRouter.query`), [kunde-write-router.mts](src/kunde/router/kunde-write-router.mts) |
| Problem Details (RFC 9457) | [problem-details.mts](src/problem-details.mts), globaler Error Handler in [app.mts](src/app.mts) |
| Drizzle: Pagination | `limit`/`offset` und `count()` in [kunde-repository.mts](src/kunde/repository/kunde-repository.mts), [pageable.mts](src/kunde/service/pageable.mts) |
| Drizzle: 1:1 und 1:N | `with: { adresse, bestellungen }` (Relational Queries) in [kunde-repository.mts](src/kunde/repository/kunde-repository.mts) |
| Drizzle: generierte Primärschlüssel | `GENERATED ALWAYS AS IDENTITY` ⇒ `generatedAlwaysAsIdentity()`, ID per `returning()` |
| Drizzle: keine Lost Updates | `UPDATE … WHERE id = ? AND version = ?` und `version + 1` in einer Transaktion |
| Drizzle: Zeitstempel INSERT/UPDATE | `erzeugt`/`aktualisiert` mit `DEFAULT now()`, beim UPDATE `aktualisiert = now()` |
| Security: 1 User, 1 Rolle, 1 geschützte Methode | [roles-required.mts](src/security/roles-required.mts): JWT-Prüfung mit jose (JWKS, Issuer, Audience); POST/PUT/PATCH/DELETE nur mit Rolle `admin` |
| Unit-Tests mit Vitest | `src/**/*.test.mts` (u.a. Service mit gemocktem Repository) |
| Integrationstests mit Vitest und Axios für HTTP/2 | [test/integration](test/integration): `httpVersion: 2` |
| Requests mit Bruno | [extras/bruno/kunde](extras/bruno/kunde) |
| oxlint, oxfmt fehlerfrei | `pnpm lint`, `pnpm fmt:check` |
| Schichten, Konfiguration, Logging | router / service / repository, [config.toml](src/config/resources/config.toml) + `.env`, Pino in [logger.mts](src/logger/logger.mts) |
| Named Exports, const/let, Template Strings, Shorthand Properties, Destructuring | durchgängig; per oxlint erzwungen: `import/no-default-export`, `no-var`, `prefer-const`, `prefer-template`, `object-shorthand`, `prefer-destructuring` |
