---
name: produce-agent-huddle-demo
description: Produce, validate, render, or selectively revise the Health Huddle repository's six-agent healthcare data-modernization demonstration.
---

# Produce the agent huddle demo

Work from the repository root. Preserve the demonstration as an auditable
healthcare data-engineering example, not a free-form audio scene.

## Ground the work

Read only the sources needed for the requested operation:

- For scenario meaning, read `docs/huddle-scenario.md`,
  `docs/modernization-goal.md`, and the relevant file in `contracts/`.
- For Project changes, read `project/project-config.yml`,
  `project/seed-tickets.yml`, and `demo/action-ledger.json`.
- For dialogue or voice changes, read `demo/huddle-script.json`,
  `demo/voice-plan.json`, and `demo/README.md`.
- For visual changes, read `demo/video-plan.json` and
  `src/render_huddle_video.py`.
- For provenance or public claims, read `docs/demo-provenance.md`.

## Preserve these invariants

- Use only synthetic records and invented source schemas. Never add clinical,
  organizational, credential, or personally identifying information.
- Keep six BI Analyst Agents, three female and three male voices, one huddle
  lead, and an Analytics Director Agent who is not the lead.
- Identify each agent by name and Agent role on the agent's first turn.
- Keep recommendations separate from authority. Privacy, source meaning,
  product service objectives, and release decisions go to the named human role.
- Treat the script and action ledger as the production contract. Every visible
  GitHub action must have a timed ledger entry and every ledger entry must be
  reproducible on Project 13.
- Keep the MP4's synthetic-data and human-approval labels visible.
- Never store `ELEVENLABS_KEY` or any other secret in the repository.

## Use the least expensive safe production path

Run semantic validation and tests before any paid synthesis. Check the voice
plan's character ceiling before calling ElevenLabs. Generate one file per turn.
When the user changes delivery rather than meaning, regenerate only the affected
clips, update their manifest entries, and recompose the timeline. Do not replace
accepted clips merely to make a uniform rerun.

Use Eleven v3 audio tags only for requested expressive delivery. Keep the clean
spoken transcript in `text` and the tagged version in `synthesis_text`, so the
on-screen transcript never exposes stage directions.

## Build and verify

Use the existing modules rather than reimplementing their logic:

1. Run `python -m src.validate_huddle --require-ready` and `python -m pytest`.
2. Generate or selectively tune modular audio through the matching GitHub
   Actions workflow; do not bypass the repository secret boundary.
3. Compose audio with `src.compose_huddle_audio` and validate it with
   `src.validate_huddle_audio`.
4. Render with `src.render_huddle_video` using the validated timeline and real
   GitHub Project captures.
5. Validate the release with `src.validate_huddle_video`. Inspect frames from
   the opening, a long rolling-transcript turn, a ticket action, every reaction
   style, and the overlapping close.
6. Place only the accepted MP4 at
   `demo/final/Skagit-Health-Agent-Huddle.mp4`. Keep intermediate audio, frames,
   and renders in build artifacts.

Report the outcome with the added character count, preserved-clip count, test
result, media format, duration, action count, reaction count, and any remaining
blocker. Stop before paid synthesis or external Project mutation if the user has
not authorized it.
