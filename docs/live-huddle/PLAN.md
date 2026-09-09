# Implementation and validation plan

## 1. Delivery strategy

Implement the smallest system that can honestly prove the required behaviour.
Each phase has a go/no-go gate. Paid live audio, Project mutation, and a full
six-agent run occur only after cheaper deterministic and text-only checks pass.

Work occurs on the `experiment/live-agent-huddle` branch. The deterministic
baseline files remain unchanged. The repository-root `README.md` is explicitly
frozen until the user authorizes its final update after acceptance.

## 2. Proposed local architecture

Use a small local Node.js service and a static operator report.
The official ElevenLabs JavaScript clients handle authenticated conversations
and audio; the server owns credentials, knowledge provisioning, specialist chat
sessions, coordinator state, GitHub commands, and the append-only audit log.
Existing Python modules remain the authority for scenario generation and
reconciliation checks.

Proposed implementation sections:

```text
live_huddle/
  config/                 agent roles, scenario, policies, budgets
  evidence/               deterministic knowledge-packet builder
  elevenlabs/             provisioning and conversation adapters
  coordinator/            state machine, floor control, challenge routing
  github/                 Project snapshot, guarded actions, reset
  audit/                  event schema, redaction, run report
  web/                    local operator view
  tests/                  state, policy, reset, evidence, and adapter tests
```

The exact dependency set is chosen during the spike. Avoid React, a database,
containers in production, queues, cloud deployment, and webhook infrastructure
unless a demonstrated requirement makes one necessary.

## 3. Knowledge contract

Build one generated core packet and, only if useful, one supporting RAG packet.

Initial source allow-list:

- `docs/modernization-goal.md`
- `docs/current-state.md`
- `docs/target-state.md`
- `docs/service-level-objectives.md`
- `docs/architecture-decisions/ADR-001-source-shaped-bronze.md`
- `contracts/paris-source-map.csv`
- `contracts/canonical-entities.yml`
- `contracts/lifecycle-rules.yml`
- `contracts/privacy-classification.yml`
- `contracts/release-gates.yml`
- the relevant rows from both PARIS synthetic batches
- the relevant logic from `src/standardize_records.py` and
  `src/reconcile_load.py`
- the title, state, labels, and Project fields for tickets 3, 5, 11, and 12

Explicit exclusions include this planning section, the deterministic huddle
script, its narration, the previous action ledger, and
`data/expected-results/scenario_truth.json`. The prior deterministic huddle
scenario and decision-bearing Issue bodies are excluded as well. Scenario
truth is retained only by the evaluator. The live agents should derive the
conclusion from source evidence rather than imitate a supplied answer.

## 4. Agent and floor contract

Each background specialist returns a validated structure:

```json
{
  "status": "ready",
  "claim": "concise conclusion",
  "evidence_refs": ["EV-..."],
  "uncertainties": ["..."],
  "recommended_action": "...",
  "human_handoff": "...",
  "confidence": 0.0
}
```

This structure is for coordination and audit only. It is never read aloud. When
an agent receives the floor, it converts the validated report into natural
speech using the human-legibility contract in the BRD. The coordinator retains
the exact evidence references while the agent speaks their meaning in ordinary
language.

Spoken turns should sound like colleagues exchanging decision summaries, not
services serializing results or a brainstorming group restating the same fact.
Prompts require complete sentences, distinct role deltas, references to written
evidence, and an explicit human handoff where authority is missing. Maya does
not summarize every specialist. She intervenes only to resolve a challenge,
park an unproductive point, or pivot toward the decision.

The coordinator rejects malformed or uncited reports and permits one repair
attempt. The floor state machine is:

```text
thinking -> ready -> floor_granted -> speaking -> yielded -> complete
     ^                    |                         |
     +------ challenged <-+-------------------------+

thinking -> parked -> thinking
```

Only the coordinator can grant the floor. Only the holder can enter `speaking`.
The next grant cannot occur until the current agent has yielded and the client
has emitted audio completion.

## 5. Project separation and restoration

### Project 13: agents

Project 13 is the live work surface. Before every mutable run:

1. Read the Project, fields, options, items, issue state, and relevant values.
2. Save a local immutable snapshot and its SHA-256 hash.
3. Confirm there is no unresolved ledger from a previous run.
4. Restrict the first run to tickets 3, 5, 11, and 12.
5. Permit status changes and run-tagged Project draft items only.
6. Record the exact inverse of every successful mutation.

After every run, including failed and interrupted runs:

1. Disable the agents' mutation capability.
2. Replay inverse operations in reverse order with current-state checks.
3. Delete only draft items bearing the current run identifier.
4. Re-read Project 13 and compare it with the pre-run snapshot.
5. Mark the run `restored` only when the comparison is exact.
6. If comparison fails, stop and present the minimal residual diff for manual
   review; do not begin another run.

### Separate private Project: us

Create a private user Project named **Health Huddle Live Agent POC**. Use only
draft items for our engineering plan so the public repository's Issues remain
the agents' domain. Initial items:

- Freeze evidence and safety contracts
- Prove Maya-specialist-Maya live transfer
- Provision and validate six agents
- Prove Project 13 snapshot and restoration
- Run text-only rehearsal
- Run live no-write rehearsal
- Run accepted mutable huddle and verify reset

