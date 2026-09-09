import test from "node:test";
import assert from "node:assert/strict";
import {evaluateRun} from "../evaluation/evaluate.mjs";

test("accepts a complete grounded six-agent run", () => {
  const contribution = "We found four duplicate deliveries. Referral, status, and event time form a candidate key, while the PARIS row ID preserves delivery lineage. Universal uniqueness and timestamp stability still need the human source owner to confirm. I can help cross-check the evidence.";
  const transcript = ["daniel","priya","marcus","elena","owen"].map((speaker) => ({speaker,kind:"contribution",text:speaker === "daniel" ? `${contribution} The modernization goal is a governed Fabric foundation under human authority.` : contribution}));
  transcript.push({speaker:"maya",kind:"closing",text:"The agents recommend investigation, but there is no human approval yet; the human source owner must decide."});
  const floorEvents = ["daniel","priya","marcus","elena","owen"].flatMap((agent_id) => ["floor_granted","speaking","yielded"].map((state) => ({agent_id,state})));
  const events = Array.from({length:10}, () => ({type:"agent_tool_response",agent_tool_response:{tool_name:"transfer_to_agent"}}));
  const result = evaluateRun({transcript, investigations:{reports:{elena:{}},marcus_followup:{}}, events, floorEvents, projectAction:{requested:true,result:{changed:true}}, projectRestored:true, auditText:"clean", durationSeconds:500, creditsUsed:12000, creditCeiling:60000});
  assert.equal(result.passed, true, JSON.stringify(result.criteria.filter((item) => !item.passed)));
});
