# Testing and compatibility notes

## Batch 2 local and mocked evidence

Strict Vitest contracts cover package registration, declarative node metadata, credential wiring and fixed request defaults, zero balance, malformed successful responses, and sanitized status failures. Hook contracts cover pre-send validation and post-receive shaping. A loopback recording-server test proves Node's raw HTTP client can place a JSON array on a GET request at the wire level.

The opt-in test guard is exactly `OPENMART_N8N_PACKAGE_PATH`; ordinary `npm test` skips the integration test when this caller-supplied package directory is absent. With a disposable pinned `n8n@2.37.10` installation, this command passed:

```sh
OPENMART_N8N_PACKAGE_PATH=/tmp/<disposable>/node_modules/n8n npm test -- --run tests/openmart-n8n-helper.test.ts
```

The actual `httpRequestWithAuthentication` path applied the fake credential (`Authorization: Bearer fake-loopback-key`) but the loopback server received an empty GET body. This confirms the recommended n8n 2.37.10 path drops the documented Business Get JSON-array body. Deprecated legacy transport preserved it in loopback, but Business Get is formally deferred from 0.1.0 rather than relying on deprecated transport. It does not prove live Openmart behavior.

On September 9, 2026, an orchestrator-observed loopback probe repeated the modern-helper test with current npm n8n 2.38.1. `httpRequestWithAuthentication` sent Bearer authorization but again sent an empty GET body, matching pinned 2.37.10. The disposable 2.38.1 installation was deleted afterward. There is therefore no supported declarative transport for the endpoint's required GET JSON-array body in the tested modern n8n versions.

Separately, the user reported that an n8n HTTP Request node using the Openmart credential successfully called the documented GET-body endpoint with Openmart ID `01682f76-d0f4-4629-b5f5-02d24fb56f49` and returned Third Space Coffee. The same route returned HTTP 404 when called with POST, while GET with `?openmart_id=<id>` and no body returned `payload can't be empty`. This was not agent-observed, and no credit effect is inferred. The HTTP Request node is a manual workaround, not an advertised Openmart node operation or declarative implementation. Business Get can be reconsidered if Openmart offers POST/query transport or n8n's modern authenticated helper preserves GET bodies.

## Disposable n8n 2.37.10 smoke

A pinned disposable `/tmp` installation reported version `2.37.10`, started on loopback, returned `{"status":"ok"}` from `/healthz`, and exposed authenticated type metadata after disposable owner setup. The metadata contained `CUSTOM.openmart`, its Openmart API credential, Account/Get Credit Balance source operation, and light/dark icon URLs. Fetching both icon URLs produced exact SHA-256 matches to the tracked assets.

n8n augmented the metadata with its own **Custom API Call** entries and a `CUSTOM.openmartTool` wrapper; those are host-generated and absent from this package's source description. No browser was opened, so node placement, visual themes, and execution were not demonstrated. The disposable package and user-state directories were removed after shutdown.

Package gates build the TypeScript, run the pinned official source scanner, inspect the dry-run package boundary, load registrations, and install the packed artifact in an isolated consumer. These checks and the server metadata smoke do not constitute a live Openmart test.

## Post-conversion declarative development smoke

`n8n-node dev` v0.46.4 successfully built, watched, and installed the converted package using `--external-n8n` and a disposable custom-user folder under `/tmp`. Cached pinned n8n 2.37.10 then started healthy on loopback; `/healthz` returned `{"status":"ok"}`. After disposable owner setup, authenticated `/types/nodes.json` exposed `CUSTOM.openmart`, credential `openmartApi`, and these declarative request defaults:

```json
{
	"baseURL": "https://api.openmart.ai",
	"json": true,
	"returnFullResponse": true,
	"ignoreHttpStatusErrors": true
}
```

The served metadata included all five source operation values: `getCreditBalance`, `search`, `getStatus`, `getTaskIds`, and `get`. Host-injected `__CUSTOM_API_CALL__` entries also appeared. The server stopped cleanly and the exact temporary folder was deleted.

This smoke proves build/watch installation, health, and metadata discovery only. No browser/editor interaction, workflow or node execution, Openmart credential configuration, or Openmart API request occurred. It does not prove declarative routing execution, input-item pairing, scheduling or concurrency behavior, or live Openmart compatibility.

## Batch 3 Business Search evidence

Synthetic fixtures based on the documented top-level array cover multiple results, empty results, optional/null content fields, match metadata, and the two-element cursor value retained on provider records. Tests exercise declarative request metadata, the minimal pre-send request, one-element location array, top-level initial filters, defaults, validation before transport, one-to-many post-receive output, atomic response validation, and sanitized HTTP failure handling.

