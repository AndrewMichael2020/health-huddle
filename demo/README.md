# Demonstration assets

Tier 2 uses `huddle-script.json` as the locked transcript, `action-ledger.json`
as the deterministic GitHub replay, and `voice-plan.json` as the six-standard-
voice and credit contract. Generated voice manifests, rendered scenes and
validation reports are stored as build artifacts rather than source.

No ElevenLabs request may run until the transcript passes the semantic,
timing, vocabulary, privacy and action-ledger checks defined for Tier 2.

## Deterministic production

The paid workflow is deliberately split into preflight, six short voice trials,
and full synthesis. The final accepted run generated 4,057 characters after a
767-character trial reel. A previous full run was retained in the audit trail;
total speech-generation use for the production was 8,878 characters, below the
15,000-character hard ceiling.

The final video is rendered from the validated audio timeline and real GitHub
Project captures:

```bash
python -m src.render_huddle_video \
  --audio-root .artifacts/full/composed \
  --captures-root /path/to/project-captures \
  --output .artifacts/video

python -m src.validate_huddle_video \
  --video .artifacts/video/skagit-health-agent-huddle.mp4 \
  --timeline .artifacts/full/composed/timeline.json \
  --audit .artifacts/video/video-audit.json \
  --output .artifacts/video/video-validation.json
```

The renderer locks the opening fades, speaker identities, subtitles, GitHub
action callouts, seven Teams-style reaction bubbles and the overlapping team
close. The screen always labels the scenario as synthetic and requiring human
approval.
