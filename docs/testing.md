# Testing and compatibility notes

## Batch 2 local and mocked evidence

Strict Vitest contracts cover package registration, node metadata, credential wiring and request configuration, zero balance, malformed successful responses, sequential pairing, empty inputs, per-item continuation, sanitized status failures, permanent-error no-retry behavior, bounded transient retries, `Retry-After` caps, and explicit non-retry mode. A loopback recording-server test proves Node's raw HTTP client can place a JSON array on a GET request at the wire level.

The opt-in test guard is exactly `OPENMART_N8N_PACKAGE_PATH`; ordinary `npm test` skips the integration test when this caller-supplied package directory is absent. With a disposable pinned `n8n@2.37.10` installation, this command passed:

```sh
OPENMART_N8N_PACKAGE_PATH=/tmp/<disposable>/node_modules/n8n npm test -- --run tests/openmart-n8n-helper.test.ts
```

The actual `httpRequestWithAuthentication` path applied the fake credential (`Authorization: Bearer fake-loopback-key`) but the loopback server received an empty GET body. This confirms n8n 2.37.10 drops the documented Business Get JSON-array body. It does not prove live Openmart behavior. Business Get is blocked until Openmart documents a compatible alternative.

## Disposable n8n 2.37.10 smoke

A pinned disposable `/tmp` installation reported version `2.37.10`, started on loopback, returned `{"status":"ok"}` from `/healthz`, and exposed authenticated type metadata after disposable owner setup. The metadata contained `CUSTOM.openmart`, its Openmart API credential, Account/Get Credit Balance source operation, and light/dark icon URLs. Fetching both icon URLs produced exact SHA-256 matches to the tracked assets.

n8n augmented the metadata with its own **Custom API Call** entries and a `CUSTOM.openmartTool` wrapper; those are host-generated and absent from this package's source description. No browser was opened, so node placement, visual themes, and execution were not demonstrated. The disposable package and user-state directories were removed after shutdown.

Package gates build the TypeScript, run the pinned official source scanner, inspect the dry-run package boundary, load registrations, and install the packed artifact in an isolated consumer. These checks and the server metadata smoke do not constitute a live Openmart test.

## Live testing status

No Openmart API key is configured. No live Openmart request, paid operation, real prospect lookup, browser/editor interaction, visual icon theme inspection, balance execution inside n8n, or Creator Portal inspection has been performed. A small harmless live credit-balance request and representative actual-n8n execution remain required before release and require explicit authorization.

## Safety

- Never store credentials or real prospect records in fixtures or tracked files.
- Do not run paid search or people-discovery calls without explicit authorization.
- Treat provider documentation as contract evidence, not proof of account entitlement or runtime behavior.
- Run the full gate list in `RELEASING.md` on the exact reviewed release commit.
