# Project status

## Implemented

- Final Openmart package identity and compiled registrations.
- Password API-key credential with Bearer authentication and harmless balance test.
- Account → Get Credit Balance, validating provider fields, accepting zero, mapping/redacting errors, and retrying only safe transient retrieval failures.
- Neutral original themed icons and product documentation.
- Disposable n8n 2.37.10 metadata discovery and exact icon URL/hash verification.

## Validation boundary

Batch 2 has local mocked, actual-helper, package-level, and disposable n8n server metadata validation. Live Openmart, paid calls, browser/editor interaction, actual balance execution in n8n, and Creator Portal checks have not been performed.

Availability of `https://blackswampai.com/n8n-nodes/openmart/` was not independently confirmed on September 6, 2026. Direct retrieval was tool-blocked, and a scoped search found no indexed result; neither outcome proves that the page is absent.

## Open questions

- Search country value (`US` or `USA`), maximum limit (50 or 100), envelope, and cursor.
- Endpoint/account entitlements and billing effects.
- Actual task states, tracking-ID behavior, and missing/empty results.
- Business Get is blocked: n8n 2.37.10's supported authenticated helper applies Bearer authentication but drops the documented JSON-array GET body. A documented Openmart alternative is required.
