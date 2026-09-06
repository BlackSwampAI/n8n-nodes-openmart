# Implementation plan

## Batch 1 — complete

Convert the template, remove demonstrations, add the Openmart credential and Account Get Credit Balance operation, establish product documentation, and pass local gates without live API calls.

## Batch 2 — complete

Harden credential and transport errors, retry/redaction behavior, response validation, and item context. Prove n8n's authenticated helper GET-body behavior against a recording server and run a disposable n8n 2.37.10 metadata/icon smoke. Live balance validation remains guarded without an API key.

The helper probe confirmed that n8n 2.37.10 drops GET bodies, blocking Business Get until Openmart documents an alternative. Do not advertise Business Search until its separate API conflicts and response contract are validated.

## Batch 3 — proposed

Implement the first page of Business Search only: required query, location, initial filters and bounded limit that have been verified against current documentation or live evidence, plus the verified response adapter. Add realistic fixtures for results, empty responses, optional/null fields, and validation failures. Keep operation metadata synchronized with execution and preserve input-item pairing and provider metadata.

Pagination and Business Get are explicitly excluded from Batch 3. Later batches follow the gameplan and remain out of scope here.
