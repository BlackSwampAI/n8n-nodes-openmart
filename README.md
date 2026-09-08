# Openmart for n8n

Use Openmart account, business-search, company-email, people-search, batch, and task data in n8n workflows. The integration exposes balance and business search, paid background creation, and reads for asynchronous work.

> This is an independent Black Swamp AI community integration. It is not affiliated with, endorsed by, sponsored by, or maintained by Openmart. Product names and marks belong to their respective owners and are used only to identify compatibility.

[Installation](#installation) · [Compatibility](#compatibility) · [Credentials](#credentials) · [Operations](#operations) · [Usage](#usage) · [Troubleshooting](#troubleshooting) · [Resources](#resources)

## Installation

Distribution is unavailable. There is no supported public installation path for this package. Maintainers can use the repository's local build and package-smoke commands for development validation.

## Compatibility

| Surface             | Tested baseline                          | Notes                                                                                                   |
| ------------------- | ---------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| n8n                 | 2.37.10                                  | Disposable server metadata confirmed discovery and icon URLs; no visual editor execution was performed. |
| Openmart API        | Documentation reviewed September 7, 2026 | The user reports successful credential save, Balance, and Business Search; paid creation was not run.   |
| Node.js development | 22.22.0 and 24                           | Repository CI targets both versions; local results are recorded in [testing notes](docs/testing.md).    |

## Credentials

Create an **Openmart API** credential and enter an Openmart API key. Requests use `Authorization: Bearer` authentication against the fixed production API origin. The credential test performs only `GET /api/v2/credit-balance`; HTTP success authenticates independently of balance truthiness, so a valid integer balance of zero is accepted.

Never commit API keys or real prospect data.

## Operations

- **Account → Get Credit Balance** returns Openmart's `period_start`, `period_end`, and integer `balance` fields without converting credits to currency.
- **Business → Search** submits a required query with an optional location and initial website/contact/location-count filters, then returns one n8n item per provider business.
- **Company Email → Create** starts paid background work to find generic shared inbox addresses and returns its batch submission envelope.
- **People Search → Create** starts paid background work to find decision makers and returns its batch submission envelope.
- **Batch → Get Status** returns readiness and progress counts plus the normalized requested `batch_id` for direct chaining.
- **Batch → Get Task IDs** optionally filters by a free-text status such as `COMPLETED`, then emits one `{task_id,batch_id}` item per returned task for direct chaining.
- **Task → Get** returns the full provider task envelope, including available result data.

Business retrieval, search pagination, and polling are not advertised yet.

## Usage

Add the Openmart node, select **Account → Get Credit Balance**, and attach an Openmart API credential. Each input item produces one provider response and retains item pairing.

The node uses n8n's declarative request routing and makes one request per input item. It does not add hidden retries; use n8n's workflow or node retry settings deliberately when appropriate. With **Continue On Fail**, n8n retains errors for their originating inputs.

Business Search accepts a 1–500 character query and returns only its first page. Limit defaults to 10 and is capped at 100, a conservative cap compatible with documented preview keys even though the general documentation states a maximum of 1000. Country, state, and city are free text; country codes and names are both documented, so the node does not force `US` or `USA`. Search always requests `estimate_total: false`, sends no cursor, and is never retried automatically because its credit effect has not been verified.

Batch and Task reads require an existing ID. Declarative routing may schedule multiple input-item requests concurrently. IDs are trimmed and encoded as one URL path segment. The node does not poll or retry internally: chain Get Status, Get Task IDs, and Task Get explicitly according to workflow needs.

Company Email and People Search consume Openmart credits and create background work. Each input item submits exactly one task and returns immediately after Openmart accepts the batch; use the Batch and Task operations to retrieve results. The 90-second request timeout accommodates documented submission latency, but it does not poll. These creation requests have no internal retry. Enabling n8n **Retry On Fail** or manually rerunning an execution can create and charge for duplicate work, so verify the batch outcome before retrying.

## Troubleshooting

- Confirm the API key is current and copied without surrounding whitespace.
- HTTP 401 indicates an unknown or invalid key according to the reviewed Openmart documentation.
- A zero balance is a valid authenticated response, not an authentication failure.
- HTTP 402 indicates a credit-limit problem; HTTP 403 indicates permission or endpoint entitlement; HTTP 429 or 500–504 may be suitable for n8n's explicit retry settings on safe reads.
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
