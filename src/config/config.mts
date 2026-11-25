// Zentrale Konfiguration: config.toml + Umgebungsvariable (.env), validiert durch Zod.
// Nur hier wird process.env gelesen (siehe oxlint-Regel node/no-process-env).

import { fileURLToPath } from 'node:url';
import { parse } from 'smol-toml';
import process from 'node:process';
import { readFile } from 'node:fs/promises';
import { z } from 'zod';

const resourcesURL = new URL('resources/', import.meta.url);
const tlsURL = new URL('tls/', resourcesURL);

const portSchema = z.number().int().min(1).max(65_535);
const logLevels = ['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'] as const;

const ConfigSchema = z.object({
    server: z.object({
        port: portSchema.default(3000),
        allowHTTP1: z.boolean().default(true),
        keyFile: z.string().default(fileURLToPath(new URL('key.pem', tlsURL))),
        certFile: z.string().default(fileURLToPath(new URL('certificate.crt', tlsURL))),
        nodeEnv: z.enum(['development', 'test', 'production']).default('production'),
    }),
    db: z.object({
        host: z.string().default('localhost'),
        port: portSchema.default(5432),
        user: z.string().default('kunde'),
        database: z.string().default('kunde'),
        password: z.string().min(1, 'DB_PASSWORD fehlt in .env'),
        poolMax: z.number().int().min(1).max(100).default(5),
    }),
    keycloak: z.object({
        url: z.url().default('http://localhost:8880'),
        realm: z.string().default('kunde'),
        clientId: z.string().default('kunde-client'),
        clientSecret: z.string().min(1, 'CLIENT_SECRET fehlt in .env'),
    }),
    log: z.object({
        dir: z.string().default('./log'),
        file: z.string().default('server.log'),
        level: z.enum(logLevels).default('info'),
        pretty: z.boolean().default(false),
    }),
});

export type Config = z.infer<typeof ConfigSchema>;

const tomlFile = new URL('config.toml', resourcesURL);
const toml = parse(await readFile(tomlFile, 'utf8')) as Record<string, Record<string, unknown>>;

// Werte aus .env ueberschreiben bzw. ergaenzen die Werte aus config.toml
const { CLIENT_SECRET, DB_PASSWORD, LOG_LEVEL, NODE_ENV } = process.env;
const { server, db, keycloak, log } = toml;

/** Validierte, unveraenderliche Konfiguration des Appservers */
export const config: Readonly<Config> = Object.freeze(
    ConfigSchema.parse({
        server: { ...server, nodeEnv: NODE_ENV },
        db: { ...db, password: DB_PASSWORD },
        keycloak: { ...keycloak, clientSecret: CLIENT_SECRET },
        log: { ...log, level: LOG_LEVEL },
    }),
);
