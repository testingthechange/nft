-- Apply as the NFT database owner, in one transaction. No blockchain calls.
BEGIN;
LOCK TABLE public."NFT_Agreement_Events", public."NFT_Burn_Executions" IN ACCESS EXCLUSIVE MODE;
CREATE OR REPLACE FUNCTION public.ajine_burn_admission_guard() RETURNS trigger
LANGUAGE plpgsql SET search_path = pg_catalog, public AS $$
DECLARE latest record;
BEGIN
  IF TG_OP <> 'INSERT' THEN
    RAISE EXCEPTION 'AJINE_IMMUTABLE_AGREEMENT_EVENT';
  END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended('ajine:burn:' || NEW.agreement_id::text, 0));
  IF TG_TABLE_NAME = 'NFT_Agreement_Events' THEN
    IF EXISTS (SELECT 1 FROM public."NFT_Burn_Executions" WHERE agreement_id=NEW.agreement_id OR registration_id=NEW.registration_id) THEN
      RAISE EXCEPTION 'AJINE_BURN_ALREADY_RESERVED';
    END IF;
    SELECT * INTO latest FROM public."NFT_Agreement_Events" WHERE agreement_id=NEW.agreement_id ORDER BY occurred_at DESC LIMIT 1;
    IF FOUND THEN
      IF latest.registration_id<>NEW.registration_id OR NEW.occurred_at<=latest.occurred_at OR NEW.event_type<>CASE WHEN latest.event_type='pending' THEN 'withdrawn' ELSE 'pending' END THEN
        RAISE EXCEPTION 'AJINE_STALE_AGREEMENT_EVENT';
      END IF;
    ELSIF NEW.event_type<>'pending' THEN
      RAISE EXCEPTION 'AJINE_INITIAL_AGREEMENT_REQUIRED';
    END IF;
  ELSE
    SELECT * INTO latest FROM public."NFT_Agreement_Events" WHERE agreement_id=NEW.agreement_id ORDER BY occurred_at DESC LIMIT 1;
    IF NOT FOUND OR latest.event_type<>'pending' OR latest.id<>NEW.agreement_event_id OR latest.registration_id<>NEW.registration_id OR NEW.status<>'reserved' OR NEW.transaction_hash IS NOT NULL OR NEW.authorized_at<latest.occurred_at THEN
      RAISE EXCEPTION 'AJINE_BURN_ADMISSION_HELD';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS ajine_agreement_gate ON public."NFT_Agreement_Events";
CREATE TRIGGER ajine_agreement_gate BEFORE INSERT OR UPDATE OR DELETE ON public."NFT_Agreement_Events" FOR EACH ROW EXECUTE FUNCTION public.ajine_burn_admission_guard();
DROP TRIGGER IF EXISTS ajine_execution_gate ON public."NFT_Burn_Executions";
CREATE TRIGGER ajine_execution_gate BEFORE INSERT ON public."NFT_Burn_Executions" FOR EACH ROW EXECUTE FUNCTION public.ajine_burn_admission_guard();
COMMIT;
