import {createHash} from "node:crypto";
import {mkdir, readFile, writeFile} from "node:fs/promises";
import path from "node:path";
import {mayaPrompt, specialistPrompt} from "./prompts.mjs";

export const RESOURCE_PREFIX = "Health Huddle Live POC";

function transferTool(transfers) {
  return {
    type:"system",
    name:"transfer_to_agent",
    description:"Transfer the single speaking floor from Maya to exactly one ready specialist after a fresh coordinator grant. Never reuse an earlier grant.",
    params:{system_tool_type:"transfer_to_agent", transfers}
  };
}

function baseConversationConfig({agent, config, knowledgeId, toolIds = [], prompt, firstMessage = "", transfers = []}) {
  return {
    asr:{quality:"high", provider:"scribe_realtime", user_input_audio_format:"pcm_16000"},
    turn:{
      turn_timeout:7,
      silence_end_call_timeout:900,
      turn_eagerness:"eager",
      soft_timeout_config:{
        timeout_seconds:3,
        message:"I’m checking the huddle context.",
        use_llm_generated_message:false,
        disable_until_first_user_message:true
      },
      mode:"turn"
    },
    tts:{
      model_id:config.tts_model_id,
      voice_id:agent.voice_id,
      agent_output_audio_format:"pcm_16000",
      optimize_streaming_latency:3,
      stability:0.56,
      similarity_boost:0.76,
      speed:1.2
    },
    conversation:{text_only:false, max_duration_seconds:config.max_duration_seconds},
    agent:{
      first_message:firstMessage,
      language:config.language,
      prompt:{
        prompt,
        llm:config.model_id,
        ignore_default_personality:true,
        knowledge_base:[{type:"text", name:"Live huddle evidence", id:knowledgeId, usage_mode:"auto"}],
        tool_ids:toolIds,
        built_in_tools:transfers.length ? {transfer_to_agent:transferTool(transfers)} : {}
      }
    }
  };
}

function listValues(payload, key) { return payload?.[key] ?? []; }

