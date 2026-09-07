# Openmart for n8n

Use Openmart account, business-search, batch, and task data in n8n workflows. The integration exposes a safe balance lookup, bounded first-page business search, and reads for existing asynchronous work.

> This is an independent Black Swamp AI community integration. It is not affiliated with, endorsed by, sponsored by, or maintained by Openmart. Product names and marks belong to their respective owners and are used only to identify compatibility.

[Installation](#installation) · [Compatibility](#compatibility) · [Credentials](#credentials) · [Operations](#operations) · [Usage](#usage) · [Troubleshooting](#troubleshooting) · [Resources](#resources)

## Installation

Distribution is unavailable. There is no supported public installation path for this package. Maintainers can use the repository's local build and package-smoke commands for development validation.

## Compatibility

| Surface             | Tested baseline                          | Notes                                                                                                   |
| ------------------- | ---------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| n8n                 | 2.37.10                                  | Disposable server metadata confirmed discovery and icon URLs; no visual editor execution was performed. |
| Openmart API        | Documentation reviewed September 6, 2026 | No API key was configured and no live request was made.                                                 |
| Node.js development | 22.22.0 and 24                           | Repository CI targets both versions; local results are recorded in [testing notes](docs/testing.md).    |

## Credentials

Create an **Openmart API** credential and enter an Openmart API key. Requests use `Authorization: Bearer` authentication against the fixed production API origin. The credential test performs only `GET /api/v2/credit-balance`; HTTP success authenticates independently of balance truthiness, so a valid integer balance of zero is accepted.

Never commit API keys or real prospect data.

## Operations

- **Account → Get Credit Balance** returns Openmart's `period_start`, `period_end`, and integer `balance` fields without converting credits to currency.
- **Business → Search** submits a required query with an optional location and initial website/contact/location-count filters, then returns one n8n item per provider business.
- **Batch → Get Status** returns readiness and progress counts plus the normalized requested `batch_id` for direct chaining.
- **Batch → Get Task IDs** optionally filters by a free-text status such as `COMPLETED`, then emits one `{task_id,batch_id}` item per returned task for direct chaining.
- **Task → Get** returns the full provider task envelope, including available result data.

Business retrieval, search pagination, polling, and paid creation operations are not advertised yet.

## Usage

Add the Openmart node, select **Account → Get Credit Balance**, and attach an Openmart API credential. Each input item produces one provider response and retains item pairing.

Balance requests run sequentially. Rate limits, Openmart HTTP 500–504 responses, and recognized network/timeouts are retried up to three total attempts with bounded delay; permanent validation, authentication, credit, permission, and missing-route errors are not retried. With **Continue On Fail**, each error remains paired to its originating input.

Business Search accepts a 1–500 character query and returns only its first page. Limit defaults to 10 and is capped at 100, a conservative cap compatible with documented preview keys even though the general documentation states a maximum of 1000. Country, state, and city are free text; country codes and names are both documented, so the node does not force `US` or `USA`. Search always requests `estimate_total: false`, sends no cursor, and is never retried automatically because its credit effect has not been verified.

Batch and Task reads require an existing ID, process input items sequentially, and use the same bounded safe-read retry policy as balance retrieval. IDs are trimmed and encoded as one URL path segment. The node does not poll: chain Get Status, Get Task IDs, and Task Get explicitly according to workflow needs.

## Troubleshooting

- Confirm the API key is current and copied without surrounding whitespace.
- HTTP 401 indicates an unknown or invalid key according to the reviewed Openmart documentation.
- A zero balance is a valid authenticated response, not an authentication failure.
- HTTP 402 indicates a credit-limit problem; HTTP 403 indicates permission or endpoint entitlement; HTTP 429 or 500–504 may still fail after bounded retries.
- Report reproducible defects in [GitHub Issues](https://github.com/BlackSwampAI/n8n-nodes-openmart/issues) without including secrets.

## Resources

- [Black Swamp AI package page](https://blackswampai.com/n8n-nodes/openmart/)
- [Openmart API documentation](https://app.openmart.com/api-docs/quickstart)
- [n8n community nodes documentation](https://docs.n8n.io/integrations/community-nodes/)
- [API matrix](docs/api-matrix.md)
- [Compatibility and testing notes](docs/testing.md)
- [Branding provenance](docs/branding.md)
- [Changelog](CHANGELOG.md)

## License

[MIT](LICENSE.md)
