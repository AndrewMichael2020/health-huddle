# Demonstration assets

Tier 2 uses `huddle-script.json` as the locked transcript, `action-ledger.json`
as the deterministic GitHub replay, and `voice-plan.json` as the six-standard-
voice and credit contract. Generated voice manifests, rendered scenes and
validation reports are stored as build artifacts rather than source.

No ElevenLabs request may run until the transcript passes the semantic,
timing, vocabulary, privacy and action-ledger checks defined for Tier 2.

## Deterministic production

The paid workflow is deliberately split into preflight, six short voice trials,
full synthesis, and selective replacement. The accepted full run generated
4,057 characters after a 767-character trial reel. A previous full run was
retained in the audit trail. Three expressive reaction clips then used 317
additional characters; total speech-generation use for the production was
9,195 characters, below the 15,000-character hard ceiling. The remaining 25
accepted clips were not regenerated.

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

The renderer locks the opening fades, speaker identities, three-line rolling
transcript, six-column Project panorama, GitHub action callouts, seven
Teams-style reaction bubbles and the overlapping team close. The screen always
labels the scenario as synthetic and requiring human approval. The validated
release is committed at `demo/final/Skagit-Health-Agent-Huddle.mp4`.
