# Project status

## Implemented

- Final Openmart package identity and compiled registrations.
- Password API-key credential with Bearer authentication and harmless balance test.
- Account → Get Credit Balance, validating provider fields, accepting zero, mapping/redacting errors, and retrying only safe transient retrieval failures.
- Business → Search first page with required query, conservative preview-compatible limit, optional location and four initial filters, atomic response validation, no cursor, and no automatic retry.
- Batch → Get Status and Get Task IDs, plus Task → Get, with trimmed path-segment IDs, optional free-text task-status filtering, documented-shape validation, direct chaining output, and bounded safe-read retries.
- Neutral original themed icons and product documentation.
- Disposable n8n 2.37.10 metadata discovery and exact icon URL/hash verification.

## Validation boundary

Batch 4 adds local mocked and package-level validation for the three asynchronous retrieval reads. A fresh disposable user folder on cached pinned n8n 2.37.10 reached healthy loopback status and completed disposable owner setup. Authenticated type metadata exposed credential `openmartApi`; Account, Batch, Business, and Task resources; Batch/Get Status (`getStatus`), Batch/Get Task IDs (`getTaskIds`), and Task/Get (`get`); required Batch ID for both Batch operations; optional Status only for Batch/Get Task IDs; and required Task ID only for Task/Get. n8n also injected host-owned `__CUSTOM_API_CALL__` resource/operation entries, which the package does not advertise. The server was stopped and the exact temporary script and state were deleted.

That actual-n8n evidence covers discovery and served metadata only. Live Openmart, paid calls, browser/editor interaction, actual node execution in n8n, and Creator Portal checks have not been performed; no Openmart key was used and no Openmart request was made.

Availability of `https://blackswampai.com/n8n-nodes/openmart/` was not independently confirmed on September 6, 2026. Direct retrieval was tool-blocked, and a scoped search found no indexed result; neither outcome proves that the page is absent.

## Open questions

- Search docs accept a country code or name and examples vary between `US` and `USA`; the UI intentionally keeps country free text. The general maximum is 1000 while preview keys are capped at 100, so the UI conservatively caps at 100 pending account validation.
- Search entitlement, credit effect, live top-level array contents, and eventual pagination cursor behavior remain unverified.
- Endpoint/account entitlements and billing effects.
- Shared Batch Status → Task IDs → Task Get is implemented locally, but actual state transitions, status-filter behavior, tracking IDs, partial failures, and missing/empty results require live validation.
- Find Company Emails and Find Decision Makers are both required for 0.1.0 but not implemented. Both paid batch creations must never be automatically retried. Company Emails' documented meaning and accepted values of `submit_for` remain ambiguous and require authorized live validation; `notify_url` is not currently promised.
- The 0.1.0 release requires a demonstrated Search → email/contact discovery → downstream data handoff, with fixtures and workflow evidence for both branches where appropriate. Sending outreach remains outside this node. Company Emails returns generic shared mailbox `{email,status}` records; Find Decision Makers returns named individual contacts and emails.
- Business Get remains a transport decision, not a universal impossibility: n8n 2.37.10's recommended authenticated helper strips the documented JSON-array GET body, while the deprecated legacy transport preserved it in loopback. No transport or fallback has been selected.

## Future releases / backburner

Not implemented or advertised: Detect Tech Stack; Search Business IDs Fast; Get by Google Place ID; Enrich Company; Enrich Known People; Search Companies; Create Deny Rules; Check Deny Rules; Delete Deny Rules.
