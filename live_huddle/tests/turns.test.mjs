import test from "node:test";
import assert from "node:assert/strict";
import {parseTransferRound} from "../coordinator/turns.mjs";

const details = (messages) => ({transcript:messages.map((message) => ({role:"agent", message}))});

test("accepts an explicit nothing-to-report turn as completed", () => {
  const round = parseTransferRound(details([
    "Elena Park, you have the floor.",
    "I have nothing to report on this matter.",
    "I yield my time.",
    "Maya Singh, the floor is yours."
  ]), "Elena Park");
  assert.equal(round.noReport, true);
  assert.equal(round.contribution, "I have nothing to report on this matter.");
});

test("a silent transfer remains an absence", () => {
  const round = parseTransferRound(details([
    "Owen Brooks, you have the floor.",
    "Maya Singh, the floor is yours."
  ]), "Owen Brooks");
  assert.equal(round, null);
});