A fresh disposable user folder on the existing functional pinned n8n `2.37.10` cache reached a healthy server and completed disposable owner setup. Authenticated source metadata exposed `CUSTOM.openmart` with Account and Business resources, Account/Get Credit Balance, and Business/Search. Search metadata showed required Query; Limit (`resultLimit`) default 10 with minimum 1 and maximum 100; and Location and Filters restricted to Business/Search by display conditions. The `openmartApi` credential was present. n8n also injected its own **Custom API Call** options, which are host behavior and are not advertised by the package source. Both served icon URLs matched the tracked assets exactly by SHA-256. The instance was stopped and its exact temporary folder was deleted.

This actual-n8n check demonstrates discovery and metadata serving, not browser/editor rendering or node execution. It used no Openmart key and made no Openmart request.

No search request was sent to Openmart. The exact accepted filter combinations, account entitlement, credit effect, result variability, and performance remain live gaps. `estimate_total:false` fixes the documented top-level array shape for this batch; pagination and cursor input are not implemented.

## Batch 4 asynchronous retrieval evidence

Synthetic fixtures and strict tests cover Batch/Get Status, Batch/Get Task IDs, and Task/Get declarative metadata and hooks. They verify trimmed IDs encoded as one path segment, normalized requested `batch_id` correlation, optional status omission/mapping, GET requests without bodies, preserved unknown fields, atomic malformed-response rejection, empty task-ID arrays, one-to-many output, and sanitized errors. Task Get intentionally permits optional, null, empty, or missing result data pending live evidence. There is no internal retry or polling loop. Multiple-input scheduling and pairing rely on n8n's declarative routing runtime and still require an actual execution smoke.

A fresh disposable user folder on cached pinned n8n `2.37.10` reached healthy loopback status and completed disposable owner setup. Authenticated type metadata exposed credential `openmartApi`; Account, Batch, Business, and Task resources; Batch/Get Status (`getStatus`) and Batch/Get Task IDs (`getTaskIds`); Task/Get (`get`); required Batch ID for both Batch operations; optional Status only for Batch/Get Task IDs; and required Task ID only for Task/Get. n8n injected host-owned `__CUSTOM_API_CALL__` resource/operation entries that are absent from the package's advertised source surface. The server was stopped and the exact temporary script and state were deleted.

This actual-n8n observation proves health, discovery, and served metadata only. There was no browser/editor visual inspection or node execution. No Openmart API key was configured and no Openmart request, live read, or paid call occurred. Actual task states, status filtering, entitlements, partial failures, tracking IDs, and missing-result behavior remain unverified.

## Live testing status

No Openmart API key is configured in the automated test environment. This implementation run performed no live Openmart request, paid operation, real prospect lookup, browser/editor interaction, visual icon theme inspection, workflow execution inside n8n, or Creator Portal inspection. Live checks require explicit authorization.

After PR #9 CI and the pagination README correction, the user reported another successful manual smoke of the local build. The exact operations, inputs, and results were not supplied, so this report does not extend operation-specific live coverage.

The user accepted Person → Find Decision Makers live paid validation as a disclosed 0.1.0 gap. The exact npm-published 0.1.0 artifact will be tested after publication, and that smoke is a hard gate before Creator Portal submission. If it reveals a defect requiring code or documentation changes, a new immutable version (expected 0.1.1) must be published and that exact version submitted; published 0.1.0 must not be overwritten.

## Batch 5 paid creation evidence

Metadata and hook-contract tests cover Company Email Create and People Search Create routes, 90-second timeouts, required/default controls, one-element request arrays, domain normalization and rejection, optional-field trimming, people-search boundaries, response preservation, normalized `submitted` context, malformed-success rejection, and sanitized HTTP errors. Source and package gates provide no evidence of live paid behavior. No paid request, polling, or retry was performed.

On September 7, 2026, the user reported that saving the credential and running live Balance and Business Search succeeded. This is user-reported evidence, not an authenticated response or timing observed by this implementation run. At that point, Batch and Task reads remained unverified because no batch or task IDs existed, and the new Company Email and People Search creation operations had not been run live.

An orchestrator-observed post-Batch-5 disposable metadata smoke used `n8n-node dev` v0.46.4 with `--external-n8n` to build, watch, and install the package successfully. Pinned n8n 2.37.10 then started healthy on loopback. After disposable owner setup, authenticated `/types/nodes.json` exposed `CUSTOM.openmart` with Company Email and People Search plus Account, Batch, Business, and Task. The two Create operations served these exact request settings:

- Company Email: `POST /api/v1/task/batch/lookup_business_email`, `timeout: 90000`.
- People Search: `POST /api/v1/task/batch/find_people`, `timeout: 90000`.

