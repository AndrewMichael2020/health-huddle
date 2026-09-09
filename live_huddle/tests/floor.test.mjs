import test from "node:test";
import assert from "node:assert/strict";
import {FloorCoordinator} from "../coordinator/floor.mjs";

test("only a ready agent can hold the single floor", () => {
  let now = 1000;
  const floor = new FloorCoordinator(["maya","marcus"], {transitionMs:400, clock:() => now});
  assert.throws(() => floor.grant("marcus"), /not ready/);
  floor.ready("marcus", {claim:"supported"});
  floor.grant("marcus");
  floor.speaking("marcus");
  assert.throws(() => floor.grant("maya"), /already held/);
  floor.yield("marcus");
  floor.ready("maya", {claim:"recap"});
  assert.throws(() => floor.grant("maya"), /transition gap/);
  now += 400;
  floor.grant("maya");
});

test("challenge requires a completed spoken turn", () => {
  const floor = new FloorCoordinator(["marcus"]);
  floor.ready("marcus", {});
  floor.grant("marcus");
  assert.throws(() => floor.challenge("marcus"), /yield/);
  floor.yield("marcus");
  floor.challenge("marcus");
  floor.ready("marcus", {});
});
