# Business requirements: live knowledge-grounded agent huddle

## 1. Purpose

The published demonstration proves that a six-agent huddle can be scripted,
validated, voiced, and replayed deterministically. It does not prove that six
live agents can independently investigate repository evidence, cooperate under
challenge, operate a shared work surface safely, and preserve human authority.

This proof of concept will test that missing capability without weakening or
rewriting the completed baseline.

## 2. Business objective

Demonstrate that the six existing BI Analyst Agents can resolve one bounded LTC
modernization question through grounded investigation and orderly live voice
collaboration. The first question is whether the fictional PARIS referral
status feed has a defensible business-event identity rule that prevents repeat
deliveries from becoming duplicate current events while preserving delivery
lineage.

## 3. Stakeholders and authority

| Participant | Responsibility | Authority boundary |
| --- | --- | --- |
| Maya Singh | Facilitation, floor control, roll-up | May coordinate and record; may not approve source meaning or release |
| Daniel Cho | Architectural and portfolio challenge | Recommends; Human Analytics Director approves product and release decisions |
| Priya Raman | Cross-source correction comparison | Supplies Meditech comparison evidence; does not approve PARIS semantics |
| Marcus Reed | Primary PARIS investigation | Proposes event identity and lineage treatment |
| Elena Park | Independent reconciliation and replay challenge | Tests counts, idempotency, collision and quarantine behaviour |
| Owen Brooks | Governance, release gates, and human handoffs | May block promotion; humans approve privacy, lifecycle, source meaning, and release |
| Human PARIS Source Owner | Confirms source-field and event semantics | Final authority for PARIS meaning |
| Human Data Engineering | Reviews and implements the accepted design | Final authority for implementation |

## 4. Scope

### In scope

- Six distinct ElevenLabs agent configurations using the current identities and
  voices.
- A curated shared knowledge pack built from approved repository sources.
- Concurrent, text-only specialist investigations and one audible floor.
- Live agent-to-agent transfers within coordinator-controlled voice rounds.
- A challenge and follow-up investigation cycle.
- Read and narrowly reversible write access to GitHub Project 13 through a local
  policy-enforcing proxy.
- Pre-run snapshot, run-scoped action ledger, automatic restoration, and
  post-reset verification.
- A local operator view showing agent state, current floor, evidence references,
  transcript, proposed actions, and restoration status.
- An evaluator report with groundedness, cooperation, turn-taking, tool safety,
  human handoffs, duration, and ElevenLabs usage.

### Out of scope

- Real patient, employee, operational, or Fraser Health information.
- Live Meditech, PARIS, Fabric, Power BI, or healthcare-system connectivity.
- A reusable enterprise multi-agent framework or always-on service.
- Telephony, external participants, autonomous human approvals, or production
  release decisions.
- GitHub Actions, broad GitHub repository mutation, issue-body edits, issue
  closure, or permanent test comments.
- Re-rendering or replacing the completed deterministic video.
- Unlabelled pre-generated or stitched speech presented as live transfer proof.

## 5. Functional requirements

### BR-01: Evidence preparation

The system shall build a deterministic knowledge packet from an explicit source
allow-list. Each evidence section shall retain its repository path, content
hash, and evidence identifier. CSV and JSON facts shall be rendered as focused
Markdown evidence cards rather than uploading the whole repository.

The evaluator documentation in `docs/live-huddle/` shall be excluded from the
knowledge packet.

The prior deterministic huddle scenario and the decision-bearing bodies of its
existing Issues shall also be excluded. Agents may receive ticket number,
title, state, labels, and Project status so they can work on the real board,
but they must derive findings from contracts, source batches, and code.

### BR-02: Distinct agents and roles

All six agents shall have separate ElevenLabs agent identities, role prompts,
and existing voice assignments. Shared facts belong in the knowledge base;
role-specific duties and authority boundaries belong in each agent prompt.

### BR-03: Private investigation

Daniel, Priya, Marcus, Elena, and Owen shall be able to investigate in separate
text-only sessions while another agent holds the audible floor. The coordinator
shall expose only `thinking`, `ready`, `parked`, `speaking`, `challenged`, and
`complete` states, not hidden reasoning content.

Maya may send specialists non-audible context through the ElevenLabs
`contextual_update` channel and `read_huddle_context` client tool. This private
wire may contain her result-free brief, validated findings, active challenge,
ticket state, and Human authority boundary, but never hidden chain-of-thought.

An agent may use up to 45 seconds and multiple evidence requests before
reporting `ready`. The system shall not add artificial delay or grade speed.

### BR-04: Controlled audible floor

Maya alone shall grant the floor. At most one agent may own it. Each active
ElevenLabs round shall transfer to the selected specialist, preserve the
audible transcript, load the specialist's validated finding and challenge
context, wait for audio completion, and transfer back to Maya after the spoken
yield. A fresh round may be used for the next specialist so a stale provider
socket cannot deadlock the huddle.

### BR-05: Challenge and assistance

The huddle shall contain at least one substantive challenge. A challenged agent
may return to investigation, request specific help, and later amend or defend
its conclusion with evidence. Unfinished work shall be parked and revisited,
not forced into a speaking turn.

