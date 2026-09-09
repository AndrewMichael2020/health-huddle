import test from "node:test";
import assert from "node:assert/strict";
import {parseTransferRound} from "../coordinator/turns.mjs";

const MAYA = "agent-maya";
const SPECIALIST = "agent-specialist";
const message = (text, agentId) => ({role:"agent",message:text,agent_metadata:{agent_id:agentId}});
const yieldCall = (status) => ({role:"agent",message:null,agent_metadata:{agent_id:SPECIALIST},tool_calls:[{tool_name:"yield_floor",params_as_json:JSON.stringify({agent_id:"owen",status})}]});
const options = (agentName) => ({agentName,specialistAgentId:SPECIALIST});

test("accepts an explicit nothing-to-report turn as completed", () => {
  const round = parseTransferRound({transcript:[
    message("Elena Park, you have the floor.",MAYA),
    message("I have nothing to report on this matter.",SPECIALIST),
    message("I yield my time.",SPECIALIST),
    yieldCall("nothing_to_report")
  ]}, options("Elena Park"));
  assert.equal(round.noReport, true);
  assert.equal(round.contribution, "I have nothing to report on this matter.");
});

test("a yield without specialist speech remains an absence", () => {
  const round = parseTransferRound({transcript:[
    message("Owen Brooks, you have the floor.",MAYA),
    yieldCall("reported")
  ]}, options("Owen Brooks"));
  assert.equal(round, null);
});

test("does not attribute Maya's post-transfer summary to a silent specialist", () => {
  const round = parseTransferRound({transcript:[
    message("Owen Brooks, you have the floor.",MAYA),
    yieldCall("reported"),
    message("The release boundary is unchanged and Human owners retain every consequential decision while the written evidence remains available for review.",MAYA)
  ]}, options("Owen Brooks"));
  assert.equal(round, null);
});

test("accepts one attributable specialist contribution before the yield signal", () => {
  const round = parseTransferRound({transcript:[
    message("Owen Brooks, you have the floor.",MAYA),
    message("Owen Brooks, Governance and Release BI Analyst Agent. Release remains blocked until Human Privacy and Security, Systems, and BI Analytics owners resolve the written gates. No agent finding is Human approval. I yield my time.",SPECIALIST),
    yieldCall("reported")
  ]}, options("Owen Brooks"));
  assert.equal(round.noReport, false);
  assert.match(round.contribution,/Release remains blocked/);
});

test("rejects a no-report sentence paired with reported status", () => {
  const round = parseTransferRound({transcript:[
    message("Owen Brooks, you have the floor.",MAYA),
    message("I have nothing to report on this matter.",SPECIALIST),
    message("I yield my time.",SPECIALIST),
    yieldCall("reported")
  ]}, options("Owen Brooks"));
  assert.equal(round, null);
});

test("rejects a malformed yield payload without aborting the run parser", () => {
  const round = parseTransferRound({transcript:[
    message("Owen Brooks, you have the floor.",MAYA),
    message("Owen Brooks, Governance and Release BI Analyst Agent. I found a bounded release concern for the Human owners to review in the written evidence. No agent decision represents approval. I yield my time.",SPECIALIST),
    {role:"agent",message:null,agent_metadata:{agent_id:SPECIALIST},tool_calls:[{tool_name:"yield_floor",params_as_json:"{"}]}
  ]}, options("Owen Brooks"));
  assert.equal(round, null);
});
