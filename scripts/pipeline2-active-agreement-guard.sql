BEGIN;
CREATE OR REPLACE FUNCTION public.ajine_active_agreement_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE latest text;
BEGIN
 IF TG_TABLE_NAME='NFT_Registry' THEN
  IF NEW.burn_agreement_id IS NOT DISTINCT FROM OLD.burn_agreement_id THEN RETURN NEW; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended('ajine:burn:registration:' || OLD.registration_id,0));
  IF EXISTS (SELECT 1 FROM public."NFT_Burn_Executions" WHERE registration_id=OLD.registration_id) THEN RAISE EXCEPTION 'AJINE_BURN_ALREADY_RESERVED'; END IF;
  IF OLD.burn_agreement_id IS NOT NULL THEN
   SELECT event_type INTO latest FROM public."NFT_Agreement_Events" WHERE agreement_id::text=OLD.burn_agreement_id::text ORDER BY occurred_at DESC LIMIT 1;
   IF latest IS DISTINCT FROM 'withdrawn' THEN RAISE EXCEPTION 'AJINE_WITHDRAWAL_REQUIRED'; END IF;
  END IF;
 ELSE
  PERFORM pg_advisory_xact_lock(hashtextextended('ajine:burn:registration:' || NEW.registration_id,0));
  IF NOT EXISTS (SELECT 1 FROM public."NFT_Registry" WHERE registration_id=NEW.registration_id AND burn_agreement_id::text=NEW.agreement_id::text) THEN RAISE EXCEPTION 'AJINE_INACTIVE_AGREEMENT'; END IF;
 END IF;
 RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS ajine_active_agreement_registry ON public."NFT_Registry";
CREATE TRIGGER ajine_active_agreement_registry BEFORE UPDATE ON public."NFT_Registry" FOR EACH ROW EXECUTE FUNCTION public.ajine_active_agreement_guard();
DROP TRIGGER IF EXISTS ajine_active_agreement_reservation ON public."NFT_Burn_Executions";
CREATE TRIGGER ajine_active_agreement_reservation BEFORE INSERT ON public."NFT_Burn_Executions" FOR EACH ROW EXECUTE FUNCTION public.ajine_active_agreement_guard();
COMMIT;
