BEGIN;
CREATE SCHEMA IF NOT EXISTS ajine_private;
REVOKE ALL ON SCHEMA ajine_private FROM PUBLIC;
CREATE TABLE IF NOT EXISTS ajine_private.jingle_burns (
 reservation_id uuid PRIMARY KEY,
 payload bytea NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now()
);
REVOKE ALL ON TABLE ajine_private.jingle_burns FROM PUBLIC;
COMMIT;
