# GitHub Project definition

`project-config.yml` is the reproducible specification for the demonstration
board. `seed-tickets.yml` separates tickets that exist before the huddle from
tickets the analysts will create during the recorded replay.

The live Project is an execution surface, not the source of truth. Tier 2 will
capture its Project and field identifiers in a runtime manifest, reset all
demonstration items to this specification before each rehearsal, and replay a
validated action ledger against the board.

Ticket language intentionally says **ticket**, not “DevOps ticket.” GitHub
Issues are the tickets shown in this demonstration.
