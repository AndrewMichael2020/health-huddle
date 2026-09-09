# Live knowledge-grounded agent huddle

Status: proof-of-concept implementation complete; recovered acceptance artifact
created on 2026-09-08/09.

This section defines the experimental successor to the completed deterministic
agent-huddle video. The existing script, action ledger, media, and published
demonstration remain the baseline and are not replaced.

## Concept

Run one live, unscripted huddle in which the six existing BI Analyst Agents use
curated repository evidence to resolve a bounded PARIS duplicate-event and
lineage question. Five specialists may investigate in silent ElevenLabs chat
sessions while Maya controls short, single-floor ElevenLabs transfer rounds.
Maya grants the floor only to an agent that has reported `ready`; a transferred
specialist speaks in its configured voice, yields the floor, and returns the
conversation to Maya.

The proof is successful when the team reaches a grounded conclusion, responds
constructively to a challenge, performs only allowed and reversible Project
actions, identifies the decisions that still belong to humans, and leaves a
complete audit trail. Speed is not a success criterion.

```text
Daniel  Priya  Marcus  Elena  Owen
      private text investigations
                    |
                    v
       local coordinator + event log
                    |
             ready / floor token
                    v
       short live ElevenLabs transfer rounds
          Maya <-> transferred agent
                    |
                    v
       guarded Project 13 tool proxy
```

## Documents

- [Business requirements](BRD.md)
- [Implementation and validation plan](PLAN.md)
- [Accepted artifact and limitations](ACCEPTANCE.md)
- [Operator runbook](../../live_huddle/README.md)

## Non-negotiable boundaries

- Use only the repository's synthetic data and fictional schemas.
- Keep all six current agent identities and human-authority boundaries.
- Do not use GitHub Actions for this one-off experiment.
- Do not expose the ElevenLabs key or GitHub credential to a browser or agent.
- Label recovered or stitched speech explicitly; never present it as an
  uninterrupted live transfer.
- Keep Project 13 as the agents' work surface and restore it after every run.
- Keep our engineering work in a separate private GitHub Project.
- Never upload this planning section or evaluator-only acceptance truth to the
  agents' knowledge base.
- Treat the repository-root `README.md` as frozen until the user explicitly
  authorizes its final update.
- Make every spoken turn understandable to a human listener without requiring
  them to read the repository, Project board, or audit log.

## First decision cluster

The first live run is limited to the existing ticket **Define stable PARIS
status-event keys**. The team must distinguish business-event identity from
delivery lineage, test the candidate rule against repository evidence, expose
what the sample cannot prove, and route source meaning and implementation to
the correct human owners.

The agents may use exact identifiers and structured data while investigating,
but their audible conversation must follow the narrative standard established
by the root README: explain the finding, translate the technical distinction,
say why it matters, and identify what a person needs to decide next.
