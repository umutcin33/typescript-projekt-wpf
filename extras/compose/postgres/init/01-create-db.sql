-- Wird beim ERSTEN Start des Containers von docker-entrypoint.sh ausgefuehrt
-- (Volume leer), und zwar als Superuser "postgres" in der DB "postgres".

-- Eigener DB-User fuer den Appserver und Drizzle (nicht der Superuser)
CREATE USER kunde PASSWORD 'p';

CREATE DATABASE kunde OWNER kunde;