export async function provision({client, config, packet, manifest, runtimePath, only = null, scenario = null}) {
  const suffix = manifest.packet_sha256.slice(0, 12);
  const knowledgeName = `${RESOURCE_PREFIX} evidence ${suffix}`;
  const listedKnowledge = listValues(await client.listKnowledge(), "documents");
  let knowledge = listedKnowledge.find((item) => item.name === knowledgeName);
  if (!knowledge) knowledge = await client.createKnowledgeText(knowledgeName, packet);
  const knowledgeId = knowledge.id ?? knowledge.document_id;
  if (!knowledgeId) throw new Error("knowledge creation did not return an id");
  const listedTools = listValues(await client.listTools(), "tools");
  let contextTool = listedTools.find((item) => item.tool_config?.name === "read_huddle_context");
  if (!contextTool) contextTool = await client.createTool({
    type:"client",
    name:"read_huddle_context",
    description:"Read the current coordinator state, ready teammate findings, and allow-listed GitHub Project ticket snapshot before making a substantive huddle contribution.",
    expects_response:true,
    response_timeout_secs:20,
    interruption_mode:"disable_during_tool_and_turn",
    pre_tool_speech:"off",
    parameters:{type:"object",properties:{},required:[]}
  });
  const contextToolId = contextTool.id;
  if (!contextToolId) throw new Error("context tool creation did not return an id");
  let projectTool = listedTools.find((item) => item.tool_config?.name === "set_project_status");
  if (!projectTool) projectTool = await client.createTool({
    type:"client",
    name:"set_project_status",
    description:"Request one guarded status move on the allow-listed GitHub Project after the coordinator explicitly enables RECORD_DECISION. This never represents human approval.",
    expects_response:true,
    response_timeout_secs:30,
    interruption_mode:"disable_during_tool_and_turn",
    pre_tool_speech:"off",
    parameters:{
      type:"object",
      properties:{
        issue_number:{type:"integer",description:"Allow-listed repository issue number."},
        status:{type:"string",description:"Requested Project status.",enum:["Backlog","Ready","In Progress","Blocked","Review","Done"]}
      },
      required:["issue_number","status"]
    }
  });
  const projectToolId = projectTool.id;
  if (!projectToolId) throw new Error("Project tool creation did not return an id");
  let yieldTool = listedTools.find((item) => item.tool_config?.name === "yield_floor");
  if (!yieldTool) yieldTool = await client.createTool({
    type:"client",
    name:"yield_floor",
    description:"Signal the local coordinator only after delivering one audible specialist contribution, or the exact nothing-to-report sentence. This tool does not transfer to another agent.",
    expects_response:true,
    response_timeout_secs:10,
    interruption_mode:"disable_during_tool_and_turn",
    pre_tool_speech:"off",
    parameters:{
      type:"object",
      properties:{
        agent_id:{type:"string",description:"Your configured lowercase huddle agent id."},
        status:{type:"string",description:"Whether you contributed new information or explicitly had nothing to report.",enum:["reported","nothing_to_report"]}
      },
      required:["agent_id","status"]
    }
  });
  const yieldToolId = yieldTool.id;
  if (!yieldToolId) throw new Error("Yield tool creation did not return an id");
  const specialistToolIds = [contextToolId, yieldToolId];
  const mayaToolIds = [contextToolId, projectToolId];

  const targetIds = only ? new Set(only) : new Set(config.agents.map((agent) => agent.id));
  const listedAgents = listValues(await client.listAgents(), "agents");
  const agentIds = {};
  for (const agent of config.agents.filter((candidate) => targetIds.has(candidate.id))) {
    const name = `${RESOURCE_PREFIX} - ${agent.name}`;
    let remote = listedAgents.find((item) => item.name === name);
    if (!remote) {
      const created = await client.createAgent({
        name,
        tags:["health-huddle","live-poc"],
        conversation_config:baseConversationConfig({agent, config, knowledgeId, toolIds:specialistToolIds, prompt:specialistPrompt(agent, null, scenario)})
      });
      remote = {agent_id:created.agent_id, name};
    }
    agentIds[agent.id] = remote.agent_id;
  }

  const mayaId = agentIds.maya;
  if (mayaId && Object.keys(agentIds).length > 1) {
    const maya = config.agents.find((agent) => agent.id === "maya");
    const specialists = config.agents.filter((agent) => agent.id !== "maya" && agentIds[agent.id]);
    await client.updateAgent(mayaId, {conversation_config:baseConversationConfig({
      agent:maya,
      config,
      knowledgeId,
      toolIds:mayaToolIds,
      prompt:mayaPrompt(Object.fromEntries(specialists.map((agent) => [agent.name, agentIds[agent.id]])), scenario),
      firstMessage:"",
      transfers:specialists.map((agent) => ({
        agent_id:agentIds[agent.id],
        condition:`Call only when the latest user message is a fresh coordinator command containing exactly GRANT_FLOOR:${agent.id}, and no later agent message follows that command. Never reuse an earlier grant.`,
        delay_ms:0,
        transfer_message:`${agent.name}, you have the floor.`,
        enable_transferred_agent_first_message:false
      }))
    })});
    for (const agent of specialists) {
      await client.updateAgent(agentIds[agent.id], {conversation_config:baseConversationConfig({
        agent,
        config,
        knowledgeId,
        toolIds:specialistToolIds,
        prompt:specialistPrompt(agent, mayaId, scenario),
        firstMessage:""
      })});
    }
  }

  const runtime = {
    schema_version:2,
    floor_protocol:"outbound_transfer_with_client_yield",
    provisioned_at:new Date().toISOString(),
    knowledge:{id:knowledgeId, name:knowledgeName, packet_sha256:manifest.packet_sha256},
    context_tool:{id:contextToolId, name:"read_huddle_context"},
    yield_tool:{id:yieldToolId, name:"yield_floor"},
    project_tool:{id:projectToolId, name:"set_project_status"},
    model_id:config.model_id,
    tts_model_id:config.tts_model_id,
    agents:Object.fromEntries(config.agents.filter((agent) => agentIds[agent.id]).map((agent) => [agent.id, {agent_id:agentIds[agent.id], name:agent.name, voice_id:agent.voice_id}]))
  };
  runtime.config_sha256 = createHash("sha256").update(JSON.stringify(runtime.agents)).digest("hex");
  await mkdir(path.dirname(runtimePath), {recursive:true});
  await writeFile(runtimePath, `${JSON.stringify(runtime, null, 2)}\n`, {mode:0o600});
  return runtime;
}

export async function readRuntime(runtimePath) { return JSON.parse(await readFile(runtimePath, "utf8")); }
