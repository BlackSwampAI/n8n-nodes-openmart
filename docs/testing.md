# Testing and compatibility notes

## Batch 1 evidence

Strict Vitest contracts cover package registration, node metadata, credential wiring and request configuration, a mocked balance response including `balance: 0`, and the absence of unintended operations. A loopback recording-server test proves Node's HTTP client can place a JSON array on a GET request at the wire level.

The GET-body probe does **not** prove that n8n's authenticated HTTP helper sends GET bodies, nor that Openmart accepts this request live. That remains a Batch 2/later-operation gap.

Package gates build the TypeScript, run the pinned official source scanner, inspect the dry-run package boundary, load registrations, and install the packed artifact in an isolated consumer. These are local and mocked checks, not a representative n8n editor/runtime test.

## Live testing status

No Openmart API key is configured. No live Openmart request, paid operation, real prospect lookup, actual n8n editor inspection, icon theme visual inspection, or Creator Portal inspection has been performed. A small harmless live credit-balance request and representative actual-n8n execution remain required before release and require explicit authorization.

## Safety

- Never store credentials or real prospect records in fixtures or tracked files.
- Do not run paid search or people-discovery calls without explicit authorization.
- Treat provider documentation as contract evidence, not proof of account entitlement or runtime behavior.
- Run the full gate list in `RELEASING.md` on the exact reviewed release commit.
