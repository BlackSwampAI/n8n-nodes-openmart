# Implementation plan

## Batch 1 — complete

Convert the template, remove demonstrations, add the Openmart credential and Account Get Credit Balance operation, establish product documentation, and pass local gates without live API calls.

## Batch 2 — complete

Harden credential and transport errors, redaction behavior, response validation, and item context. Prove n8n's authenticated helper GET-body behavior against a recording server and run a disposable n8n 2.37.10 metadata/icon smoke. Live balance validation remains guarded without an API key.

The recommended `httpRequestWithAuthentication` path in n8n 2.37.10 drops GET bodies, while a loopback probe showed that the deprecated legacy transport preserves them. Business Get therefore remains a supported-path compatibility decision; do not choose its transport or advertise it until that decision is reviewed.

## Batch 3 — complete locally

Implement the first page of Business Search only: required query, location, initial filters and bounded limit that have been verified against current documentation or live evidence, plus the verified response adapter. Add realistic fixtures for results, empty responses, optional/null fields, and validation failures. Keep operation metadata synchronized with routing hooks and preserve provider metadata. Actual n8n routing execution and input-item pairing remain separate smoke requirements.

Local mocked and package validation is complete; live Openmart validation remains pending. Pagination and Business Get are explicitly excluded from Batch 3.

## Batch 4 — complete locally: shared asynchronous retrieval

Implemented the release-critical shared retrieval chain: Batch/Get Status, Batch/Get Task IDs, and Task/Get. IDs, status filtering, documented response shapes, pairing, continuation, and error sanitation have local mocked and package validation. The five advertised operations now use declarative routing with no internal retry or polling loop. Live task states, partial/missing results, and entitlements remain unverified.

## Batch 5 — proposed: email and contact discovery

Implement Find Company Emails as a 0.1.0 requirement using `POST /api/v1/task/batch/lookup_business_email`. It creates paid asynchronous work from 1–100 JSON-array tasks. Each task requires a nonblank `domain` and `company_name`; city, state, country, and `tracking_id` are optional. Paid creation is never automatically retried. Results flow through the shared Batch Status → Task IDs → Task Get chain and yield generic mailbox `{email,status}` records. Do not promise `notify_url` support unless it is separately planned and verified.

Also implement Find Decision Makers as a 0.1.0 requirement using `POST /api/v1/task/batch/find_people`, yielding named individual contacts and their emails through the same shared retrieval chain. Both paid asynchronous creation paths must explicitly disable automatic retries.

Demonstrate the release-critical Search → email/contact discovery → downstream data handoff without sending outreach, with fixtures and workflow evidence for both branches where appropriate. Company Emails finds generic shared inboxes; Find Decision Makers finds named individual contacts. Resolve the Company Emails documentation's `submit_for` ambiguity through authorized live validation before finalizing that creation contract.

## Remaining 0.1.0 planned work

- Add bounded Search cursor pagination after live validation establishes continuation and credit behavior, with repeated-cursor, exhaustion, page-failure, and partial-result policy tests.
- Decide Business Get transport deliberately. The recommended n8n 2.37.10 authenticated helper strips its documented GET array body, while deprecated legacy transport preserves it in loopback; neither a legacy implementation nor an invented POST/query fallback is selected here.
- Complete authorized live validation and the release gates for the discovery-to-email-data chain.

## Future releases / backburner

Do not advertise these documentation-identified operations as implemented: Detect Tech Stack; Search Business IDs Fast; Get by Google Place ID; Enrich Company; Enrich Known People; Search Companies; Create Deny Rules; Check Deny Rules; Delete Deny Rules.
