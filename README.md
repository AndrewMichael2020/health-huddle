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

At eight fifty-nine, the Agents’ Project board waited beneath the pale light of six columns: Backlog, Ready, In Progress, Blocked, Review, and Done. Downstairs, the human analysts were drinking coffee and talking beside the windows, well aware that thirteen small decisions had already lined up in an action ledger above them.

The cards looked quiet. The repository was not. Overnight, contracts had compared source fields, tests had counted reconciled rows, and search indexes had refreshed against the team’s goals, mappings, and product rules. Somewhere inside that machinery, a Monday had begun.

Maya Singh, the Lead BI Analyst Agent and huddle lead, arrived first. She checked the evidence links and nudged the Project view into place, the digital equivalent of straightening a notebook. An inventory card waited in Review. Two mapping cards stood in In Progress.

“Morning,” she said. “Let’s work through the overnight results and agree what moves, what blocks, and what needs a human decision.”

She gave the floor to Daniel Cho, the Analytics Director Agent. He had already searched the architecture notes, the current-state inventory, and the modernization goals. He spoke without hurry.

“The first batch arrived intact,” Daniel said. “The second showed us where the map was too simple: late Meditech corrections, duplicate PARIS status events, and codes we could not yet translate.”

The findings also included referral notes whose handling nobody had approved. Skagit Health was not building a platform for one report. It needed a Microsoft Fabric foundation sturdy enough for governed BI, reusable semantic models, large transformations, and whatever authorized workload came next. The old inheritance included nested views, manual transfers, duplicate logic, disputed KPIs, thin monitoring, and lineage that disappeared when someone asked where a number came from. Moving all of it into a newer room would merely give the old questions a new address.

The inventory card crossed from Review to Done.

Priya Raman, the Meditech Mapping BI Analyst Agent, had traced five encounters that changed after their original delivery. She checked the source map, the batch history, and the reconciliation results. Each told the same inconvenient story.

“Discharge time told us when the encounter ended,” she said. “It could not tell the next Fabric load where to resume. We needed the last-modified time, or late corrections would pass unnoticed.”

Fabric’s Bronze layer would keep both delivered versions; Silver would present the newest one. Priya could demonstrate the rule, but Human Data Engineering still had to approve how the pipeline would collect corrections that arrived late. The Meditech card turned red and moved to Blocked. A new ticket appeared beneath it: *Capture late Meditech corrections*.

<p align="left">
  <img src="demo/assets/huddle-board-reaction.jpg" alt="The six-column Project board during the huddle, with the Meditech mapping card moved to Blocked and Maya sending a thumbs-up reaction" width="960">
</p>

Maya’s thumbs-up drifted over the board in a small reaction pill. Elena Park, the Reconciliation and Reliability BI Analyst Agent, offered to package Priya’s correction history for engineering. Then she giggled, quick and quiet.

“Good. Bronze kept the source history; Silver could present the current record.”

Marcus Reed, the PARIS Mapping BI Analyst Agent, had found the corresponding trouble in another shape. Four rows had arrived with new extract IDs, although the business events beneath them were already in Fabric.

<p align="left">
  <img src="demo/assets/paris-referral-status-batch-002.png" alt="PARIS referral-status data in GitHub, including new extract identifiers, program codes, event timestamps, and records awaiting classification" width="960">
</p>

“These rows came in with new extract IDs,” he said, “but the same referral, status, and event time were already there. Those three fields told us it was the same event. The extract ID told us which delivery it came from.”

That distinction gave the pipeline a dependable duplicate check without throwing away the trail back to each delivery. His PARIS card joined Meditech in Blocked, and *Define stable PARIS status-event keys* appeared for Human Data Engineering. Priya offered to compare the wording with her correction rule. Marcus accepted and laughed at the symmetry.

“Meditech had late corrections; PARIS resent events with new row IDs. Different source habits, same need for reliable loading rules,” he said.

Elena opened the reconciliation ledger. The arithmetic landed cleanly: 294 delivered records became 279 current records. Nine were duplicate or superseded; six waited in a reason-coded holding area. Four lacked approved identity links, and two carried a program code that had not yet been mapped. She moved reconciliation into In Progress, created *Add reconciliation and quarantine outputs*, and offered to help either mapping stream. Daniel sent a small sparkle across the screen.

<p align="left">
  <img src="demo/assets/identity-crosswalk.png" alt="The identity crosswalk in GitHub, mapping Meditech and PARIS source client identifiers to shared enterprise client identifiers" width="960">
</p>

Owen Brooks, the Governance and Release BI Analyst Agent, had spent the exchange searching the product rules. He found three gaps with unnerving confidence: referral notes had no approved privacy classification; nobody had defined how corrections, deletions, and retention would work; and the checks required before release still had no owner.

“The pipelines could run in development,” Owen said. “They could not move into testing until people approved how referral notes would be protected and retained, and what had to pass before release.”

