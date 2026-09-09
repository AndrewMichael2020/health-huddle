# Live huddle operator runbook

This directory contains the local ElevenLabs proof of concept. It preserves the
completed deterministic demonstration and does not require GitHub Actions.

## How it works

- A scenario file selects the decision question, allow-listed repository
  evidence, role lenses, Project target, speaking order, and acceptance signals.
- Five specialists investigate privately and return validated `ready` reports.
- Maya controls one audible floor and sends concise task context privately.
- Every agent can read current huddle and allow-listed Project context through
  `read_huddle_context`; only Maya can request the guarded Project action.
- Project state is snapshotted, every mutation receives an inverse operation,
  and restoration is verified in `finally`.
- Artifacts remain under `.artifacts/live-huddle/`; credentials never enter the
  knowledge pack, transcript, or repository.

## Run another bounded topic

Copy `live_huddle/scenarios/task-template.json`, replace every placeholder, and
point the coordinator at it:

```zsh
export HUDDLE_SCENARIO=/absolute/path/to/new-topic.json
source /Users/antvibe/Documents/Dev/scripts/load-dev-env.zsh
node live_huddle/cli.mjs preflight
npm test --prefix live_huddle
node live_huddle/cli.mjs build-evidence
node live_huddle/cli.mjs provision
node live_huddle/cli.mjs live-no-write
```

Only after reviewing the no-write result and confirming the Project target:

```zsh
node live_huddle/cli.mjs live-accepted
```

The topology intentionally remains six roles and one floor. A new topic changes
the scenario adapter, not the coordinator.

## Speech contract

- This is a huddle, not brainstorming: one small role delta per turn.
- Target about 25 seconds and cap a specialist at 45 seconds per issue.
- A speaker with no new information says “I have nothing to report on this
  matter,” yields, and transfers back.
- A truly silent speaker is marked not present and skipped.
- Natural pauses and stutters are retained.
- Maya closes in a separate session using the scenario’s exact final phrase.

## Local verification

```zsh
npm test --prefix live_huddle
python3 -m src.validate_huddle --require-ready
git diff --exit-code -- README.md
```

For the accepted outcome and media checks, see
`docs/live-huddle/ACCEPTANCE.md`. For reusable operating lessons, see
`docs/live-huddle/LESSONS.md`.
