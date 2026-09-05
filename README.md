# Health Huddle

Health Huddle is a synthetic demonstration of six BI Analysts coordinating an
LTC data-modernization decision for the fictional **Skagit Health Authority**.
The scenario maps Meditech- and Civica PARIS-inspired extracts into a
Microsoft Fabric target pattern, detects incomplete mapping meaning, and turns
the findings into visible GitHub tickets.

## Safety and accuracy

- Every organization, person, identifier, record, ticket and result is fictional.
- The source schemas are invented for this demonstration. They do not represent
  actual Meditech or Civica PARIS schemas.
- No Fraser Health information, code, credentials or data belongs in this repository.
- Generated files contain synthetic identifiers only and are reproducible from a fixed seed.
- The local pipeline simulates required Fabric behaviours; it does not claim to run in Fabric.

## Scenario

The first load appears successful. A repeated load reveals that field-to-field
mapping alone is not enough:

- Meditech encounter corrections can arrive after the original discharge date.
- PARIS status extracts can repeat a previously delivered business event.
- some site and program codes do not yet have governed crosswalks;
- privacy classification, lifecycle treatment, and release requirements are incomplete.

The current contract is intentionally not release-ready. Tests verify that the
gaps are detected. A second test fills the documented gaps in memory and proves
that the same gate can pass after approval.

## Quick start

```bash
python -m src.generate_synthetic_data --output data
python -m src.run_pipeline --data-root data --output .artifacts/pipeline
python -m src.validate_release --contracts contracts
python -m pytest
```

`validate_release` reports blockers but exits successfully for inspection. Add
`--require-ready` when a non-ready contract should fail a release job.

## Repository map

- `docs/` — portfolio context, current state, target state, service objectives and decision records.
- `contracts/` — source maps, common entities, crosswalk definitions, classification, lifecycle and release gates.
- `src/` — deterministic data generation, Bronze ingestion, standardization and reconciliation.
- `tests/` — truth, semantic, mapping, pipeline and Project-configuration tests.
- `project/` — reproducible GitHub Project definition and initial tickets.
- `demo/` — reserved for the verified six-agent huddle and video renderer.

## Current release decision

The pipeline may continue in Development. Promotion remains blocked until
record keys, correction handling, privacy classification, lifecycle rules and
release-validation requirements are approved.
