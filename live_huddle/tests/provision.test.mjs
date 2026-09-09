import test from "node:test";
import assert from "node:assert/strict";
import {mkdtemp, readFile, rm} from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {provision, RESOURCE_PREFIX} from "../elevenlabs/provision.mjs";

const agents = [
  {id:"maya",name:"Maya Singh",role:"Lead BI Analyst Agent",voice_id:"voice-maya"},
  {id:"daniel",name:"Daniel Cho",role:"Analytics Director Agent",voice_id:"voice-daniel"},
  {id:"priya",name:"Priya Raman",role:"Meditech Mapping BI Analyst Agent",voice_id:"voice-priya"},
  {id:"marcus",name:"Marcus Reed",role:"PARIS Mapping BI Analyst Agent",voice_id:"voice-marcus"},
  {id:"elena",name:"Elena Park",role:"Reconciliation and Reliability BI Analyst Agent",voice_id:"voice-elena"},
  {id:"owen",name:"Owen Brooks",role:"Governance and Release BI Analyst Agent",voice_id:"voice-owen"}
];

test("provisions one-way specialist transfers with coordinator-controlled yields", async () => {
  const temporary = await mkdtemp(path.join(os.tmpdir(),"health-huddle-provision-"));
  const runtimePath = path.join(temporary,"runtime.json");
  const packetHash = "a".repeat(64);
  const updates = [];
  const client = {
    listKnowledge:async () => ({documents:[{id:"knowledge-1",name:`${RESOURCE_PREFIX} evidence ${packetHash.slice(0,12)}`}]}),
    listTools:async () => ({tools:[
      {id:"context-1",tool_config:{name:"read_huddle_context"}},
      {id:"project-1",tool_config:{name:"set_project_status"}},
      {id:"yield-1",tool_config:{name:"yield_floor"}}
    ]}),
    listAgents:async () => ({agents:agents.map((agent) => ({agent_id:`remote-${agent.id}`,name:`${RESOURCE_PREFIX} - ${agent.name}`}))}),
    updateAgent:async (agentId,payload) => updates.push({agentId,payload}),
    createKnowledgeText:async () => assert.fail("knowledge should be reused"),
    createTool:async () => assert.fail("tools should be reused"),
    createAgent:async () => assert.fail("agents should be reused")
  };
  const scenario = {
    question:"A bounded test question",
    speech:{specialist_min_words:35,specialist_max_words:55,director_max_words:65,opening_max_words:35,closing:{min_words:45,max_words:60,exact_final_phrase:"Happy Wednesday, everyone."}},
    role_lenses:Object.fromEntries(agents.map((agent) => [agent.id,`${agent.name} role lens`]))
  };
  try {
    await provision({client,config:{agents,model_id:"test-model",tts_model_id:"test-tts",language:"en",max_duration_seconds:900},packet:"evidence",manifest:{packet_sha256:packetHash},runtimePath,scenario});
    const maya = updates.find((update) => update.agentId === "remote-maya").payload.conversation_config;
    const mayaTransfers = maya.agent.prompt.built_in_tools.transfer_to_agent.params.transfers;
    assert.equal(mayaTransfers.length,5);
    assert.equal(new Set(mayaTransfers.map((rule) => rule.agent_id)).size,5);
    assert.ok(mayaTransfers.every((rule) => /latest user message/.test(rule.condition) && /Never reuse/.test(rule.condition)));
    for (const specialist of updates.filter((update) => update.agentId !== "remote-maya")) {
      assert.deepEqual(specialist.payload.conversation_config.agent.prompt.built_in_tools,{});
      assert.match(specialist.payload.conversation_config.agent.prompt.prompt,/call yield_floor once/);
      assert.equal(specialist.payload.conversation_config.turn.soft_timeout_config.message,"I’m checking the huddle context.");
    }
    const runtime = JSON.parse(await readFile(runtimePath,"utf8"));
    assert.equal(runtime.floor_protocol,"outbound_transfer_with_client_yield");
    assert.equal(runtime.yield_tool.id,"yield-1");
  } finally {
    await rm(temporary,{recursive:true,force:true});
  }
});