The agents receive no access to this Project.

## 6. Phases and gates

### Phase 0: planning and baseline

Deliverables:

- This concept, BRD, and implementation plan.
- Clean experiment branch based on the published baseline commit.
- Verified ElevenLabs and GitHub Project credentials without exposing them.
- Separate private implementation Project.

Gate: baseline validations still pass and no deterministic-demo file changed.

### Phase 1: deterministic local core

Deliverables:

- Evidence-packet builder and source manifest.
- Coordinator and floor state machine.
- Agent-report schema and validator.
- Project 13 snapshot, diff, inverse-ledger, and reset dry run.
- Redacting event logger and evaluator rubric.
- Unit and integration tests using mocked external adapters.

Gate: all state, policy, evidence, idempotency, redaction, and restoration tests
pass without calling ElevenLabs or mutating GitHub. Prompt tests also reject
machine payloads, raw evidence identifiers, and internal coordinator vocabulary
from audible response fields.

### Phase 2: two-agent ElevenLabs spike

Provision Maya and Marcus only. Prove:

- shared knowledge attachment and retrieval;
- Marcus background chat investigation and `ready` report;
- one continuous live voice conversation;
- Maya-to-Marcus and Marcus-to-Maya transfers;
- transfer-preserved transcript and coordinator context;
- distinct voices, audio completion, and clean floor ownership; and
- conversation transcript, version IDs, and actual usage retrieval.

Gate: two repeatable round trips are smooth, correctly grounded, and contain no
overlap or context loss. After two consecutive non-improving repair attempts,
stop and revise the architecture. Do not replace the live path with generated
clips.

### Phase 3: six-agent text rehearsal

Provision all six agents and run the complete scenario in text-only mode.
Exercise simultaneous investigations, readiness ordering, one challenge,
follow-up work, assistance, parking, and human handoffs.

Gate: the rubric passes for grounding, cooperation, authority, and coherent
ticket proposals before any full live audio run. A human transcript review must
also confirm that each finding, significance, uncertainty, and handoff can be
understood without opening the repository.

### Phase 4: Project 13 rehearsal

Run the full coordinator against Project 13 with writes disabled, then execute a
controlled synthetic mutation/reset test without agents. Verify exact
restoration before allowing agent-triggered reversible actions.

Gate: snapshot equality is proven after a success, a rejected command, and an
interrupted run.

### Phase 5: live rehearsals — complete with provider findings

Run one full six-agent voice rehearsal with Project writes disabled. Inspect the
transcript, audio boundaries, evidence use, challenge response, and usage. Tune
prompts or turn controls only when a measured defect justifies it.

Gate: all criteria pass except the intentionally disabled Project actions.

### Phase 6: accepted organic huddle artifact — complete

Run one bounded huddle with guarded Project actions enabled. Target roughly 25
seconds and cap each specialist at 45 seconds per issue. Do not stop the whole
huddle on a global timer while it is still producing useful evidence. Restore
Project 13 immediately after the run and verify snapshot equality.

Retain:

- sanitized transcript and audio;
- agent, version, voice, model, knowledge, and conversation identifiers;
- evidence manifest and hashes;
- complete state and tool event ledger;
- Project before, action, inverse, and after records;
- actual duration and ElevenLabs usage; and
- the evaluator report with failures and unresolved questions.

Gate outcome: the accepted full first-take run preserved the organic transfer
behavior, executed the guarded Issue 11 action, delivered Maya's complete close,
and restored Project 13 exactly. Empty specialist returns remain visible and
are handled explicitly by the corrected future-turn contract.

## 7. Validation matrix

| Risk | Primary verification |
| --- | --- |
| Agents repeat the scripted answer | Exclude script, ledger, and evaluator docs from knowledge; inspect evidence trace |
| RAG omits critical facts | Put the small core contract in full context; test retrieval before live use |
| Agents talk over each other | Single voice connection, exclusive floor state, audio-complete barrier |
| Transfer loses private work | Specialist loads its validated report from coordinator state after transfer |
| Agent fabricates a ticket action | Schema validation, evidence requirement, item allow-list, current-state precondition |
| Project is left dirty | Pre-run snapshot, inverse ledger, mutation lock, exact post-reset comparison |
| Credential leakage | Server-only loading, signed URLs, redaction tests, secret-pattern repository scan |
| Costs run away | Text-first gates, per-run credit ceiling, one useful first take, usage telemetry, operator stop |
| Human authority is blurred | Prompt constraints, tool policy, rubric failures for unauthorized approval claims |
| Conversation is polished but shallow | One narrow decision, mandatory challenge, evidence and uncertainty scoring |
| Conversation is technically correct but hard to follow | Separate machine reports from spoken summaries; require plain-language Maya recaps and human transcript review |
| Agents repeat the same conclusion | Enforce per-turn word ceilings, assign distinct role deltas, expose prior spoken summaries privately, and reject routine Maya recaps |
| Transcript closes but audio stops early | Require non-empty closing audio and verify the final continuous-media tail before human review |

## 8. Completion definition

The work is complete when the accepted run passes the BRD, Project 13 is proven
restored, the audit package contains no secrets, the deterministic baseline is
unchanged, and the repository documents what was actually demonstrated without
claiming production readiness.
