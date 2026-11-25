-- Beispieldaten aus CSV-Dateien laden.
-- COPY schreibt bei Identity-Spalten die IDs aus der CSV-Datei (wie OVERRIDING SYSTEM VALUE).
-- Neue Datensaetze erhalten IDs ab 1000 (START WITH 1000), daher keine Kollisionen.
-- COPY FROM <Datei> erfordert Superuser-Rechte, deshalb hier ohne SET ROLE.

\connect kunde
SET search_path TO kunde;

COPY kunde FROM '/init/csv/kunde.csv' (FORMAT csv, DELIMITER ';', HEADER true);
COPY adresse FROM '/init/csv/adresse.csv' (FORMAT csv, DELIMITER ';', HEADER true);
COPY bestellung FROM '/init/csv/bestellung.csv' (FORMAT csv, DELIMITER ';', HEADER true);
