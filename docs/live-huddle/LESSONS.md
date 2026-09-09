# Lessons from the live agent huddle

## What made the result work

- Treat the meeting as a decision huddle, not a brainstorming session.
- Give specialists deep private evidence and ask them to speak only the smallest
  new role-specific delta.
- Keep one audible floor. Maya grants it only after a specialist reports
  `ready`; all other agents may investigate silently.
- Let Maya send task instructions and prior findings through private context so
  she does not recite orchestration details aloud.
- Concrete record IDs make technical findings understandable; long evidence
  dumps do not.
- Let Daniel connect the bounded decision to organizational goals once. Let Maya
  facilitate and close rather than repeat each specialist.
- Preserve Human authority explicitly in every consequential recommendation and
  Project action.
- One useful first take is preferable to repeated paid retries. Natural pauses
  and stutters are acceptable evidence of an organic agent huddle.

## Floor and timing rules

- Target roughly 25 seconds and cap each specialist at 45 seconds per issue.
- Do not impose a global huddle deadline. Continue only while a bounded issue is
  gaining evidence or moving toward a decision.
- Use a 200 ms generated floor transition. Do not remove natural silence from an
  accepted recording in post-production.
- A specialist with no delta says “I have nothing to report on this matter,”
  then “I yield my time,” and transfers back to Maya.
- A truly silent specialist is marked not present and skipped, not parked.
- Separate a Project-tool round from the final closing round.

## Knowledge, tools, and instruction controls

The useful separation is between what an agent can know, what Maya can tell it
privately, and what the room needs to hear:

1. Build one bounded, source-listed evidence packet and attach it to every
   specialist's knowledge base. Do not encode the expected answer in that
   packet or in the task brief.
2. Give every specialist the same read-only huddle-context tool. It exposes the
   current question, relevant Project items, that specialist's private finding,
   and compact summaries of earlier spoken findings. Agents therefore form an
   opinion from evidence while avoiding a verbal replay of the whole record.
3. Add a small role lens to each agent's instructions. The lens defines what the
   role is accountable for noticing; it does not prescribe a conclusion or a
   line of dialogue.
4. Let Maya send a private, turn-specific wire immediately before transfer. It
   should say which unresolved point to address and ask for only new information.
   The wire is coordination context, not a script for the specialist to read.
5. Keep GitHub Project reads available to all roles, but route writes through a
   guarded tool with an issue allow-list and a narrowly enumerated action. One
   designated actor requests the change; the coordinator records it, restores
   the pre-run snapshot, and verifies the snapshot hash.

For future trials, compare shared knowledge-base retrieval with direct read-only
repository and Project tools. Measure whether tool-fed context improves source
precision enough to justify its latency and prompt footprint. Do not preload
long summaries merely to eliminate silence: a short thinking interval is
preferable to an agent repeating evidence it did not need to say aloud.

Turn length is controlled per specialist and per issue, not by ending the whole
huddle on a stopwatch. Aim for 25 seconds and stop at 45 seconds. The prompt
should request a conclusion, one or two decisive facts or record IDs, the next
action or Human owner, and a yield. If a turn produces no informative delta
after one short clarification, Maya skips to the next reporting role. The
huddle continues while the bounded issue is still advancing and closes only
after Maya records the decision, action, and Human handoff.

## Cost and reliability rules

- Validate scenarios, prompts, evidence references, Project allow-lists, and
  restoration locally before any provider call.
- Build the evidence packet once and share it; keep role lenses small.
- Permit one repair attempt only when it can materially improve the result.
- Record real provider usage, stop at the run budget, and never regenerate an
  accepted contribution merely to polish delivery.
- Snapshot the agents’ Project before mutation, record inverse operations, and
  verify the exact snapshot hash after restoration.

## Presentation rules

- Use the accepted full audio as the timing authority.
- Never overwrite a media filename already opened by a reviewer; publish a new
  immutable version.
- Keep exact captions and claims deterministic. Image generation may supply
  atmosphere, not evidence or text.
- Use a compatible MP4 plus a lossless-audio MOV master.
- Decode the full export, inspect representative frames and every scene boundary,
  and verify the physical audio tail—not only container metadata.
