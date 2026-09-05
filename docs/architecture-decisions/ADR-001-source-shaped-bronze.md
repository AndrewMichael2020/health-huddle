# ADR-001 — Preserve source-shaped Bronze records

## Status

Accepted for the demonstration.

## Decision

Bronze stores authorized source fields without applying consumer-specific
transformations. Each record receives source file, batch, ingestion time and
source-system metadata.

## Rationale

This supports replay, reconciliation, late-correction analysis and multiple
authorized downstream uses. Privacy classification controls access and
promotion; retention in Bronze is not permission for unrestricted consumption.

## Consequences

- Cross-system standardization occurs after Bronze.
- Sensitive fields remain restricted until classified.
- Every input row can be accounted for during reconciliation.
