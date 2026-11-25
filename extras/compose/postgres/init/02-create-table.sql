-- Schema und Tabellen fuer die Domaene "Kunde"
--   kunde      1:1  adresse     (UNIQUE Fremdschluessel)
--   kunde      1:N  bestellung
-- Aus diesem Schema wird der Drizzle-Code mit "drizzle-kit pull" generiert.

\connect kunde

-- Alle Objekte gehoeren dem User "kunde"
SET ROLE kunde;

CREATE SCHEMA IF NOT EXISTS kunde AUTHORIZATION kunde;
ALTER ROLE kunde SET search_path = 'kunde';
SET search_path TO kunde;

CREATE TABLE IF NOT EXISTS kunde (
                  -- generierter Primaerschluessel gemaess SQL-Standard
    id            integer GENERATED ALWAYS AS IDENTITY (START WITH 1000) PRIMARY KEY,
                  -- Versionsnummer fuer optimistische Synchronisation (ETag / If-Match)
    version       integer NOT NULL DEFAULT 0,
    nachname      text NOT NULL,
    vorname       text NOT NULL,
                  -- impliziter B-Baum-Index durch UNIQUE
    email         text NOT NULL UNIQUE,
    geburtsdatum  date,
                  -- Zeitstempel fuer INSERT und UPDATE
    erzeugt       timestamp with time zone NOT NULL DEFAULT now(),
    aktualisiert  timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS adresse (
    id          integer GENERATED ALWAYS AS IDENTITY (START WITH 1000) PRIMARY KEY,
    strasse     text NOT NULL,
    hausnummer  text NOT NULL,
                -- genau 5 Ziffern
    plz         text NOT NULL CHECK (plz ~ '^\d{5}$'),
    ort         text NOT NULL,
                -- UNIQUE => 1:1-Beziehung; Loeschen des Kunden loescht die Adresse
    kunde_id    integer NOT NULL UNIQUE REFERENCES kunde ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS bestellung (
    id            integer GENERATED ALWAYS AS IDENTITY (START WITH 1000) PRIMARY KEY,
    produktname   text NOT NULL,
    menge         integer NOT NULL CHECK (menge > 0),
                  -- 10 Stellen, davon 2 Nachkommastellen
    preis         numeric(10,2) NOT NULL CHECK (preis >= 0),
    bestelldatum  date NOT NULL DEFAULT current_date,
                  -- ohne UNIQUE => 1:N-Beziehung
    kunde_id      integer NOT NULL REFERENCES kunde ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS bestellung_kunde_id_idx ON bestellung(kunde_id);

RESET ROLE;
