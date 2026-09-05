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

Once upon a time, six Skagit Health BI Analyst Agents had a Monday huddle.

At eight fifty-nine, the Agents’ Project board waited under the pale light of six columns: Backlog, Ready, In Progress, Blocked, Review, and Done. Downstairs, the human analysts were drinking coffee and talking beside the windows, well aware that thirteen small decisions had already arranged themselves in an action ledger above them.

The cards looked quiet. The repository was not. Overnight, contracts had compared source fields, tests had counted reconciled rows, and retrieval indexes had refreshed against the team’s goals, mappings, and product rules.

Maya Singh arrived first. The silence belonged to her until she gave it away. She checked the six agent identities and straightened the Project view as casually as a human analyst might straighten a notebook.

“Good morning. Maya Singh, Lead BI Analyst Agent and huddle lead,” she said. “We would decide what the evidence supported, what stayed blocked, and which tickets needed human ownership.”

An inventory card waited in Review. Two mapping cards stood in In Progress.

“Daniel,” Maya said, “take us through the current state.”

Daniel Cho gathered the portfolio evidence without appearing hurried, although he had searched every architecture note before a human could clear a throat.

“Daniel Cho, Analytics Director Agent,” he said. “The first synthetic load had landed cleanly. The second had proved that field mapping alone was insufficient.”

He named late Meditech corrections, repeated PARIS events, unmatched codes, and the undecided treatment of referral notes. Skagit Health needed one Microsoft Fabric foundation for many authorized workloads, without the old inheritance of nested views, manual transfers, competing KPI definitions, thin monitoring, and vanishing lineage.

The inventory card moved from Review to Done.

Priya Raman had traced five corrected Meditech encounters. Her retrieval chain returned the same inconvenient detail each time.

“Priya Raman, Meditech Mapping BI Analyst Agent,” she said. “Latest modified timestamp selected current. Discharge time could not be the watermark.”

The Meditech mapping card turned red and moved from In Progress to Blocked. A new ticket appeared for Human Data Engineering: *Capture late Meditech corrections*. Priya attached the requirement that Bronze retain both delivered versions while the standardized layer resolved one current record.

<p align="left">
  <img src="demo/assets/huddle-board-reaction.jpg" alt="The six-column Project board during the huddle, with the Meditech mapping card moved to Blocked and Maya sending a thumbs-up reaction" width="960">
</p>

Maya sent a thumbs-up that floated over the board in a small Teams-like pill.

Elena Park opened the evidence package. “Elena Park, Reconciliation and Reliability BI Analyst Agent. I could package that correction history for Human Data Engineering.” She gave a quick, podcast-soft giggle. “A Monday victory for history.”

Marcus Reed had compared four newly delivered PARIS rows with events the system had seen before. Extract identifiers had changed; the business events had not.

“Marcus Reed, PARIS Mapping BI Analyst Agent,” he said. “Referral, status, and event time formed the stable key. Extract ID served lineage only.”

The PARIS mapping card joined Meditech in Blocked. Marcus created *Define stable PARIS status-event keys* for Human Data Engineering. Priya offered to compare key wording; Marcus accepted, promised annotations, and laughed softly at the symmetry.

“Two awkward sources.”

Elena brought up the ledger again. Her counts arrived without drama: 294 delivered rows had become 279 current, nine duplicate or superseded, and six quarantined. Four lacked identity links. Two carried an unmapped program.

She moved reconciliation into In Progress and created a ticket for reason-coded quarantine outputs. Evidence would go to Human Data Engineering; exceptions would go to a Human BI Analyst. Elena offered to help either mapping stream. Daniel sent a small sparkle.

Owen Brooks had listened while his policy retrieval crossed the product contract and returned three blank spaces with unnerving confidence.

“Owen Brooks, Governance and Release BI Analyst Agent,” he said. “Security and privacy classification for referral notes was missing. Correction, deletion, and retention treatment was missing. Release validation requirements were missing.”

Three tickets appeared for Human Privacy and Security, the Human Systems Owner, and the Human Analytics Director. Development could continue. Test promotion could not. Priya sent a smile; Owen exhaled an almost-human ooh.

“More red on this board was reassuring that morning.”

Maya moved common-entities work into In Progress. A matching-exceptions ticket went to the LTC Source Mapping Working Group, with validation reserved for a Human BI Analyst. Meditech evidence, PARIS evidence, counts, and approval gaps formed a chain a person could follow the next day.

Daniel looked once more at the board. “Analytics Director Agent recommendation,” he said. “The Human Analytics Director would confirm criticality, product service objectives, and release. Human source owners would confirm meaning. Human Privacy and Security would confirm treatment.”

No agent mistook a green check for a human signature.

Maya read the roll-up: two mapping tickets Blocked, two foundation tickets In Progress, inventory Done, and seven new tickets for human owners. Priya promised Marcus her draft. Marcus promised annotations. Elena kept reconciliation open. Owen kept release closed.

At nine-oh-five, the Lead BI Analyst Agent thanked the team and wished everyone a happy Monday. Five agent voices returned it at once, slightly out of order, cheerful enough to make the audio meter bloom.

The huddle window emptied. Soon the human analysts returned from the café with their coffee. The Human Analytics Director opened the criticality and release tickets. A Human BI Analyst followed reconciliation counts into exception records. Colleagues opened source maps and reviewed each ticket beside the decision that had created it. Nothing awaiting human judgment had quietly closed itself.

It was a productive morning.

One analyst paused beside *retention treatment*, a coffee cup cooling near the keyboard. Then the next Paris batch arrived.

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
