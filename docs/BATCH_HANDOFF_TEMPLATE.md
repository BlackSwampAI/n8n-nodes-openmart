# Builder batch handoff

Use this checklist for each bounded implementation batch. Replace bracketed prompts before assigning work.

## Scope

- Goal: `[one independently reviewable outcome]`
- Allowed files: `[explicit allowlist]`
- Non-goals: `[operations, dependencies, architecture, and external actions excluded]`
- Escalate before: dependencies, public API changes, architecture changes, release actions, or scope expansion.

## Evidence and tests

- Compare generated API contracts, current human documentation, and pinned live behavior when an external API is involved.
- Test real n8n parameter shapes, including expression values and resource-locator list objects.
- Ensure required controls are visible and marked required for every advertised operation.
- Prove invalid blank/default state fails locally before transport when it cannot form a valid request.
- Add a harmless credential test where supported and assert intended nodes reference the credential.
- Use exact, run-owned live fixtures with fail-closed target guards and cleanup assertions. Never sweep by prefix.

## Handoff

- Summary and files changed
- Contract/runtime discrepancies
- Commands and exact results
- Package or UI smoke evidence, clearly distinguished from metadata inference
- Cleanup status, limitations, risks, and decisions still needed
- `git diff --check` and allowed-file review result
