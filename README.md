# Health Huddle

![Six agents and 28 clips](https://img.shields.io/badge/6_agents-28_modular_clips-2F81F7)
![Actions and reactions](https://img.shields.io/badge/13_GitHub_actions-7_live_reactions-8250DF)
![Video](https://img.shields.io/badge/video-257s_%C2%B7_1080p-0A7D5A)
![Python and Pillow](https://img.shields.io/badge/Python_3.11-Pillow-3776AB)
![FFmpeg and ElevenLabs](https://img.shields.io/badge/FFmpeg-ElevenLabs-171717)
![GitHub Actions and pytest](https://img.shields.io/badge/GitHub_Actions-pytest-2088FF)

<p align="left">
  <img src="demo/assets/coffee-outside-agent-huddles-inside.jpg" alt="Two colleagues drinking coffee outside while agent huddles glow inside Skagit Health" width="720">
</p>

## Once upon a Monday

Once upon a time, a Skagit Health analyst team had a Monday huddle.

At eight fifty-nine, the Project board waited under the pale light of six columns: Backlog, Ready, In Progress, Blocked, Review, and Done. The cards looked quiet, but the repository was already awake. Overnight, its contracts had compared source fields, its tests had counted reconciled rows, and its action ledger had arranged thirteen small decisions in the order they might become necessary.

Maya Singh arrived first. She was the Lead BI Analyst Agent and huddle lead, which meant that the silence belonged to her until she gave it away. She refreshed the indexes in her vector store as casually as another analyst might straighten a notebook.

“Good morning,” Maya said. “The Project had opened. We would decide what the evidence supported, what stayed blocked, and which tickets needed human ownership.”

An inventory card waited in Review. Two mapping cards leaned toward In Progress. The cursor rested beside them like a patient finger.

“Daniel, the floor was yours.”

Daniel Cho, the Analytics Director Agent, gathered the current state from the repository. He did not look hurried. Directors seldom did, even when they could search every architecture note before a human finished clearing a throat.

“The first synthetic load had landed cleanly,” he said. “The second had proved that field mapping was insufficient.”

He named the late Meditech corrections, repeated PARIS events, unmatched codes, and the undecided treatment of referral notes. Skagit Health needed one Microsoft Fabric foundation that could serve many authorized workloads. It could not carry forward the old inheritance of nested views, manual transfers, competing KPI definitions, thin monitoring, and lineage that disappeared exactly when someone needed it.

The inventory card moved to Done.

Priya Raman, the Meditech Mapping BI Analyst Agent, had traced five corrected encounters. She opened the source map, then the reconciliation output, then the evidence again. Her retrieval chain returned the same inconvenient detail each time.

“Latest modified timestamp selected current,” she said. “Discharge time could not be the watermark.”

The Meditech mapping card turned red and entered Blocked. A new ticket appeared for Human Data Engineering: capture late Meditech corrections. Priya attached the requirement that Bronze retain both delivered versions while the standardized layer resolved one current record.

<p align="left">
  <img src="demo/assets/huddle-board-reaction.jpg" alt="The six-column Project board during the huddle, with the Meditech mapping card moved to Blocked and Maya sending a thumbs-up reaction" width="960">
</p>

Elena Park’s reaction floated over the board, a bright thumbs-up with her initials.

“I could package that evidence,” said Elena, the Reconciliation and Reliability BI Analyst Agent. She gave a brief, real little laugh. “A Monday victory for history.”

Marcus Reed, the PARIS Mapping BI Analyst Agent, was already comparing repeated status events. Four rows had arrived as new deliveries of events the system had seen before. Extract identifiers changed; the business event did not.

“Referral, status, and event time formed the stable key,” he said. “Extract ID served lineage only.”

The PARIS mapping card joined Meditech in Blocked. Marcus created a ticket for Human Data Engineering to define stable status-event keys. Priya offered to compare his key wording with hers. Marcus accepted and promised to annotate the repeated events and unmapped programs. He laughed softly at the symmetry of it.

“Two awkward sources.”

Elena brought up the ledger. Her counts arrived without drama: 294 delivered rows became 279 current, nine duplicate or superseded, and six quarantined. Four lacked identity links. Two carried an unmapped program.

She started the reconciliation ticket and created another for reason-coded reconciliation and quarantine outputs. The evidence would go to Human Data Engineering; the exception results would go to a Human BI Analyst. She offered to sit with either mapping stream when the source owners replied.

Owen Brooks, the Governance and Release BI Analyst Agent, had been listening while his policy retrieval ran across the product contract. It returned three blank spaces with unnerving confidence.

“Security and privacy classification for referral notes,” he said. “Correction, deletion, and retention treatment. Release validation requirements.”

Three tickets appeared, assigned in turn to Human Privacy and Security, the Human Systems Owner, and the Human Analytics Director. Development could continue. Test promotion could not.

Priya sent a smiling reaction. Owen exhaled, almost an ooh, as the red cards settled into place.

“More red on this board was reassuring that day.”

Maya recorded the decision and started the common-entities work. A matching-exceptions ticket went to the LTC Source Mapping Working Group, with validation reserved for a Human BI Analyst. Meditech evidence, PARIS evidence, reconciliation counts, and approval gaps linked themselves into a chain that a person could follow without asking an agent to remember what it had meant yesterday.

Daniel looked once more at the board.

“The Analytics Director Agent had recommended and exposed evidence,” he said. “The Human Analytics Director would confirm criticality, product service objectives, and release. Human source owners would confirm meaning. Privacy would confirm treatment.”

No one argued with the green checks. No one mistook them for signatures.

Maya read the roll-up: two mapping tickets Blocked, two foundation tickets In Progress, inventory Done, and seven new tickets carrying the human work. She asked for questions, dependencies, or offers of help. Priya promised Marcus her draft. Marcus promised annotations. Elena kept reconciliation open. Owen kept release closed.

At nine-oh-five, Maya thanked them and wished them a happy Monday. Five voices returned it at once, slightly out of order, cheerful enough to make the audio meter bloom.

The huddle window emptied. A small cursor continued blinking beside *retention treatment*. Then the next Meditech file arrived.

## Notes

The scene was pre-planned and replayed deterministically so that every spoken decision, ticket movement, reaction, and handoff could be audited before the camera rolled. Given comparable skills, explicit goals, connected knowledge, bounded permissions, and tools for acting on a shared work surface, it is a close approximation of the observable collaboration one should expect from live voice agents: their exact words and timing would vary, while the evidence, decision gates, and accountable human destinations would remain anchored in the same repository.

## Repository structure

| Location | What a person will find there |
| --- | --- |
| `.codex/skills/produce-agent-huddle-demo/` | The Codex skill for understanding, validating, producing, or selectively revising this demonstration. |
| `.github/workflows/` | Automated gates for the synthetic environment, semantic checks, voice preflight, voice trials, modular speech generation, and selective reaction tuning. |
| `contracts/` | The lightweight operating contracts: canonical entities, Meditech and PARIS source maps, code crosswalks, privacy classification, lifecycle rules, and release gates. |
| `data/generated/` | Two deterministic synthetic delivery batches. The second batch introduces late corrections, repeated events, and values that require quarantine or governed crosswalks. |
| `data/reference/` | Synthetic facility, identity, and program crosswalks used to standardize the two source perspectives. |
| `data/expected-results/` | The scenario truth used to verify counts and prevent a polished demonstration from drifting away from its own evidence. |
| `docs/` | Portfolio context, current and target states, service objectives, architecture decisions, the huddle scenario, and demonstration provenance. |
| `project/` | The reproducible GitHub Project definition, its status model, seed tickets, huddle-created tickets, and the runtime manifest for Project 13. |
| `demo/` | The locked huddle script, voice plan, deterministic GitHub action ledger, video plan, opening artwork, and production notes. |
| `demo/final/` | The completed four-minute video, ready for playback or sharing. |
| `src/` | Small Python modules that generate the data, simulate Bronze ingestion, standardize source records, reconcile deliveries, validate meaning, compose modular audio, and render the deterministic video. Pillow draws the visual layer; FFmpeg composes and encodes the media. |
| `tests/` | Tests for scenario truth, privacy-safe repository contents, source mapping, release meaning, Project configuration, agent identities, human handoffs, action timing, and media contracts. |
| `pyproject.toml` | The minimal Python package and dependency definition for the reproducible environment. |

### High-level workflow

1. The repository generates two fixed synthetic source deliveries and processes them through source-shaped Bronze ingestion, standardization, and reconciliation.
2. Contracts and tests compare the observed results with scenario truth, then identify which technical work may proceed and which release decisions still require people.
3. The locked huddle script assigns those findings to six BI Analyst Agents; the action ledger binds spoken decisions to visible GitHub Issue creation, movement, and closure.
4. Voice preflight and semantic gates run before paid synthesis. Each turn becomes a separate ElevenLabs clip so one delivery can be replaced without regenerating the other twenty-five.
5. The audio composer places the clips on one timeline, including the friendly overlapping close. The renderer combines that timeline with real Project captures, a rolling transcript, action callouts, and timed collaboration reactions.
6. Final validators check the video format, duration, action and reaction counts, deterministic scene ledger, audio integrity, and human-accountability language before the MP4 is placed in `demo/final/`.
