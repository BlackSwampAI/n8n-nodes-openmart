# Implementation plan

## Batch 1 — complete

Convert the template, remove demonstrations, add the Openmart credential and Account Get Credit Balance operation, establish product documentation, and pass local gates without live API calls.

## Batch 2 — complete

Harden credential and transport errors, redaction behavior, response validation, and item context. Prove n8n's authenticated helper GET-body behavior against a recording server and run a disposable n8n 2.37.10 metadata/icon smoke. Live balance validation remains guarded without an API key.

The recommended `httpRequestWithAuthentication` path in n8n 2.37.10 drops GET bodies, while a loopback probe showed that the deprecated legacy transport preserves them. The reviewed outcome is to defer Business Get from 0.1.0 rather than adopt deprecated transport or invent an unsupported fallback.

## Batch 3 — complete locally

Implement the first page of Business Search only: required query, location, initial filters and bounded limit that have been verified against current documentation or live evidence, plus the verified response adapter. Add realistic fixtures for results, empty responses, optional/null fields, and validation failures. Keep operation metadata synchronized with routing hooks and preserve provider metadata. Actual n8n routing execution and input-item pairing remain separate smoke requirements.

Local mocked and package validation is complete; live Openmart validation remains pending. Pagination and Business Get are explicitly excluded from Batch 3.

## Batch 4 — complete locally: shared asynchronous retrieval

Implemented the release-critical shared retrieval chain: Batch/Get Status, Batch/Get Task IDs, and Task/Get. IDs, status filtering, documented response shapes, pairing, continuation, and error sanitation have local mocked and package validation. The then-five advertised operations were converted to declarative routing with no internal retry or polling loop. Live task states, partial/missing results, and entitlements remain unverified.

## Batch 5 — complete locally: email and contact discovery

Implemented Company → Find Emails using `POST /api/v1/task/batch/lookup_business_email`. Each n8n input item creates one paid asynchronous task with required normalized `domain` and `company_name`; city, state, country, and `tracking_id` are optional. The submission envelope is validated and returned with normalized submitted context. `notify_url` is not exposed.

Implemented Person → Find Decision Makers using `POST /api/v1/task/batch/find_people`, with required domain, title, `max_k` from 1 through 8, and explicit email/phone access selection. Both creation paths use a 90-second submission timeout, create no internal retry or polling behavior, and return through the shared Batch Status → Task IDs → Task Get lifecycle.

Local metadata, hook, validation, error-redaction, and package evidence is complete. The user-reported Company Find Emails branch demonstrated submission, completed/ready status, task-ID retrieval, and one returned email for `n8n.io`; this was not agent-observed. Person paid creation, other Company cases, broader task states and failures, and the Person discovery-to-contact handoff remain pending. Find Emails' conflicting current/legacy `submit_for` labels are preserved rather than hard-coded.

## Remaining 0.1.0 planned work

The usefulness-first prospecting core consolidates paid email and decision-maker creation under Company and Person, adds first-page brand Company Search and Company Enrich, and adds asynchronous known-person enrichment. Local contracts are complete. User-reported n8n execution covers the Company Find Emails retrieval chain, the post-fix Company Search positive path with cursor exposure, and an empty/no-match Company Enrich run. Both Person operations, Company Search cursor continuation and other filters/cases, positive Company Enrich results, and broader live compatibility remain pending.

- Add bounded Search cursor pagination after live validation establishes continuation and credit behavior, with repeated-cursor, exhaustion, page-failure, and partial-result policy tests.
- Complete authorized live validation and the release gates for the discovery-to-email-data chain.

## Future releases / backburner

Do not advertise these documentation-identified operations as implemented: Business Get; Detect Tech Stack; Search Business IDs Fast; Get by Google Place ID; Create Deny Rules; Check Deny Rules; Delete Deny Rules. Business Get can be reconsidered if Openmart offers a POST/query contract or n8n's modern authenticated helper preserves required GET JSON-array bodies.
