-- Safety test for installed NFT burn gate. All synthetic inserts are rolled back.
-- Run using: psql "$NFT_DATABASE_URL" -v ON_ERROR_STOP=1 -f scripts/test-burn-admission-gate.sql
-- NEVER replace final ROLLBACK with COMMIT.
\set ON_ERROR_STOP on
BEGIN;
SET LOCAL statement_timeout = '15s';
DO $test$
DECLARE
  rid text := 'ajine-gate-test-' || md5(random()::text || clock_timestamp()::text);
  aid uuid := md5(random()::text || clock_timestamp()::text)::uuid;
  first_id uuid := md5(random()::text || clock_timestamp()::text)::uuid;
  second_id uuid := md5(random()::text || clock_timestamp()::text)::uuid;
  third_id uuid := md5(random()::text || clock_timestamp()::text)::uuid;
  first_at timestamptz := clock_timestamp() - interval '3 minutes';
  second_at timestamptz := clock_timestamp() - interval '2 minutes';
  third_at timestamptz := clock_timestamp() - interval '1 minute';
  execution_id uuid := md5(random()::text || clock_timestamp()::text)::uuid;
BEGIN
  -- Initial event must be pending.
  BEGIN
    INSERT INTO public."NFT_Agreement_Events"(id,agreement_id,registration_id,event_type,occurred_at)
    VALUES(first_id,aid,rid,'withdrawn',first_at);
    RAISE EXCEPTION 'FAIL_INITIAL_WITHDRAWN_ACCEPTED';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM <> 'AJINE_INITIAL_AGREEMENT_REQUIRED' THEN RAISE; END IF;
    RAISE NOTICE 'PASS initial withdrawn rejected';
  END;
  INSERT INTO public."NFT_Agreement_Events"(id,agreement_id,registration_id,event_type,occurred_at)
  VALUES(first_id,aid,rid,'pending',first_at);
  RAISE NOTICE 'PASS initial pending accepted';
  -- Duplicate pending is stale.
  BEGIN
    INSERT INTO public."NFT_Agreement_Events"(id,agreement_id,registration_id,event_type,occurred_at)
    VALUES(second_id,aid,rid,'pending',second_at);
    RAISE EXCEPTION 'FAIL_DUPLICATE_PENDING_ACCEPTED';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM <> 'AJINE_STALE_AGREEMENT_EVENT' THEN RAISE; END IF;
    RAISE NOTICE 'PASS duplicate pending rejected';
  END;
  INSERT INTO public."NFT_Agreement_Events"(id,agreement_id,registration_id,event_type,occurred_at)
  VALUES(second_id,aid,rid,'withdrawn',second_at);
  RAISE NOTICE 'PASS withdrawal before reservation accepted';
  -- Withdrawn agreement cannot reserve.
  BEGIN
    INSERT INTO public."NFT_Burn_Executions"
      (id,nft_identity,registration_id,agreement_id,agreement_event_id,status,authorized_at)
    VALUES(execution_id,'test:' || rid,rid,aid,second_id,'reserved',clock_timestamp());
    RAISE EXCEPTION 'FAIL_WITHDRAWN_RESERVATION_ACCEPTED';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM <> 'AJINE_BURN_ADMISSION_HELD' THEN RAISE; END IF;
    RAISE NOTICE 'PASS withdrawn reservation rejected';
  END;
  INSERT INTO public."NFT_Agreement_Events"(id,agreement_id,registration_id,event_type,occurred_at)
  VALUES(third_id,aid,rid,'pending',third_at);
  RAISE NOTICE 'PASS renewal before reservation accepted';
  -- Old pending event cannot authorize a reservation.
  BEGIN
    INSERT INTO public."NFT_Burn_Executions"
      (id,nft_identity,registration_id,agreement_id,agreement_event_id,status,authorized_at)
    VALUES(execution_id,'test:' || rid,rid,aid,first_id,'reserved',clock_timestamp());
    RAISE EXCEPTION 'FAIL_STALE_EVENT_RESERVATION_ACCEPTED';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM <> 'AJINE_BURN_ADMISSION_HELD' THEN RAISE; END IF;
    RAISE NOTICE 'PASS stale event reservation rejected';
  END;
  INSERT INTO public."NFT_Burn_Executions"
    (id,nft_identity,registration_id,agreement_id,agreement_event_id,status,authorized_at)
  VALUES(execution_id,'test:' || rid,rid,aid,third_id,'reserved',clock_timestamp());
  RAISE NOTICE 'PASS current pending reservation accepted';
  -- Once reserved, withdrawal is forbidden.
  BEGIN
    INSERT INTO public."NFT_Agreement_Events"(id,agreement_id,registration_id,event_type,occurred_at)
    VALUES(md5(random()::text || clock_timestamp()::text)::uuid,aid,rid,'withdrawn',clock_timestamp());
    RAISE EXCEPTION 'FAIL_POST_RESERVATION_WITHDRAWAL_ACCEPTED';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM <> 'AJINE_BURN_ALREADY_RESERVED' THEN RAISE; END IF;
    RAISE NOTICE 'PASS withdrawal after reservation rejected';
  END;
  -- A second reservation cannot claim the same registration.
  BEGIN
    INSERT INTO public."NFT_Burn_Executions"
      (id,nft_identity,registration_id,agreement_id,agreement_event_id,status,authorized_at)
    VALUES(md5(random()::text || clock_timestamp()::text)::uuid,'test2:' || rid,rid,aid,third_id,'reserved',clock_timestamp());
    RAISE EXCEPTION 'FAIL_DUPLICATE_RESERVATION_ACCEPTED';
  EXCEPTION WHEN unique_violation THEN
    RAISE NOTICE 'PASS duplicate reservation rejected';
  END;
  -- Agreement history is append-only.
  BEGIN
    UPDATE public."NFT_Agreement_Events" SET event_type='withdrawn' WHERE id=third_id;
    RAISE EXCEPTION 'FAIL_EVENT_UPDATE_ACCEPTED';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM <> 'AJINE_IMMUTABLE_AGREEMENT_EVENT' THEN RAISE; END IF;
    RAISE NOTICE 'PASS event update rejected';
  END;
  BEGIN
    DELETE FROM public."NFT_Agreement_Events" WHERE id=third_id;
    RAISE EXCEPTION 'FAIL_EVENT_DELETE_ACCEPTED';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM <> 'AJINE_IMMUTABLE_AGREEMENT_EVENT' THEN RAISE; END IF;
    RAISE NOTICE 'PASS event delete rejected';
  END;
  RAISE NOTICE 'BURN_GATE_TRANSACTION_TESTS_PASSED';
END
$test$;
ROLLBACK;
-- Test rows must never persist. No live customer data is updated.