Three tickets appeared for Human Privacy and Security, the Human Systems Owner, and the Human Analytics Director. Development could continue. The path into testing stopped there. Priya sent a smile. Owen made a soft ooh as the red cards settled into place.

“Blocked was the right status,” he said. “It kept unapproved work out of testing and showed exactly which human owner needed to decide.”

Maya moved the common LTC entities work into In Progress. A ticket for records the two systems could not match went to the LTC Source Mapping Working Group, with validation reserved for a Human BI Analyst. Meditech evidence, PARIS evidence, counts, and approval gaps now formed a chain someone could follow tomorrow without having attended today.

Daniel considered the board. The agents had made recommendations and shown their evidence; the consequential verbs still belonged to people. The Human Analytics Director would decide how essential the product was, which reliability promises it had to keep, and whether it was ready for release. Human source owners would confirm what the fields meant. Human Privacy and Security would decide how the information could be used and kept.

No green check had been mistaken for a human signature.

Maya read the roll-up: two mapping tickets Blocked, two foundation tickets In Progress, inventory Done, seven new tickets waiting for human owners. Priya promised Marcus her draft. Marcus promised annotations. Elena kept reconciliation open. Owen kept release closed.

***

To a human ear, the roll-up might have sounded strangely compressed, a morning’s work folded into status words and row counts. The agents had no reason to imitate every turn of human speech. They had developed a shorthand around the goals the human team had entrusted to them.

Translated into office language, the agents had taken the LTC migration map through its first two Fabric deliveries. One arrived intact. The next revealed two source habits the original map had missed: Meditech could revise an encounter after discharge, and PARIS could resend an old event under a new row ID. Priya and Marcus would test their rules together, then return the evidence to the human analysts for direction.

Daniel widened the assignment from the first two source maps to the whole LTC domain. The map would have to serve more than a single report and leave room for whatever governed workload arrived next.

***

At nine-oh-five, Maya thanked the team and wished everyone a happy Monday. Five agent voices returned the wish at once, slightly out of order, cheerful enough to make the audio meter bloom.

The huddle window emptied. Soon the human analysts returned from the café and settled at their desks. Within minutes, they had validated the agents’ work and sent the code forward.

It was a productive morning.

Mariam, a Human BI Analyst, used the time that opened up to create *skills* for Mental Health and Pediatrics, then began shaping them for the whole enterprise. A message popped up on her screen.

*Hey, since you’re done, do you want to go to dinner now?*

“Thank you, hadn't we just had a breakfadt :-),” she typed, and pressed Enter without correcting the typo.

## Notes

The scene was pre-planned and replayed deterministically so that every spoken decision, ticket movement, reaction, and handoff could be audited before the camera rolled. Given comparable skills, explicit goals, connected knowledge, bounded permissions, and tools for acting on a shared work surface, it is a close approximation of the observable collaboration one should expect from live voice agents: their exact words and timing would vary, while the evidence, decision gates, and accountable human destinations would remain anchored in the same repository.

## Repository structure

| Location | What a person will find there |
| --- | --- |
| `.codex/skills/produce-agent-huddle-demo/` | The Codex skill for understanding, validating, producing, or selectively revising this demonstration. |
| `.github/workflows/` | Automated gates for the synthetic environment, semantic checks, voice preflight, voice trials, modular speech generation, and selective reaction tuning. |
| `contracts/` | The lightweight operating contracts: canonical entities, Meditech and PARIS source maps, code crosswalks, privacy classification, lifecycle rules, and release gates. |
| `data/generated/` | Two deterministic synthetic delivery batches. The second batch introduces late corrections, duplicate events, and values that require quarantine or governed crosswalks. |
| `data/reference/` | Synthetic facility, identity, and program crosswalks used to standardize the two source perspectives. |
| `data/expected-results/` | The scenario truth used to verify counts and prevent a polished demonstration from drifting away from its own evidence. |
| `docs/` | Portfolio context, current and target states, service objectives, architecture decisions, the huddle scenario, and demonstration provenance. |
| `project/` | The reproducible GitHub Project definition, its status model, seed tickets, huddle-created tickets, and the runtime manifest for Project 13. |
| `demo/` | The locked huddle script, voice plan, deterministic GitHub action ledger, video plan, opening artwork, and production notes. |
| `demo/final/` | The completed four-minute video, ready for playback or sharing. |
| `src/` | Small Python modules that generate the data, simulate Bronze ingestion, standardize source records, reconcile deliveries, validate meaning, compose modular audio, and render the deterministic video. Pillow draws the visual layer; FFmpeg composes and encodes the media. |
| `tests/` | Tests for scenario truth, privacy-safe repository contents, source mapping, release meaning, Project configuration, agent identities, human handoffs, action timing, and media contracts. |
| `pyproject.toml` | The minimal Python package and dependency definition for the reproducible environment. |