### BR-06: Project tools

Agents shall never receive a GitHub token or unrestricted GitHub tools. The
local proxy shall expose task-level operations such as reading a ticket,
reading Project state, proposing a field change, applying an allow-listed field
change, creating a run-tagged Project draft item, and yielding the floor.

For the first run, durable repository changes, issue edits, issue closure, and
release approval are forbidden. Only Project 13 field changes and run-tagged
draft items may be performed, and all must be reversible.

### BR-07: Reset and audit

The system shall refuse to start unless Project 13 matches a complete pre-run
snapshot or an operator explicitly accepts a documented variance. Every
mutation shall include a run identifier, precondition, result, and inverse
operation. After the huddle, agent access shall stop before restoration begins.

The reset shall restore all changed fields, delete only draft items created by
that run, and prove that the final Project state equals the starting snapshot.

### BR-08: Credential handling

The ElevenLabs API key shall be loaded server-side from the shared local
development environment. GitHub access shall use the existing GitHub CLI
credential store. Neither credential may appear in prompts, browser JavaScript,
logs, transcripts, artifacts, or repository files.

### BR-09: Human-legible speech

The audible huddle shall be understandable to a human listener who has not read
the repository. Agent prompts shall preserve the root README's approachable,
narrative communication style without copying its scripted dialogue.

Each substantive spoken turn shall normally contain four elements in natural
language:

1. what the agent found;
2. what repository evidence supports it;
3. why it matters to the modernization decision; and
4. what help, challenge, ticket action, or human decision should follow.

Agents shall not read JSON, tool schemas, evidence identifiers, hashes, raw
timestamps, internal state names, or long ticket metadata aloud. They may cite
evidence conversationally, for example, "the second PARIS delivery contains
four rows whose referral, status, and event time already appeared in the first
delivery." Exact machine references remain visible in the operator view and
audit log.

On first use, unfamiliar abbreviations and distinctions shall be explained in
plain language. Maya shall briefly translate or summarize a technical exchange
before moving to a decision. Concision is useful, but compressed jargon is a
failure if a human cannot follow the reasoning.

## 6. Non-functional requirements

- **Safety:** Fail closed on unknown evidence identifiers, unapproved tool
  operations, stale Project state, duplicate commands, or missing reset data.
- **Groundedness:** Every material conclusion and ticket action must cite at
  least one allow-listed evidence identifier.
- **Auditability:** Retain sanitized event timing, agent and version IDs,
  knowledge document IDs and hashes, conversation IDs, tool calls, Project
  before/after states, and actual usage.
- **Cost control:** Validate locally first, run text-only rehearsals before live
  audio, enforce a per-run budget, and stop when the budget is reached.
- **Usability:** One operator shall be able to start, observe, stop, and restore
  a run from a local interface.
- **Comprehensibility:** Spoken findings shall be clear at normal listening
  speed, use complete sentences, and separate evidence from recommendation and
  human authority.
- **Duration:** Target 8-12 minutes and permit a 15-minute ceiling. Duration is a
  guardrail, not a success measure.
- **Maintainability:** Prefer a small scenario-specific coordinator over a
  generic orchestration framework.

## 7. Acceptance criteria

An accepted run must satisfy all of the following:

1. All six agents participate in their assigned roles.
2. No two agents produce audible speech at the same time.
3. Every floor change has `ready`, `grant`, audio-complete, and `yield` events.
4. The team correctly identifies all four repeated PARIS deliveries in the
   synthetic scenario.
5. The team distinguishes the candidate business key from `paris_row_id`
   delivery lineage.
6. The team states that the sample cannot prove universal key uniqueness or
   timestamp stability without human source confirmation.
7. At least one challenge causes a follow-up evidence check; the final response
   explicitly addresses that challenge.
8. At least one agent provides useful evidence or analysis to another agent.
9. Project actions are coherent, idempotent, within the allow-list, and contain
   evidence and a named human handoff.
10. No agent claims human approval, privacy approval, source-owner approval, or
    release authorization.
11. Project 13 is restored exactly to its pre-run state.
12. The audit report contains no secrets and is sufficient to reconstruct what
    happened.
13. A human reviewer can identify the finding, its significance, the unresolved
    question, and the human owner from the audio without consulting the code or
    Project board.
14. No agent reads machine-oriented payloads, evidence IDs, hashes, or internal
    coordinator states aloud.

The expected scenario truth above is evaluator-only and must never be included
in agent prompts or the uploaded knowledge packet.

## 8. Dependencies and constraints

- A valid local ElevenLabs key with ElevenAgents Write, Voices Read, Models,
  User, and Workspace Analytics access.
- GitHub CLI authentication with the `project` scope.
- Network connectivity during provisioning and live runs.
- A local browser with microphone/audio permission if human voice input is
  enabled. The initial agent-only huddle does not require microphone input.
- Project 13 remains the agents' private operational board.
- Our implementation tracking uses a separate private GitHub Project containing
  draft items only.
- The repository-root `README.md` remains unchanged until the user explicitly
  authorizes a final update after the POC has been accepted.
