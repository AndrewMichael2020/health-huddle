import test from "node:test";
import assert from "node:assert/strict";
import {loadScenario, validateScenario} from "../scenario.mjs";

test("loads the default PARIS scenario", async () => {
  const {scenario} = await loadScenario();
  assert.equal(scenario.id, "paris-duplicate-events-lineage");
  assert.equal(scenario.flow.audible_turns.length, 5);
  assert.equal(scenario.evaluation.required_findings.length, 3);
});

test("rejects an incomplete reusable scenario", () => {
  assert.throws(() => validateScenario({schema_version:1}), /Invalid huddle scenario/);
});
