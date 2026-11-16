# AJINE NFT — Data Protection (PLACEHOLDER)

**Status: DEFERRED — design and approval required. Not installed or enabled.**

Purpose: preserve critical customer, album registration, NFT, burn, collectible and ownership records against accidental deletion, overwriting or service loss. This file tracks decisions for later; it does **not** configure any backup, retention, access control or database behavior.

## Decisions to make before live customer registration

- [ ] Choose backup provider, frequency, retention period and independent storage location.
- [ ] Verify database hosting plan and whether point-in-time recovery is available.
- [ ] Define restore procedure and perform a restore test without affecting production data.
- [ ] Define which business records must never be hard-deleted (registrations, confirmed burns, mint/transfer history, ownership changes).
- [ ] Decide whether historical records use immutable events, append-only journals, soft deletion, or another approved pattern.
- [ ] Establish least-privilege Directus permissions for services and administrators.
- [ ] Establish uniqueness and identity constraints before accepting external registrations.
- [ ] Separate test data and production customer records.
- [ ] Document incident response and recovery ownership.

## Current verified foundations

- Directus has 10 AJINE NFT collections and 8 verified typed relationships.
- The data-integrity audit previously found 0 records and 0 warnings.
- Anonymous reads were denied for all 10 audited business collections.
- AJINE NFT API successfully authenticated to Directus.

These checks do **not** establish that backups, point-in-time recovery, immutable history, or production security controls are active.

## Guardrail

Do **not** activate live customer registration ingestion, irreversible NFT operations, or ownership-changing transactions until the above protection decisions are approved and tested. Do not modify or delete historical records as part of website feature updates.

This is a planning placeholder only. No migrations, background jobs, database changes, or deletion rules are created here.
