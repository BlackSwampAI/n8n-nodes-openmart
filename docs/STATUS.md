# Project status

## Implemented

- Final Openmart package identity and compiled registrations.
- Password API-key credential with Bearer authentication and harmless balance test.
- Declarative routing for all ten advertised operations, with fixed production transport, local pre-send validation, response shaping, and sanitized errors without hidden retries.
- Account → Get Credit Balance, validating provider fields, accepting zero, and mapping/redacting errors.
- Business → Search with required query, optional location and four initial filters, opt-in cursor pagination, a default total Limit of 10, and no automatic retry.
- Batch → Get Status and Get Task IDs, plus Task → Get, with trimmed path-segment IDs, optional free-text task-status filtering, documented-shape validation, and direct chaining output.
- Company → Find Emails and Person → Find Decision Makers preserve the paid one-task submission contracts under consolidated pre-release resource identities.
- Company → Search provides guarded brand targeting with opt-in cursor pagination; Company → Enrich matches by website/social link; Person → Enrich Known Person submits 1–8 named contacts asynchronously.
- Neutral original themed icons and product documentation.
- Disposable n8n 2.37.10 metadata discovery and exact icon URL/hash verification.

## Validation boundary

Batch 4 adds local mocked and package-level validation for the three asynchronous retrieval reads. A fresh disposable user folder on cached pinned n8n 2.37.10 reached healthy loopback status and completed disposable owner setup. Authenticated type metadata exposed credential `openmartApi`; Account, Batch, Business, and Task resources; Batch/Get Status (`getStatus`), Batch/Get Task IDs (`getTaskIds`), and Task/Get (`get`); required Batch ID for both Batch operations; optional Status only for Batch/Get Task IDs; and required Task ID only for Task/Get. n8n also injected host-owned `__CUSTOM_API_CALL__` resource/operation entries, which the package does not advertise. The server was stopped and the exact temporary script and state were deleted.

That actual-n8n evidence covers discovery and served metadata only. Live Openmart, paid calls, browser/editor interaction, actual node execution in n8n, and Creator Portal checks have not been performed; no Openmart key was used and no Openmart request was made.

After the declarative conversion, `n8n-node dev` v0.46.4 successfully built, watched, and installed the package using `--external-n8n` and a disposable custom-user folder under `/tmp`. Cached pinned n8n 2.37.10 then started healthy on loopback, and `/healthz` returned `{"status":"ok"}`. After disposable owner setup, authenticated `/types/nodes.json` exposed `CUSTOM.openmart`, credential `openmartApi`, declarative request defaults `baseURL: https://api.openmart.ai`, `json: true`, `returnFullResponse: true`, and `ignoreHttpStatusErrors: true`, plus all five source operation values: `getCreditBalance`, `search`, `getStatus`, `getTaskIds`, and `get`. Host-injected `__CUSTOM_API_CALL__` entries also appeared. The server stopped cleanly and the exact temporary folder was deleted.

This post-conversion smoke proves build/watch installation, server health, and served declarative metadata only. It did not use a browser, execute a workflow or node, configure Openmart credentials, or make an Openmart API request. It therefore does not prove routing execution, item pairing, request concurrency, or live API behavior.

Separately, the user reported on September 7, 2026 that credential save and live Balance and Business Search succeeded. This is user-reported evidence, not an authenticated response or timing observed in this implementation run. At that point, Batch and Task reads were not exercised because no IDs existed, and neither paid creation operation had been run live.

After Batch 5, an orchestrator-observed disposable metadata smoke used `n8n-node dev` v0.46.4 with `--external-n8n` to build, watch, and install the package successfully. Pinned n8n 2.37.10 started healthy on loopback. Following disposable owner setup, authenticated `/types/nodes.json` exposed `CUSTOM.openmart` with Company Email and People Search plus all prior resources. Both Create operations served their exact POST routes and `timeout: 90000`; credential `openmartApi`, the paid-work notice, required/default controls, and resource/operation display conditions were also present. n8n injected its host-owned Custom API Call entries. The server stopped cleanly and its exact `/tmp` state was deleted.

That smoke proves development installation, server health, and served metadata only. There was no browser/editor visual interaction, workflow or node execution, Openmart credential configuration, Openmart API request, or paid work. It does not prove routing execution, item pairing, concurrency behavior, or live Openmart compatibility.

For the prospecting-core batch, an orchestrator-observed disposable smoke used `n8n-node dev` v0.46.4 with `--external-n8n` to install and link the current package into `/tmp/openmart-prospecting-smoke.PG6SCP`. Pinned n8n 2.37.10 started on loopback port 5693, completed migrations and disposable owner setup, and returned `{"status":"ok"}` from `/healthz`. Authenticated `/types/nodes.json` exposed `CUSTOM.openmart`, credential `openmartApi`, and source resources Account, Batch, Business, Company, Person, and Task, plus n8n's injected Custom API Call.

