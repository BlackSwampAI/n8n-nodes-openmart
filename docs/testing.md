# Testing and compatibility notes

## Batch 2 local and mocked evidence

Strict Vitest contracts cover package registration, node metadata, credential wiring and request configuration, zero balance, malformed successful responses, sequential pairing, empty inputs, per-item continuation, sanitized status failures, permanent-error no-retry behavior, bounded transient retries, `Retry-After` caps, and explicit non-retry mode. A loopback recording-server test proves Node's raw HTTP client can place a JSON array on a GET request at the wire level.

The opt-in test guard is exactly `OPENMART_N8N_PACKAGE_PATH`; ordinary `npm test` skips the integration test when this caller-supplied package directory is absent. With a disposable pinned `n8n@2.37.10` installation, this command passed:

```sh
OPENMART_N8N_PACKAGE_PATH=/tmp/<disposable>/node_modules/n8n npm test -- --run tests/openmart-n8n-helper.test.ts
```

The actual `httpRequestWithAuthentication` path applied the fake credential (`Authorization: Bearer fake-loopback-key`) but the loopback server received an empty GET body. This confirms the recommended n8n 2.37.10 path drops the documented Business Get JSON-array body. Deprecated legacy transport preserved it in loopback, so the unresolved issue is a supported-path compatibility decision rather than universal transport impossibility. It does not prove live Openmart behavior.

## Disposable n8n 2.37.10 smoke

A pinned disposable `/tmp` installation reported version `2.37.10`, started on loopback, returned `{"status":"ok"}` from `/healthz`, and exposed authenticated type metadata after disposable owner setup. The metadata contained `CUSTOM.openmart`, its Openmart API credential, Account/Get Credit Balance source operation, and light/dark icon URLs. Fetching both icon URLs produced exact SHA-256 matches to the tracked assets.

n8n augmented the metadata with its own **Custom API Call** entries and a `CUSTOM.openmartTool` wrapper; those are host-generated and absent from this package's source description. No browser was opened, so node placement, visual themes, and execution were not demonstrated. The disposable package and user-state directories were removed after shutdown.

Package gates build the TypeScript, run the pinned official source scanner, inspect the dry-run package boundary, load registrations, and install the packed artifact in an isolated consumer. These checks and the server metadata smoke do not constitute a live Openmart test.

## Batch 3 Business Search evidence

Synthetic fixtures based on the documented top-level array cover multiple results, empty results, optional/null content fields, match metadata, and the two-element cursor value retained on provider records. Tests exercise the minimal request, one-element location array, top-level initial filters, defaults, trimmed expression-resolved values, 500-character boundary, invalid query/limit/minimum-locations before transport, one-to-many input pairing, atomic response validation, per-input continuation, and no retry after a transient POST failure.

A fresh disposable user folder on the existing functional pinned n8n `2.37.10` cache reached a healthy server and completed disposable owner setup. Authenticated source metadata exposed `CUSTOM.openmart` with Account and Business resources, Account/Get Credit Balance, and Business/Search. Search metadata showed required Query; Limit (`resultLimit`) default 10 with minimum 1 and maximum 100; and Location and Filters restricted to Business/Search by display conditions. The `openmartApi` credential was present. n8n also injected its own **Custom API Call** options, which are host behavior and are not advertised by the package source. Both served icon URLs matched the tracked assets exactly by SHA-256. The instance was stopped and its exact temporary folder was deleted.

This actual-n8n check demonstrates discovery and metadata serving, not browser/editor rendering or node execution. It used no Openmart key and made no Openmart request.

No search request was sent to Openmart. The exact accepted filter combinations, account entitlement, credit effect, result variability, and performance remain live gaps. `estimate_total:false` fixes the documented top-level array shape for this batch; pagination and cursor input are not implemented.

## Batch 4 asynchronous retrieval evidence

Synthetic fixtures and strict tests cover Batch/Get Status, Batch/Get Task IDs, and Task/Get metadata and execution. They verify trimmed IDs encoded as one path segment, normalized requested `batch_id` correlation on status output, optional non-required status visibility and trimmed omission/mapping, GET requests without bodies, safe-read retry behavior, preserved unknown fields, atomic malformed-response rejection, empty task-ID arrays, one-to-many and multiple-input pairing, Continue On Fail, and sanitized errors. Task Get intentionally permits optional, null, empty, or missing result data pending live evidence. There is no internal polling loop.

A fresh disposable user folder on cached pinned n8n `2.37.10` reached healthy loopback status and completed disposable owner setup. Authenticated type metadata exposed credential `openmartApi`; Account, Batch, Business, and Task resources; Batch/Get Status (`getStatus`) and Batch/Get Task IDs (`getTaskIds`); Task/Get (`get`); required Batch ID for both Batch operations; optional Status only for Batch/Get Task IDs; and required Task ID only for Task/Get. n8n injected host-owned `__CUSTOM_API_CALL__` resource/operation entries that are absent from the package's advertised source surface. The server was stopped and the exact temporary script and state were deleted.

This actual-n8n observation proves health, discovery, and served metadata only. There was no browser/editor visual inspection or node execution. No Openmart API key was configured and no Openmart request, live read, or paid call occurred. Actual task states, status filtering, entitlements, partial failures, tracking IDs, and missing-result behavior remain unverified.

## Live testing status

No Openmart API key is configured. No live Openmart request, paid operation, real prospect lookup, browser/editor interaction, visual icon theme inspection, balance or search execution inside n8n, or Creator Portal inspection has been performed. Live checks require explicit authorization.

## Safety

- Never store credentials or real prospect records in fixtures or tracked files.
- Do not run paid search or people-discovery calls without explicit authorization.
- Treat provider documentation as contract evidence, not proof of account entitlement or runtime behavior.
- Run the full gate list in `RELEASING.md` on the exact reviewed release commit.
