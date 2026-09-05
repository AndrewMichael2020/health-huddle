# Huddle scenario

The initial cross-system load completes and matches raw source row counts. The
second load exposes meaning that the original field map did not capture:

1. five Meditech encounters contain later corrections;
2. four PARIS status events repeat earlier business events under new extract rows;
3. two new PARIS events use an unmapped program code;
4. two PARIS clients have no approved enterprise identity crosswalk, affecting
   four initial status events; and
5. referral notes lack completed classification and lifecycle treatment.

The BI Analytics team decides that Development work may continue, but promotion
must remain blocked. The analysts create tickets for the responsible teams and
offer specific support with crosswalk evidence and reconciliation tests.

The visible GitHub Project is the work system for this demonstration. All work
items are called tickets.