Served Company metadata included default Search and Find Emails (`findEmails`, `POST /api/v1/task/batch/lookup_business_email`, `timeout: 90000`), Search (`search`, `POST /api/v2/brands/search`), and Enrich (`enrich`, `POST /api/v1/enrich_company`). Served Person metadata included default Find Decision Makers and Find Decision Makers (`findDecisionMakers`, `POST /api/v1/task/batch/find_people`, `timeout: 90000`) plus Enrich Known Person (`enrich`, `POST /api/v1/task/batch/lookup_people`, `timeout: 90000`). It also exposed both paid notices; the required controls for each paid operation; Company Search and Enrich defaults and bounds; and isolated resource/operation display conditions.

This prospecting-core smoke proves discovery and the served metadata contract only. It involved no browser visual inspection, workflow or node execution, credential configuration, Openmart request, paid work, routing execution, or input-pairing observation. Fresh pinned n8n acquisition emitted dependency warnings only and did not alter this repository's manifests or dependencies. The server stopped cleanly on `SIGINT`, and the exact disposable folder was deleted with absence verified.

On September 9, 2026, an orchestrator-observed loopback probe with current npm n8n 2.38.1 confirmed that `httpRequestWithAuthentication` sent Bearer authorization but an empty GET body, matching pinned 2.37.10. Its disposable installation was deleted afterward. The user separately reported that a manual n8n HTTP Request node with the Openmart credential sent the documented GET body for ID `01682f76-d0f4-4629-b5f5-02d24fb56f49` and returned Third Space Coffee; POST returned 404, and bodyless GET query transport returned `payload can't be empty`. This was not agent-observed, and no credit effect is inferred. The HTTP Request node remains a manual workaround rather than an advertised Openmart operation.

User testing exposed a pre-fix Company Search discrepancy: the custom node returned a successful empty result for coffee shops in San Francisco, California, while an n8n HTTP Request using the same credential and exact documented body returned Cable Car Coffee SF. Moving the optional numeric store-count fields into an opt-in Store Count collection removed the unintended filter. In a real-n8n post-fix retest with coffee shop / US / CA / San Francisco / limit 1, the user reported that Company Search returned Cable Car Coffee SF plus `openmart_next_cursor`. This positive path and cursor exposure are user-reported live evidence, not agent-observed. Pagination is implemented locally, but live cursor continuation, other filters, empty cases, and credit behavior remain unverified.

The user subsequently reported that a real-n8n Business Search with total Limit 101 returned exactly 101 items. Because the implementation caps provider pages at 100, this demonstrates Business Search second-page cursor continuation and global Limit behavior. This was not agent-observed; the exact query and filters, authenticated response, request logs, unique-ID count, credit delta, Return All, and error paths were not inspected.

The user later reported that Company Find Emails submission succeeded for `n8n.io`, Batch Get Status progressed to completed and ready, Batch Get Task IDs succeeded, and Task Get returned one email. This is user-reported live evidence, not an authenticated response observed by the agent. Other task states, status filters, partial failures, and missing/empty results remain unresolved. The user also reported that Company Enrich for `blackswampai.com` completed as a valid empty/no-match response; no positive enrichment match has been demonstrated.

Availability of `https://blackswampai.com/n8n-nodes/openmart/` was not independently confirmed on September 6, 2026. Direct retrieval was tool-blocked, and a scoped search found no indexed result; neither outcome proves that the page is absent.

## Open questions

- Search docs accept a country code or name and examples vary between `US` and `USA`; the UI intentionally keeps country free text. Search Limit is a total-result cap of 1–1000; API requests use pages of at most 100. Return All is opt-in and stops after 100 pages as a safety bound.
- Company Search's documented positive path and cursor exposure have user-reported live validation. Pagination is implemented and locally contract-tested, but live page-two continuation, preview-key entitlement behavior, other filters, empty cases, and credit behavior remain unverified.
- Business Search page-two continuation and a total Limit of 101 have user-reported live validation. Return All, exact request logs, credit behavior, and pagination error paths remain unverified.
- Endpoint/account entitlements and billing effects.
- The Company Find Emails path demonstrated one user-reported completed/ready batch, task-ID retrieval, and Task Get email result. Other state transitions, status-filter behavior, tracking IDs, partial failures, and missing/empty results require live validation.
- Person → Find Decision Makers remains unexercised against the live paid endpoint. Find Emails' documented `submit_for` labels remain ambiguous beyond the reported successful submission; the response validator deliberately accepts any nonblank label. `notify_url` is not exposed.
- The 0.1.0 release requires a demonstrated Search → email/contact discovery → downstream data handoff, with fixtures and workflow evidence for both branches where appropriate. Sending outreach remains outside this node. Company Emails returns generic shared mailbox `{email,status}` records; Find Decision Makers returns named individual contacts and emails.
- Business Get is formally deferred from 0.1.0 and is not advertised because no supported declarative transport preserves its required GET JSON-array body. It can be reconsidered if Openmart offers POST/query transport or n8n's modern authenticated helper begins preserving GET bodies.

## Future releases / backburner

Not implemented or advertised: Business Get; Detect Tech Stack; Search Business IDs Fast; Get by Google Place ID; Create Deny Rules; Check Deny Rules; Delete Deny Rules.
