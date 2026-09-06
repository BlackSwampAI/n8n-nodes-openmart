# Implementation plan

## Batch 1 — current

Convert the template, remove demonstrations, add the Openmart credential and Account Get Credit Balance operation, establish product documentation, and pass local gates without live API calls.

## Batch 2 — proposed

Harden credential and transport errors, retry/redaction behavior, and item context. Prove n8n's authenticated helper GET-body behavior against a recording server, run a representative actual-n8n smoke, and—only with authorization and a supplied key—perform the harmless balance check. Do not advertise Business Search until its API conflicts and response contract are validated.

Later batches follow the gameplan and remain out of scope here.
