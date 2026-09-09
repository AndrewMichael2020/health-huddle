# Live demo and GitHub Project operations

## Final media

- Compatible MP4: `final/Skagit-Health-Live-Knowledge-Grounded-Agent-Huddle-FINAL-v2.mp4`
- Lossless-audio master: `final/Skagit-Health-Live-Knowledge-Grounded-Agent-Huddle-Lossless-Master-FINAL-v2.mov`
- Deterministic export evidence: `final/video-manifest-FINAL-v2.json`,
  `final/timeline-FINAL-v2.json`, and `final/video-validation-FINAL-v2.json`

The final video uses the accepted complete first-take WAV. Build frames and
intermediate media are intentionally ignored.

## Give agents an existing Issue

Repository Issues and Project 13 are the agents’ work surface. Add an existing
Issue to that Project deliberately:

```zsh
gh auth refresh -s repo,read:project,project
gh project item-add 13 \
  --owner AndrewMichael2020 \
  --url https://github.com/AndrewMichael2020/health-huddle/issues/ISSUE_NUMBER
```

To create a durable Issue first, prepare its body in a local file and run:

```zsh
issue_url=$(gh issue create \
  --repo AndrewMichael2020/health-huddle \
  --title "Bounded decision title" \
  --body-file /absolute/path/to/issue-body.md)

gh project item-add 13 --owner AndrewMichael2020 --url "$issue_url"
```

Issue creation is durable and is never part of an automatic test reset. Obtain
Human authorization before creating, editing, commenting on, or closing an
Issue.

## Use a reversible Project-only test item

For a one-off coordinator test, prefer a run-tagged Project draft item:

```zsh
gh project item-create 13 \
  --owner AndrewMichael2020 \
  --title "[huddle:RUN_ID] Temporary test" \
  --body "Reversible Project-only test item." \
  --format json
```

The coordinator’s `ProjectGuard` is safer than manual testing: it snapshots the
entire Project, limits issue numbers and fields, records inverse operations,
deletes only drafts tagged with the current run, restores in `finally`, and
compares the final snapshot hash with the starting hash. Never give an agent a
GitHub token or unrestricted `gh` access.

Implementation work for this POC belongs in a separate private Project; do not
mix it with the agents’ Issue queue.
