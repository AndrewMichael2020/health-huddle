# Live huddle operator runbook

This directory contains the one-off ElevenLabs proof of concept. It does not
replace the deterministic demonstration.

## Architecture

- The evidence builder creates one answer-free knowledge packet from allow-listed
  repository sources.
- Five specialists reason in parallel and return validated private reports.
- Maya grants one audible floor at a time through short transfer rounds.
- Every agent can call `read_huddle_context`; only Maya can request the guarded
  Project status action.
- Project 13 is snapshotted before mutation and restored exactly in `finally`.
- `.artifacts/live-huddle/` contains private local run evidence and is not
  committed.

The coordinator and floor state machine are topic-reusable. The PARIS evidence
allow-list, role lenses, ticket allow-list, and acceptance facts are the small
scenario adapter to replace for another topic. Do not reuse the PARIS evaluator
truth as agent knowledge.

## Prerequisites

From the repository root:

```zsh
source /Users/antvibe/Documents/Dev/scripts/load-dev-env.zsh
node live_huddle/cli.mjs preflight
```

The key stays in the shared local environment. GitHub CLI must have Project
scope. Never paste either credential into a prompt or artifact.

## Local checks

```zsh
npm test --prefix live_huddle
python3 -m src.validate_huddle --require-ready
git diff --exit-code -- README.md
```

The host used for the accepted run did not have `pytest`; use the repository's
isolated Python harness for a clean dependency-installed run when needed.

## Commands

```zsh
node live_huddle/cli.mjs build-evidence
node live_huddle/cli.mjs provision
node live_huddle/cli.mjs project-snapshot
node live_huddle/cli.mjs project-reset-proof
node live_huddle/cli.mjs live-accepted
```

`live-accepted` enforces a 45-second reasoning/event wait, one repair attempt,
single-floor ownership, a 400 ms transition gap, guarded Issue 11 status change,
and exact Project restoration. Provider-return anomalies are auditable failures;
they do not authorize indefinite retries.

`recover-accepted.mjs` is the explicit one-off recovery utility used for the
accepted composite. Its retained conversation IDs are intentionally fixed
provenance, not a general run path.

## Listening and review

Open the accepted run's `listen.html` for reliable sequential playback or
`audio.mp3` for a single combined stream. Review `report.html`,
`acceptance.json`, `transcript.json`, and `provenance.json` together. A recovered
composite must always retain that label.
