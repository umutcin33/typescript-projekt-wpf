// DB-Verbindung: Connection Pool von node-postgres und Drizzle mit den generierten Relations,
// damit Kunde, Adresse (1:1) und Bestellungen (1:N) gemeinsam geladen werden koennen.
// https://orm.drizzle.team/docs/get-started-postgresql

import { Pool } from 'pg';
import { config } from './config.mts';
import { drizzle } from 'drizzle-orm/node-postgres';
import { getLogger } from '../logger/logger.mts';
import { relations } from '../db/relations.mts';

const logger = getLogger('db');

const { host, port, user, database, password, poolMax } = config.db;
const pool = new Pool({ host, port, user, database, password, max: poolMax });

export const db = drizzle({
    client: pool,
    relations,
    // SQL-Anweisungen nur im Development-Modus protokollieren
    logger: config.server.nodeEnv === 'development',
});

export type Db = typeof db;
/** Transaktion oder DB: Repository-Funktionen koennen in beiden Faellen benutzt werden */
export type Tx = Parameters<Parameters<Db['transaction']>[0]>[0];

export const disconnectDB = async () => {
    await pool.end();
    logger.info('Die Verbindung zur DB ist geschlossen.');
};
