# API and operation matrix template

Record one row for every advertised operation. Generated API contracts are route/schema evidence, not proof of user value or runtime support.

| Resource     | Operation     | Automation value     | Method and current path | API/version     | Edition     | Required visible controls | Minimum valid state                    | Request/output shape          | Destructive or side-effecting     | Contract evidence                          | Human-doc semantics               | Observed behavior and version   | Test tiers     | Uncertainty   |
| ------------ | ------------- | -------------------- | ----------------------- | --------------- | ----------- | ------------------------- | -------------------------------------- | ----------------------------- | --------------------------------- | ------------------------------------------ | --------------------------------- | ------------------------------- | -------------- | ------------- |
| `<RESOURCE>` | `<OPERATION>` | `<WORKFLOW_OUTCOME>` | `<METHOD_AND_PATH>`     | `<API_VERSION>` | `<EDITION>` | `<CONTROLS>`              | `<VALID_DEFAULTS_OR_LOCAL_VALIDATION>` | `<REQUEST_AND_OUTPUT_SHAPES>` | `<CONFIRMATION_AND_RETRY_POLICY>` | `<IMMUTABLE_CONTRACT_URL_AND_ACCESS_DATE>` | `<HUMAN_DOC_URL_AND_ACCESS_DATE>` | `<OBSERVED_VERSION_AND_RESULT>` | `<TEST_TIERS>` | `<OPEN_ITEM>` |

For each row, verify path encoding, identifiers and response wrappers, list pagination, empty behavior, errors, update preservation, and edition boundaries. Prefer current documented routes; record pinned-version compatibility differences explicitly. Do not advertise an operation solely because it exists in OpenAPI.
