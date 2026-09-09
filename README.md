# Openmart for n8n

Use Openmart account, business-search, company-email, people-search, batch, and task data in n8n workflows. The integration exposes balance and business search, paid background creation, and reads for asynchronous work.

> This is an independent Black Swamp AI community integration. It is not affiliated with, endorsed by, sponsored by, or maintained by Openmart. Product names and marks belong to their respective owners and are used only to identify compatibility.

[Installation](#installation) · [Compatibility](#compatibility) · [Credentials](#credentials) · [Operations](#operations) · [Usage](#usage) · [Troubleshooting](#troubleshooting) · [Resources](#resources)

## Installation

An Owner or Admin can install the published package on self-hosted n8n:

1. Open **Settings → Community Nodes → Install**.
2. Review and accept the warning about installing unverified code.
3. Enter the exact npm package name `@blackswampai/n8n-nodes-openmart` and select **Install**.

Until n8n verification is granted, this package is not available as a verified community node on n8n Cloud. See n8n's [GUI installation guide](https://docs.n8n.io/integrations/community-nodes/installation-and-management/gui-installation/) for current self-hosted requirements and management steps.

## Compatibility

| Surface             | Tested baseline                          | Notes                                                                                                                     |
| ------------------- | ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| n8n                 | 2.37.10                                  | Disposable server metadata confirmed discovery and icon URLs; no visual editor execution was performed.                   |
| Openmart API        | Documentation reviewed September 9, 2026 | User-reported live success covers credential save, Balance, Business Search, and the Company Find Emails retrieval chain. |
| Node.js development | 22.22.0 and 24                           | Repository CI targets both versions; local results are recorded in [testing notes](docs/testing.md).                      |

## Credentials

Create an **Openmart API** credential and enter an Openmart API key. Requests use `Authorization: Bearer` authentication against the fixed production API origin. The credential test performs only `GET /api/v2/credit-balance`; HTTP success authenticates independently of balance truthiness, so a valid integer balance of zero is accepted.

Never commit API keys or real prospect data.

## Operations

- **Account → Get Credit Balance** returns Openmart's `period_start`, `period_end`, and integer `balance` fields without converting credits to currency.
- **Business → Search** submits a required query with an optional location and initial website/contact/location-count filters, then returns one n8n item per provider business.
- **Company → Search** returns brand-level company records, not physical stores.
- **Company → Enrich** matches company records from a website or social-media link.
- **Company → Find Emails** starts paid background work to find generic shared inbox addresses.
- **Person → Find Decision Makers** starts paid background work to discover contacts by title.
- **Person → Enrich Known Person** starts paid background work for 1–8 named people.
- **Batch → Get Status** returns readiness and progress counts plus the normalized requested `batch_id` for direct chaining.
- **Batch → Get Task IDs** optionally filters by a free-text status such as `COMPLETED`, then emits one `{task_id,batch_id}` item per returned task for direct chaining.
- **Task → Get** returns the full provider task envelope, including available result data.

Business Get and automatic polling are not advertised.

## Usage

Add the Openmart node, select **Account → Get Credit Balance**, and attach an Openmart API credential. Each input item produces one provider response and retains item pairing.

The node uses n8n's declarative request routing. Non-search operations make one request per input item. Searches make one request by default and may make additional cursor-page requests when **Limit** exceeds 100 or **Return All** is enabled. The node does not add hidden retries; use n8n's workflow or node retry settings deliberately when appropriate. With **Continue On Fail**, n8n retains errors for their originating inputs.

Business Search accepts a 1–500 character query. **Return All** is off by default; otherwise **Limit** is the total number emitted, defaults to 10, and accepts 1–1000. Provider requests contain at most 100 results per page. Pagination stops on an empty page or exhausted cursor, rejects repeated or malformed cursors, and has a 100-page safety ceiling. Search always requests `estimate_total: false` and is never retried automatically because its credit effect has not been verified. Country, state, and city are free text; country codes and names are both documented, so the node does not force `US` or `USA`. The user reported that a real-n8n Business Search with Limit 101 returned exactly 101 items, demonstrating second-page continuation and the total Limit; this was not agent-observed and does not establish request logs, credit changes, Return All, or error behavior.

**Business → Get** is intentionally not implemented or advertised for 0.1.0. Openmart documents a JSON-array request body on GET, while tested modern n8n declarative/authenticated transport sends an empty GET body. The user separately reported that POST to the route returned 404 and a bodyless GET query attempt returned `payload can't be empty`; these results were not agent-observed and do not establish credit behavior. As a manual workaround, n8n's generic **HTTP Request** node can use the Openmart credential while exposing the raw method and body configuration needed by this endpoint.

Batch and Task reads require an existing ID. Declarative routing may schedule multiple input-item requests concurrently. IDs are trimmed and encoded as one URL path segment. The node does not poll or retry internally: chain Get Status, Get Task IDs, and Task Get explicitly according to workflow needs.

Company Find Emails and both Person operations consume Openmart credits and create background work. Each input item submits exactly one task and returns after Openmart accepts the batch; retrieve results with **Batch → Get Status**, **Batch → Get Task IDs**, then **Task → Get**. The 90-second request timeout accommodates documented submission latency but does not poll. Enabling n8n **Retry On Fail** or manually rerunning can create and charge for duplicate work.

Company Search is brand-level targeting and emits one row per brand; use Business Search for local or store-level leads. It requires a search term or an explicit narrowing filter beyond the default US country. For US locations, use a two-letter state code such as `CA` or `OH`; non-US region names remain accepted. It uses the same opt-in **Return All**, total **Limit** of 1–1000, 100-result provider pages, exhaustion checks, cursor validation, and 100-page safety ceiling described above. Openmart preview API keys do not support Company cursor pagination, and the node does not attempt to detect key type. Moving optional store-count fields into an opt-in collection removed an unintended filter, and the user reported that a post-fix real-n8n search returned Cable Car Coffee SF plus `openmart_next_cursor`. This was not agent-observed; Company page-two continuation, other filters, empty cases, and credit behavior remain unverified. Company Enrich matches existing Openmart records using a website or social link; it does not crawl an arbitrary site, and returns only its first raw-array page.

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