The metadata also served credential `openmartApi`, the paid-work notice, required and default controls, and their resource/operation display conditions. n8n injected host-owned Custom API Call entries. The server stopped cleanly and the exact disposable `/tmp` state was deleted.

This is installation, health, and served-metadata evidence only. No browser/editor visual interaction, workflow or node execution, Openmart credential configuration, Openmart API request, or paid work occurred. The smoke makes no claim about routing execution, item pairing, concurrency, or live Openmart compatibility.

## Prospecting core local evidence

TypeScript hook and metadata contracts cover the consolidated Company/Person identities, exact declarative routes, guarded brand search, company enrichment, and one-task known-person enrichment. Business and Company Search now use n8n's declarative function-pagination contract. Tests cover default single-page limits, provider-specific cursor body placement, multi-page traversal, empty/exhausted pages, repeated and malformed cursors, provider-ID deduplication, global truncation, atomic later-page failures, and the 100-page Return All safety bound. `openmart_next_cursor` remains on Company results. No live page-two call or actual n8n pagination execution was performed for this pagination batch.

After implementation, the user reported that a real-n8n Business Search configured with total Limit 101 returned exactly 101 items. Since each provider request is capped at 100 results, this is user-reported evidence of actual second-page cursor continuation and global Limit behavior for Business Search. It was not agent-observed and does not establish the exact query/filter inputs, authenticated response, request logs, unique-ID count, credit delta, Return All behavior, Company pagination, or pagination error paths.

An orchestrator-observed disposable prospecting-core metadata smoke used `n8n-node dev` v0.46.4 with `--external-n8n` to install and link the current package into `/tmp/openmart-prospecting-smoke.PG6SCP`. Pinned n8n 2.37.10 started on loopback port 5693, completed migrations and disposable owner setup, and returned `{"status":"ok"}` from `/healthz`. Authenticated `/types/nodes.json` exposed `CUSTOM.openmart`, credential `openmartApi`, and the source resources Account, Batch, Business, Company, Person, and Task, alongside n8n's injected Custom API Call.

The served Company operations were Find Emails (`findEmails`, `POST /api/v1/task/batch/lookup_business_email`, `timeout: 90000`), Search (`search`, `POST /api/v2/brands/search`), and Enrich (`enrich`, `POST /api/v1/enrich_company`), with Search as the default. The served Person operations were Find Decision Makers (`findDecisionMakers`, `POST /api/v1/task/batch/find_people`, `timeout: 90000`) and Enrich Known Person (`enrich`, `POST /api/v1/task/batch/lookup_people`, `timeout: 90000`), with Find Decision Makers as the default. Metadata included both paid notices; required Domain and Company Name for Find Emails; required Domain, Title, Max Contacts, and Contact Information for Find Decision Makers; required Domain, People, and Contact Information for known-person enrichment; Company Search and Enrich defaults and bounds; and isolated resource/operation display conditions.

This proves discovery and the served metadata contract only. There was no browser visual inspection, workflow or node execution, credential configuration, Openmart request, paid work, routing execution, or input-pairing observation. Fresh pinned n8n acquisition emitted dependency warnings only and did not alter this repository's manifests or dependencies. The server stopped cleanly on `SIGINT`; the exact disposable folder was deleted and its absence verified.

Subsequent user testing found a Company Search discrepancy before the store-count fix: the custom node returned a successful empty result for coffee shops in San Francisco, California, while an n8n HTTP Request using the same credential and exact documented JSON returned Cable Car Coffee SF. Moving the optional numeric store-count fields into an opt-in collection removed the unintended filter. In a real-n8n post-fix retest with coffee shop / US / CA / San Francisco / limit 1, the user reported that the custom Company Search returned Cable Car Coffee SF plus `openmart_next_cursor`. This validates the positive first page and cursor exposure by user report, not agent observation. It does not validate the newly implemented cursor continuation, preview-key behavior, other filters, empty cases, or credit behavior.

The user later reported a successful Company Find Emails submission for `n8n.io`: Batch Get Status progressed to completed and ready, Batch Get Task IDs succeeded, and Task Get returned one email. This is user-reported live evidence, not an agent-observed authenticated response. Other task states, status filters, partial failures, and missing/empty result behavior remain unverified. The user also reported a valid empty/no-match Company Enrich run for `blackswampai.com`; that confirms an accepted empty result, not a positive enrichment match.

## Safety

- Never store credentials or real prospect records in fixtures or tracked files.
- Do not run paid search or people-discovery calls without explicit authorization.
- Treat provider documentation as contract evidence, not proof of account entitlement or runtime behavior.
- Run the full gate list in `RELEASING.md` on the exact reviewed release commit.
