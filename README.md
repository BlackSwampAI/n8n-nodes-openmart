# Openmart for n8n

Use Openmart account data in n8n workflows. This initial integration exposes a safe balance lookup while the remaining API operations are validated in later batches.

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

No Business Search, business retrieval, people search, batch, or task operation is advertised yet.

## Usage

Add the Openmart node, select **Account → Get Credit Balance**, and attach an Openmart API credential. Each input item produces one provider response and retains item pairing.

Balance requests run sequentially. Rate limits, Openmart HTTP 500–504 responses, and recognized network/timeouts are retried up to three total attempts with bounded delay; permanent validation, authentication, credit, permission, and missing-route errors are not retried. With **Continue On Fail**, each error remains paired to its originating input.

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
