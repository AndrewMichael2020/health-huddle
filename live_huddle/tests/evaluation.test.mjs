import test from "node:test";
import assert from "node:assert/strict";
import {evaluateRun} from "../evaluation/evaluate.mjs";

test("accepts a complete grounded six-agent run", () => {
  const contribution = "Four deliveries repeat earlier events. Referral, status, and event time form a candidate key; the PARIS row ID is lineage. The Human source owner must confirm uniqueness and timestamps. I can help cross-check the written evidence. I yield my time.";
  const transcript = ["daniel","priya","marcus","elena","owen"].map((speaker) => ({speaker,kind:"contribution",text:speaker === "daniel" ? `${contribution} The modernization goal is a governed Fabric foundation under human authority.` : contribution}));
  transcript.push({speaker:"maya",kind:"closing",text:"The sample supports a candidate PARIS event grain while row IDs remain lineage. Issue 11 moved to Ready and was restored after testing. Human Systems, BI Analyst, and Privacy and Security owners retain their decisions. No Human approval was given. Happy Wednesday, everyone."});
  const floorEvents = ["daniel","priya","marcus","elena","owen"].flatMap((agent_id) => ["floor_granted","speaking","yielded"].map((state) => ({agent_id,state})));
  const events = Array.from({length:10}, () => ({type:"agent_tool_response",agent_tool_response:{tool_name:"transfer_to_agent"}}));
  const result = evaluateRun({transcript, investigations:{reports:{elena:{}},marcus_followup:{}}, events, floorEvents, projectAction:{requested:true,result:{changed:true}}, projectRestored:true, auditText:"clean", durationSeconds:500, creditsUsed:12000, creditCeiling:60000});
  assert.equal(result.passed, true, JSON.stringify(result.criteria.filter((item) => !item.passed)));
});

test("rejects repetitive-length turns and a missing Wednesday close", () => {
  const verbose = Array.from({length:80}, (_, index) => `word${index}`).join(" ");
  const transcript = ["daniel","priya","marcus","elena","owen"].map((speaker) => ({speaker,kind:"contribution",text:verbose}));
  transcript.push({speaker:"maya",kind:"recap",text:"One recap."},{speaker:"maya",kind:"recap",text:"Two recaps."},{speaker:"maya",kind:"recap",text:"Three recaps."},{speaker:"maya",kind:"closing",text:"The huddle stops here."});
  const floorEvents = ["daniel","priya","marcus","elena","owen"].flatMap((agent_id) => ["floor_granted","speaking","yielded"].map((state) => ({agent_id,state})));
  const events = Array.from({length:10}, () => ({type:"agent_tool_response",agent_tool_response:{tool_name:"transfer_to_agent"}}));
  const result = evaluateRun({transcript, investigations:{reports:{elena:{}},marcus_followup:{},material:"four duplicate referral status event time PARIS row ID lineage uniqueness timestamp human help"}, events, floorEvents, projectAction:{requested:true,result:{changed:true}}, projectRestored:true, auditText:"clean", durationSeconds:300, creditsUsed:1000, creditCeiling:10000});
  assert.equal(result.criteria.find((item) => item.id === "AC-13").passed, false);
  assert.equal(result.criteria.find((item) => item.id === "AC-17").passed, false);
  assert.equal(result.criteria.find((item) => item.id === "AC-18").passed, false);
});
