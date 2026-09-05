# Target state

The target is a Microsoft Fabric-aligned analytical foundation with explicit
source contracts, reusable governed interfaces and proportionate controls.

## Logical flow

1. Read-only extraction from source systems through an approved gateway.
2. Source-shaped Bronze records with run identifiers and extraction metadata.
3. Validated records with managed identity and code crosswalks.
4. Governed LTC interfaces for clients, encounters, referrals, assessments,
   placements, locations and status events.
5. Authorized consumption by semantic models, monitoring, investigation,
   planning and future analytical workloads.

Bronze retains authorized source detail and provenance. It does not imply broad
consumer access. Governed interfaces expose fields according to approved
purpose, classification and lifecycle rules.

## Environment model

- Development: construction and controlled failure testing.
- Test: reconciliation, volume, performance and consumer validation.
- Production: certified releases only.

The simulation in this repository demonstrates behaviours and release gates; it
does not represent a live Fabric deployment.
