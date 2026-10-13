CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Application migrations create the tables. These roles document the intended
-- split between normal tenant traffic and tightly controlled maintenance jobs.
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'kontur_app') THEN
    CREATE ROLE kontur_app NOLOGIN;
  END IF;
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'kontur_maintenance') THEN
    CREATE ROLE kontur_maintenance NOLOGIN BYPASSRLS;
  END IF;
END $$;
