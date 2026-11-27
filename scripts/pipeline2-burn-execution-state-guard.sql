-- AJINE Pipeline 2 — NFT PostgreSQL only.
-- Apply deliberately with psql to the NFT database after review.
-- Not executed by Render on deploy; never initiates a blockchain transaction.
BEGIN;
CREATE OR REPLACE FUNCTION public.ajine_burn_execution_state_guard()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'AJINE_BURN_EXECUTION_IMMUTABLE';
  END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended('ajine:burn:registration:' || OLD.registration_id, 0));
  IF NEW.id IS DISTINCT FROM OLD.id
    OR NEW.nft_identity IS DISTINCT FROM OLD.nft_identity
    OR NEW.registration_id IS DISTINCT FROM OLD.registration_id
    OR NEW.agreement_id IS DISTINCT FROM OLD.agreement_id
    OR NEW.agreement_event_id IS DISTINCT FROM OLD.agreement_event_id
    OR NEW.authorized_at IS DISTINCT FROM OLD.authorized_at THEN
    RAISE EXCEPTION 'AJINE_BURN_EXECUTION_IDENTITY_IMMUTABLE';
  END IF;
  IF OLD.status = 'reserved'
     AND OLD.transaction_hash IS NULL
     AND NEW.status = 'prepared'
     AND NEW.transaction_hash ~ '^0x[0-9a-f]{64}$' THEN
    RETURN NEW;
  END IF;
  IF OLD.status = 'prepared'
     AND NEW.status = 'confirmed'
     AND NEW.transaction_hash = OLD.transaction_hash
     AND NEW.transaction_hash ~ '^0x[0-9a-f]{64}$' THEN
    RETURN NEW;
  END IF;
  RAISE EXCEPTION 'AJINE_BURN_EXECUTION_INVALID_TRANSITION';
END;
$$;
DROP TRIGGER IF EXISTS ajine_execution_update_gate ON public."NFT_Burn_Executions";
CREATE TRIGGER ajine_execution_update_gate
BEFORE UPDATE OR DELETE ON public."NFT_Burn_Executions"
FOR EACH ROW EXECUTE FUNCTION public.ajine_burn_execution_state_guard();
COMMIT;
