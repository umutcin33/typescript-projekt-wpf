// Logging mit Pino: Logdatei (JSON) und optional lesbare Ausgabe auf der Konsole (pino-pretty)
// https://getpino.io

import { mkdir } from 'node:fs/promises';
import { type TransportTargetOptions, pino } from 'pino';
import { config } from '../config/config.mts';
import { resolve } from 'node:path';

const { dir, file, level, pretty } = config.log;
await mkdir(dir, { recursive: true });

const fileTarget: TransportTargetOptions = {
    level,
    target: 'pino/file',
    options: { destination: resolve(dir, file) },
};
const prettyTarget: TransportTargetOptions = {
    level,
    target: 'pino-pretty',
    options: {
        translateTime: 'SYS:standard',
        singleLine: true,
        colorize: true,
        ignore: 'pid,hostname',
    },
};

const targets = pretty ? [fileTarget, prettyTarget] : [fileTarget];
const parentLogger = pino({ level }, pino.transport({ targets }));

/**
 * Logger fuer ein Modul erzeugen, z.B. getLogger('kunde-service').
 * @param context Name des Moduls, erscheint in jeder Logzeile
 */
export const getLogger = (context: string) => parentLogger.child({ context });
