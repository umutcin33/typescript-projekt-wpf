// Start des Appservers: Hono auf Node mit HTTP/2 und TLS 1.3
// https://hono.dev/docs/getting-started/nodejs#http2

import { app } from './app.mts';
import { config } from './config/config.mts';
import { createSecureServer } from 'node:http2';
import { disconnectDB } from './config/db.mts';
import { getLogger } from './logger/logger.mts';
import process from 'node:process';
import { readFile } from 'node:fs/promises';
import { serve } from '@hono/node-server';

const logger = getLogger('index');

const { port, keyFile, certFile, allowHTTP1, nodeEnv } = config.server;
const [key, cert] = await Promise.all([readFile(keyFile), readFile(certFile)]);

const server = serve(
    {
        fetch: app.fetch,
        port,
        createServer: createSecureServer,
        serverOptions: {
            key,
            cert,
            minVersion: 'TLSv1.3',
            allowHTTP1,
        },
    },
    ({ port: serverPort }) => {
        logger.info(
            'Appserver (%s) mit HTTP/2 gestartet: https://localhost:%d',
            nodeEnv,
            serverPort,
        );
    },
);

const shutdown = (signal: string) => {
    logger.info('%s: Der Appserver wird heruntergefahren.', signal);
    server.close();
    disconnectDB()
        .catch((err: unknown) => logger.error(err, 'Fehler beim Schliessen der DB-Verbindung'))
        .finally(() => process.exit(0));
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
