# Changelog

## Unreleased

- Add bounded declarative cursor pagination for Business and Company Search with standard Return All/Limit controls, global limits, cursor validation, deduplication, and page-count safety.
- Replace the generated SVG icons with byte-identical light/dark packaging copies of Openmart's official color PNG mark.
- Consolidate prospecting under Company and Person resources; add brand-level Company Search, Company Enrich, and known-person enrichment.
- Prevent blank Company Search store-count controls from materializing as an unintended zero-store filter; clarify brand/store semantics, enrichment scope, state guidance, and async result retrieval.
- Add declarative Company Email Create and People Search Create operations with normalized domains, one-task submissions, validated batch envelopes, and no internal retries.
- Convert all existing operations to declarative routing and remove custom safe-read retries.
- Add Batch Get Status, Batch Get Task IDs, and Task Get with validated responses and declarative item handling.
- Add Business Search first-page routing with query/location/filter validation, no hidden retry, response validation, and item pairing.
- Harden balance response validation, status-aware error redaction, and declarative per-item handling.
- Add actual n8n 2.37.10 helper and disposable-server evidence, including the confirmed GET-body limitation.
- Convert the template to the Openmart package identity and remove demonstration nodes and credentials.
- Add the Openmart API credential and Account Get Credit Balance operation.
- Add product API, testing, branding, plan, and status documentation.
- Correct the generated-project branding audit lifecycle while retaining fail-closed checks.
