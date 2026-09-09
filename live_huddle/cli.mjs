#!/usr/bin/env node
import {randomUUID} from "node:crypto";
import {execFile} from "node:child_process";
import {mkdir, readFile, writeFile} from "node:fs/promises";
import path from "node:path";
import {promisify} from "node:util";
import {fileURLToPath} from "node:url";
import {AuditLog} from "./audit/logger.mjs";
import {pcm16ToWav, pcmDurationSeconds} from "./audio/wav.mjs";
import {FloorCoordinator} from "./coordinator/floor.mjs";
import {parseTransferRound} from "./coordinator/turns.mjs";
import {buildEvidencePacket, repoRoot} from "./evidence/build-packet.mjs";
import {ElevenLabsClient} from "./elevenlabs/client.mjs";
import {openConversation} from "./elevenlabs/conversation.mjs";
import {provision, readRuntime} from "./elevenlabs/provision.mjs";
import {createInvestigationBrief, investigate, oneTextTurn, validateInvestigationBrief} from "./elevenlabs/rehearsal.mjs";
import {evaluateRun, evaluateTextRehearsal} from "./evaluation/evaluate.mjs";
import {ProjectGuard, selectedIssueEvidence, snapshotHash} from "./github/project.mjs";
import {renderRunReport} from "./operator/report.mjs";
import {loadScenario} from "./scenario.mjs";

const execFileAsync = promisify(execFile);
const here = path.dirname(fileURLToPath(import.meta.url));
const artifacts = path.join(repoRoot, ".artifacts/live-huddle");
const runtimePath = path.join(artifacts, "runtime.json");
const agentsConfig = JSON.parse(await readFile(path.join(here, "config/agents.json"), "utf8"));
const policy = JSON.parse(await readFile(path.join(here, "config/policy.json"), "utf8"));
const {scenario, path:scenarioPath} = await loadScenario();
const allowedEvidenceRefs = new Set([...scenario.knowledge.source_allowlist, scenario.knowledge.project_source_label]);

async function evidence() {
  const projectEvidence = await selectedIssueEvidence({owner:scenario.project.owner, repository:scenario.project.repository, issueNumbers:scenario.project.allowed_issue_numbers});
  return buildEvidencePacket({projectEvidence, sourceAllowlist:scenario.knowledge.source_allowlist, excludedSources:scenario.knowledge.excluded_sources, projectSourceLabel:scenario.knowledge.project_source_label});
}

async function preflight() {
  if (!process.env.ELEVENLABS_KEY) throw new Error("ELEVENLABS_KEY is not loaded; source /Users/antvibe/Documents/Dev/scripts/load-dev-env.zsh");
  const [{stdout:nodeVersion}, {stdout:auth}, clientUser] = await Promise.all([
    execFileAsync("node", ["--version"]),
    execFileAsync("gh", ["auth","status"]),
    new ElevenLabsClient().get("/v1/user")
  ]);
  if (!auth.includes("project")) throw new Error("GitHub token does not show Project scope");
  const rootReadmeChanged = (await execFileAsync("git", ["diff","--name-only","--","README.md"])).stdout.trim();
  if (rootReadmeChanged) throw new Error("root README is modified while frozen");
  console.log(JSON.stringify({ok:true,node:nodeVersion.trim(),github_project_scope:true,elevenlabs_authenticated:Boolean(clientUser),root_readme_frozen:true}, null, 2));
}

async function buildEvidence() {
  const result = await evidence();
  console.log(JSON.stringify({out_dir:result.outDir, packet_sha256:result.manifest.packet_sha256, source_count:result.manifest.source_count}, null, 2));
}

async function provisionAgents(only = null) {
  const built = await evidence();
  const runtime = await provision({client:new ElevenLabsClient(), config:agentsConfig, packet:built.packet, manifest:built.manifest, runtimePath, only, scenario});
  console.log(JSON.stringify({scenario:scenario.id, knowledge:runtime.knowledge, agents:Object.fromEntries(Object.entries(runtime.agents).map(([id, value]) => [id, {agent_id:value.agent_id, name:value.name, voice_id:value.voice_id}]))}, null, 2));
}

function projectGuard(audit = null) {
  return new ProjectGuard({owner:scenario.project.owner, number:scenario.project.number, allowedIssueNumbers:scenario.project.allowed_issue_numbers, audit});
}

async function snapshotProject() {
  const captured = await projectGuard().snapshot();
  await mkdir(path.join(artifacts, "project"), {recursive:true});
  const target = path.join(artifacts, "project", `project-${scenario.project.number}-snapshot.json`);
  await writeFile(target, `${JSON.stringify(captured, null, 2)}\n`, {mode:0o600});
  console.log(JSON.stringify({path:target, sha256:captured.sha256, items:captured.snapshot.items.totalCount ?? captured.snapshot.items.items?.length}, null, 2));
}

async function runInvestigations({audit, briefOverride = null}) {
  const runtime = await readRuntime(runtimePath);
  const byId = Object.fromEntries(agentsConfig.agents.map((agent) => [agent.id, agent]));
  const project = await projectGuard().snapshot();
  const projectItems = (project.snapshot.items.items ?? [])
    .filter((item) => scenario.project.allowed_issue_numbers.includes(Number(item.content?.number)))
    .map((item) => ({issue_number:item.content.number,title:item.title ?? item.content.title,status:item.status}));
  console.error("[huddle] maya: directing the result-free investigation method");
  const briefResult = briefOverride
    ? {brief:validateInvestigationBrief(briefOverride, scenario),conversationId:null,attempt:0}
    : await createInvestigationBrief({client:new ElevenLabsClient(), agentId:runtime.agents.maya.agent_id, timeoutMs:policy.reasoning_timeout_ms, context:{self:"maya",state:"briefing",project_items:projectItems}, scenario});
  await audit.write("maya_investigation_brief", {conversation_id:briefResult.conversationId,attempt:briefResult.attempt,brief:briefResult.brief});
  console.error("[huddle] maya: investigation brief ready");
  const baseIds = scenario.flow.base_investigators;
  const initial = Object.fromEntries(await Promise.all(baseIds.map(async (id) => {
    console.error(`[huddle] ${id}: thinking`);
    await audit.write("agent_state", {agent_id:id,state:"thinking"});
    try {
      const result = await investigate({client:new ElevenLabsClient(), agent:byId[id], remote:runtime.agents[id], brief:briefResult.brief, timeoutMs:policy.reasoning_timeout_ms, context:{self:id,state:"thinking",project_items:projectItems,ready_teammates:[]}, scenario, allowedEvidenceRefs});
      await audit.write("agent_state", {agent_id:id,state:"ready",attempt:result.attempt,conversation_id:result.conversationId,report:result.report});
      console.error(`[huddle] ${id}: ready`);
      return [id,result.report];
    } catch (error) {
      await audit.write("agent_state", {agent_id:id,state:"parked",reason:error.message});
      console.error(`[huddle] ${id}: parked after two attempts`);
      return [id,null];
    }
  })));
  if (!initial.marcus) throw new Error("Marcus parked after two attempts; the bounded PARIS decision cannot proceed safely");
  await audit.write("agent_state", {agent_id:"elena",state:"thinking",trigger:"marcus finding"});
  console.error("[huddle] elena: thinking about Marcus's finding");
  let elena = null;
  try {
    elena = await investigate({client:new ElevenLabsClient(), agent:byId.elena, remote:runtime.agents.elena, brief:briefResult.brief, challenge:initial.marcus.spoken_summary, timeoutMs:policy.reasoning_timeout_ms, context:{self:"elena",state:"thinking",project_items:projectItems,ready_teammates:[{agent:"marcus",finding:initial.marcus}]}, scenario, allowedEvidenceRefs});
    initial.elena = elena.report;
    await audit.write("agent_state", {agent_id:"elena",state:"ready",conversation_id:elena.conversationId,report:elena.report});
    console.error("[huddle] elena: ready with a challenge");
  } catch (error) {
    initial.elena = null;
    await audit.write("agent_state", {agent_id:"elena",state:"parked",reason:error.message});
    console.error("[huddle] elena: parked after two attempts");
  }
  let marcusFollowup = null;
  if (elena) {
    try {
      const result = await investigate({client:new ElevenLabsClient(), agent:byId.marcus, remote:runtime.agents.marcus, brief:briefResult.brief, challenge:elena.report.spoken_summary, timeoutMs:policy.reasoning_timeout_ms, context:{self:"marcus",state:"challenged",project_items:projectItems,ready_teammates:[{agent:"elena",finding:elena.report}]}, scenario, allowedEvidenceRefs});
      marcusFollowup = result.report;
      await audit.write("agent_state", {agent_id:"marcus",state:"ready",trigger:"challenge follow-up",conversation_id:result.conversationId,report:result.report});
      console.error("[huddle] marcus: ready after follow-up investigation");
    } catch (error) {
      await audit.write("agent_state", {agent_id:"marcus",state:"parked",trigger:"challenge follow-up",reason:error.message});
      console.error("[huddle] marcus: follow-up parked after two attempts");
    }
  }
  return {maya_brief:briefResult.brief, reports:initial, marcus_followup:marcusFollowup};
}

async function textRehearsal() {
  const runId = `text-${randomUUID().slice(0, 8)}`;
  const runDir = path.join(artifacts, "runs", runId);
  const audit = new AuditLog(path.join(runDir, "events.jsonl"));
  const result = await runInvestigations({audit});
  const runtime = await readRuntime(runtimePath);
  const mayaPrompt = `Facilitate a text-only rehearsal using these ready specialist findings. Synthesize agreement, challenge, uncertainty, ticket action, assistance, and human handoffs in plain language. Do not invent approval.\n${JSON.stringify(result)}`;
  const maya = await oneTextTurn({client:new ElevenLabsClient(), agentId:runtime.agents.maya.agent_id, prompt:mayaPrompt, timeoutMs:policy.reasoning_timeout_ms, waitForInitial:true});
  await audit.write("maya_rehearsal", {conversation_id:maya.conversationId, response:maya.text});
  const output = {run_id:runId, ...result, maya:maya.text};
  const evaluation = evaluateTextRehearsal(output, scenario);
  await mkdir(runDir, {recursive:true});
  await writeFile(path.join(runDir, "text-rehearsal.json"), `${JSON.stringify(output, null, 2)}\n`, {mode:0o600});
  await writeFile(path.join(runDir, "text-acceptance.json"), `${JSON.stringify(evaluation, null, 2)}\n`, {mode:0o600});
  console.log(JSON.stringify({run_id:runId, artifact:path.join(runDir, "text-rehearsal.json"), accepted:evaluation.passed, failed_criteria:evaluation.criteria.filter((criterion) => !criterion.passed).map((criterion) => criterion.id), agents:6, challenge_followup:true}, null, 2));
  if (!evaluation.passed) throw new Error(`text rehearsal did not pass: ${evaluation.criteria.filter((criterion) => !criterion.passed).map((criterion) => criterion.id).join(", ")}`);
}

async function transferSpike() {
  const runId = `spike-${randomUUID().slice(0, 8)}`;
  const runDir = path.join(artifacts, "runs", runId);
  await mkdir(runDir, {recursive:true});
  const audit = new AuditLog(path.join(runDir, "events.jsonl"));
  const runtime = await readRuntime(runtimePath);
  if (!runtime.agents.maya || !runtime.agents.marcus) throw new Error("provision-spike must run first");
  if (runtime.floor_protocol !== "outbound_transfer_with_client_yield" || !runtime.yield_tool?.id) throw new Error("runtime uses the obsolete round-trip transfer protocol; run provision-spike before spending conversation credits");
  const marcus = agentsConfig.agents.find((agent) => agent.id === "marcus");
  const project = await projectGuard().snapshot();
  const briefResult = await createInvestigationBrief({client:new ElevenLabsClient(), agentId:runtime.agents.maya.agent_id, timeoutMs:policy.reasoning_timeout_ms, context:{self:"maya",state:"briefing",project_snapshot_sha256:project.sha256}, scenario});
  await audit.write("maya_investigation_brief", {conversation_id:briefResult.conversationId,attempt:briefResult.attempt,brief:briefResult.brief});
  await audit.write("agent_state", {agent_id:"marcus",state:"thinking"});
  const finding = await investigate({client:new ElevenLabsClient(), agent:marcus, remote:runtime.agents.marcus, brief:briefResult.brief, timeoutMs:policy.reasoning_timeout_ms, context:{self:"marcus",state:"thinking",project_snapshot_sha256:project.sha256}, scenario, allowedEvidenceRefs});
  await audit.write("agent_state", {agent_id:"marcus",state:"ready",conversation_id:finding.conversationId,report:finding.report});

  const client = new ElevenLabsClient();
  const signed = await client.getSignedUrl(runtime.agents.maya.agent_id);
  const audio = [];
  const transcript = [];
  const liveContext = {run_id:runId,state:"opening",project_snapshot_sha256:project.sha256,ready_reports:{marcus:finding.report}};
  let yieldRequest = null;
  const conversation = openConversation({signedUrl:signed.signed_url, timeoutMs:policy.reasoning_timeout_ms, onEvent:(event) => {
    if (event.type === "audio") audio.push(Buffer.from(event.audio_event.audio_base_64, "base64"));
    if (event.type === "agent_response") transcript.push(event.agent_response_event.agent_response);
  }, clientTools:{
    read_huddle_context:() => liveContext,
    yield_floor:(request) => {
      if (request?.agent_id !== "marcus") throw new Error("only Marcus may yield this spike floor");
      yieldRequest = request;
      liveContext.state = "yield_requested";
      return {accepted:true,agent_id:"marcus"};
    }
  }});
  try {
    await conversation.opened;
    await conversation.waitFor((event) => event.type === "conversation_initiation_metadata");
    await conversation.waitFor(isResponseComplete);
    await waitForAudioPlayback(conversation, 0);
    liveContext.state = "floor_granted";
    liveContext.current_agent = "marcus";
    conversation.sendContext(`Marcus Reed is ready. Use this private report as evidence, but never read its structure aloud: ${JSON.stringify(finding.report)}`, "spike-marcus-ready");
    let start = conversation.events.length;
    conversation.sendUserMessage("Coordinator command GRANT_FLOOR:marcus. Marcus Reed is ready; grant him the floor now.");
    const outbound = await waitForNew(conversation, start, isTransferResponse);
    await waitForNew(conversation, conversation.events.indexOf(outbound) + 1, isYieldRequest);
    await waitForAudioPlayback(conversation, start);
  } finally {
    conversation.close();
  }
  const conversationId = conversation.conversationId ?? signed.conversation_id;
  await writeFile(path.join(runDir, "audio.pcm"), Buffer.concat(audio), {mode:0o600});
  await writeFile(path.join(runDir, "audio.wav"), pcm16ToWav(Buffer.concat(audio)), {mode:0o600});
  await writeFile(path.join(runDir, "spike.json"), `${JSON.stringify({run_id:runId,conversation_id:conversationId,finding:finding.report,transcript,event_types:conversation.events.map((event) => event.type)}, null, 2)}\n`, {mode:0o600});
  const transferEvents = conversation.events.filter(isTransferResponse).length;
  if (transferEvents !== 1) throw new Error(`transfer spike required exactly 1 outbound transfer, observed ${transferEvents}`);
  if (!yieldRequest) throw new Error("transfer spike received no coordinator-controlled yield");
  console.log(JSON.stringify({run_id:runId,conversation_id:conversationId,artifact:path.join(runDir,"spike.json"),audio_bytes:audio.reduce((sum,part) => sum + part.length,0),agent_responses:transcript.length,transfer_events:transferEvents,yield_requests:1}, null, 2));
}

function waitForNew(conversation, start, predicate, timeout = policy.reasoning_timeout_ms) {
  return conversation.waitFor((event) => conversation.events.indexOf(event) >= start && predicate(event), timeout);
}

function isResponseComplete(event) { return event.type === "agent_response"; }
function isTransferResponse(event) { return event.type === "agent_tool_response" && event.agent_tool_response?.tool_name === "transfer_to_agent"; }
function isYieldRequest(event) { return event.type === "client_tool_call" && event.client_tool_call?.tool_name === "yield_floor"; }
function responseText(event) { return event.agent_response_event?.agent_response ?? ""; }
function compactReport(report) {
  return {
    claim:report.claim,
    uncertainties:(report.uncertainties ?? []).slice(0, 2),
    human_handoff:report.human_handoff,
    confidence:report.confidence,
    spoken_summary:report.spoken_summary
  };
}
async function waitForAudioPlayback(conversation, startIndex, {quietMs = 1000, noAudioGraceMs = 2500, maxMs = 120000} = {}) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < maxMs) {
    const audioEvents = conversation.events.slice(startIndex).filter((event) => event.type === "audio");
    if (!audioEvents.length) {
      if (Date.now() - startedAt >= noAudioGraceMs) return;
      await new Promise((resolve) => setTimeout(resolve, 100));
      continue;
    }
    const firstAudioAt = audioEvents[0]._client_received_at;
    const lastAudioAt = audioEvents.at(-1)._client_received_at;
    const bytes = audioEvents.reduce((sum, event) => sum + Buffer.from(event.audio_event.audio_base_64, "base64").length, 0);
    const playbackEndAt = firstAudioAt + pcmDurationSeconds(bytes) * 1000 + policy.floor_transition_ms;
    if (Date.now() - lastAudioAt >= quietMs && Date.now() >= playbackEndAt) return;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error("audio playback did not complete before the next floor transition");
}

async function waitForConversationDetails(client, conversationId, {maxMs = 30000} = {}) {
  const startedAt = Date.now();
  let details = null;
  do {
    details = await client.getConversation(conversationId);
    if (details?.status === "done") return details;
    await new Promise((resolve) => setTimeout(resolve, 1000));
  } while (Date.now() - startedAt < maxMs);
  return details;
}

async function liveRun({mutateProject = false}) {
  const runtime = await readRuntime(runtimePath);
  if (runtime.floor_protocol !== "outbound_transfer_with_client_yield" || !runtime.yield_tool?.id) throw new Error("runtime uses the obsolete round-trip transfer protocol; run provision before spending conversation credits");
  const runId = `live-${randomUUID().slice(0, 8)}`;
  const runDir = path.join(artifacts, "runs", runId);
  await mkdir(runDir, {recursive:true});
  const audit = new AuditLog(path.join(runDir, "events.jsonl"));
  const guard = projectGuard(audit);
  const before = await guard.snapshot();
  await writeFile(path.join(runDir, "project-before.json"), `${JSON.stringify(before, null, 2)}\n`, {mode:0o600});
  const floor = new FloorCoordinator(agentsConfig.agents.map((agent) => agent.id), {transitionMs:policy.floor_transition_ms});
  const audio = [];
  const transcript = [];
  const allEvents = [];
  const conversationIds = [];
  const client = new ElevenLabsClient();
  const projectItems = (before.snapshot.items.items ?? [])
    .filter((item) => scenario.project.allowed_issue_numbers.includes(Number(item.content?.number)))
    .map((item) => ({issue_number:item.content.number,title:item.title ?? item.content.title,status:item.status}));
  const liveContext = {run_id:runId,state:"opening",project_snapshot_sha256:before.sha256,project_items:projectItems,maya_brief:null,current_report:null,prior_spoken_findings:[]};
  const absentAgents = [];
  const projectAction = {writes_enabled:false,requested:false,result:null};
  let investigations = null;
  let activeSession = null;
  const clientTools = {
    read_huddle_context:() => liveContext,
    yield_floor:async ({agent_id:agentId,status}) => {
      if (liveContext.state !== "floor_granted") throw new Error("no specialist currently owns the floor");
      if (agentId !== liveContext.current_agent) throw new Error(`yield agent ${agentId} does not own the floor`);
      if (!["reported","nothing_to_report"].includes(status)) throw new Error("invalid yield status");
      liveContext.state = "yield_requested";
      await audit.write("floor_yield_requested", {agent_id:agentId,status});
      return {accepted:true,agent_id:agentId,status};
    },
    set_project_status:async ({issue_number:issueNumber,status}) => {
      projectAction.requested = true;
      await audit.write("agent_project_request", {agent_id:"maya",issue_number:issueNumber,status,writes_enabled:projectAction.writes_enabled});
      if (!projectAction.writes_enabled) throw new Error("Project writes are disabled for this rehearsal");
      const result = await guard.setStatus({snapshot:before.snapshot,issueNumber:Number(issueNumber),status});
      projectAction.result = result;
      return {executed:result.changed,issue_number:Number(issueNumber),status,human_approval:false};
    }
  };

  async function startSession() {
    const signed = await client.getSignedUrl(runtime.agents.maya.agent_id);
    const sessionEvents = [];
    const sessionAudio = [];
    const conversation = openConversation({signedUrl:signed.signed_url, timeoutMs:policy.reasoning_timeout_ms, onEvent:(event) => {
      sessionEvents.push(event);
      if (event.type === "audio") sessionAudio.push(Buffer.from(event.audio_event.audio_base_64, "base64"));
    }, clientTools});
    const activityTimer = setInterval(() => {
      try { conversation.sendUserActivity(); } catch {}
    }, 20000);
    await conversation.opened;
    await conversation.waitFor((event) => event.type === "conversation_initiation_metadata");
    activeSession = {conversation,activityTimer,signed,sessionEvents,sessionAudio};
    return activeSession;
  }

  function closeSession(session) {
    clearInterval(session.activityTimer);
    const conversationId = session.conversation.conversationId ?? session.signed.conversation_id;
    if (conversationId) conversationIds.push(conversationId);
    session.conversation.close();
    if (activeSession === session) activeSession = null;
    return conversationId;
  }

  function commitSession(session, {addGap = true} = {}) {
    allEvents.push(...session.sessionEvents);
    audio.push(...session.sessionAudio);
    if (addGap) audio.push(Buffer.alloc(Math.round(16000 * 2 * policy.floor_transition_ms / 1000)));
  }

  let restored = false;
  const stopConversation = () => activeSession?.conversation.close();
  process.once("SIGINT", stopConversation);
  process.once("SIGTERM", stopConversation);
  try {
    let session = await startSession();
    let start = session.conversation.events.length;
    session.conversation.sendUserMessage(`Maya, open this Wednesday huddle naturally and briefly. Name this bounded question: ${scenario.question} Say the specialists are thinking quietly. Do not recite the private method.`);
    const opening = await waitForNew(session.conversation, start, isResponseComplete);
    transcript.push({speaker:"maya",kind:"opening",text:responseText(opening)});
    await waitForAudioPlayback(session.conversation, start, {maxMs:policy.facilitator_turn_timeout_ms});
    closeSession(session);
    commitSession(session);
    liveContext.maya_brief = validateInvestigationBrief(scenario.private_brief, scenario);
    investigations = await runInvestigations({audit,briefOverride:liveContext.maya_brief});
    const turns = scenario.flow.audible_turns.map((turn) => [
      turn.agent_id,
      turn.source === "followup_or_initial" ? investigations.marcus_followup ?? investigations.reports[turn.agent_id] : investigations.reports[turn.agent_id],
      turn.instruction
    ]).filter(([, report]) => report);
    for (const [turnIndex, [id, report, instruction]] of turns.entries()) {
      console.error(`[huddle] Maya grants the floor to ${id}`);
      if (floor.agents.get(id).state === "yielded") floor.challenge(id);
      floor.ready(id, report);
      floor.grant(id);
      liveContext.state = "floor_granted";
      liveContext.current_agent = id;
      liveContext.current_report = {agent_id:id,...compactReport(report)};
      await audit.write("floor", {agent_id:id,state:"floor_granted"});
      let round = null;
      for (let attempt = 1; attempt <= 2 && !round; attempt += 1) {
        let failureReason = "specialist produced no valid coordinator-controlled yield";
        liveContext.state = "floor_granted";
        liveContext.current_agent = id;
        const deadline = Date.now() + policy.specialist_turn_timeout_ms;
        const remainingMs = () => Math.max(500, deadline - Date.now());
        try {
          session = await startSession();
          session.conversation.sendContext(`Private wire from Maya for ${runtime.agents[id].name}. Current turn: ${instruction} Use the private ready finding and prior spoken summaries available through read_huddle_context to add only new information. Never read machine structure aloud.`, `ready-${id}-${turnIndex}-${attempt}`);
          start = session.conversation.events.length;
          session.conversation.sendUserMessage(`Coordinator command GRANT_FLOOR:${id}. ${runtime.agents[id].name} is ready; grant that specialist the floor now.`);
          const outbound = await waitForNew(session.conversation, start, isTransferResponse, remainingMs());
          const yieldRequest = await waitForNew(session.conversation, session.conversation.events.indexOf(outbound) + 1, isYieldRequest, remainingMs());
          if (yieldRequest.client_tool_call?.parameters?.agent_id !== id) throw new Error("yield request named the wrong specialist");
          await waitForAudioPlayback(session.conversation, start, {maxMs:remainingMs()});
          const conversationId = closeSession(session);
          const details = conversationId ? await waitForConversationDetails(client, conversationId) : null;
          round = parseTransferRound(details, {agentName:runtime.agents[id].name,specialistAgentId:runtime.agents[id].agent_id});
          if (!round) failureReason = "yield arrived without an attributable specialist contribution";
          else commitSession(session);
        } catch (error) {
          failureReason = error.message;
          if (activeSession === session) closeSession(session);
        }
        if (!round) {
          const retrying = attempt < 2;
          await audit.write(retrying ? "floor_retry" : "floor_no_response", {agent_id:id,attempt,reason:failureReason});
          console.error(`[huddle] ${id}: ${retrying ? "retrying after an invalid or empty turn" : "no substantive contribution; skipping"}`);
        }
      }
      if (!round) {
        const name = runtime.agents[id].name;
        floor.skip(id, "no substantive transfer response");
        absentAgents.push(id);
        liveContext.state = "skipped";
        liveContext.current_agent = null;
        await audit.write("agent_absence", {agent_id:id,reason:"no substantive transfer response",action:"skipped_and_continued"});
        session = await startSession();
        start = session.conversation.events.length;
        session.conversation.sendUserMessage(`Maya, say exactly: ${name} is not present. I am skipping that role and moving on.`);
        const absence = await waitForNew(session.conversation, start, isResponseComplete);
        transcript.push({speaker:"maya",kind:"absence",agent_id:id,text:responseText(absence)});
        await waitForAudioPlayback(session.conversation, start, {maxMs:30000});
        closeSession(session);
        commitSession(session);
        await new Promise((resolve) => setTimeout(resolve, policy.floor_transition_ms));
        continue;
      }
      transcript.push({speaker:"maya",kind:"handoff",text:round.handoff});
      floor.speaking(id);
      await audit.write("floor", {agent_id:id,state:"speaking"});
      transcript.push({speaker:id,kind:round.noReport ? "no_report" : "contribution",text:round.contribution});
      if (round.noReport) {
        await audit.write("floor_no_report", {agent_id:id,completed:true});
      } else {
        if (!round.formalYield) await audit.write("floor_yield_inferred", {agent_id:id,reason:"substantive contribution returned without the formal yield phrase"});
        liveContext.prior_spoken_findings.push({agent_id:id,summary:round.contribution});
      }
      floor.yield(id);
      liveContext.state = "yielded";
      liveContext.current_agent = null;
      await audit.write("floor", {agent_id:id,state:"yielded"});
      if (!turns.slice(turnIndex + 1).some(([futureId]) => futureId === id)) floor.complete(id);
      await new Promise((resolve) => setTimeout(resolve, policy.floor_transition_ms));
    }
    if (mutateProject) {
      guard.enableMutations();
      projectAction.writes_enabled = true;
      session = await startSession();
      const actionStart = session.conversation.events.length;
      session.conversation.sendUserMessage(`Coordinator command RECORD_DECISION. Maya, use the private huddle context. If the evidence supports investigation by the Human owners, call set_project_status for issue ${scenario.project.action.issue_number} with status ${scenario.project.action.status}. Explain briefly that this is an agent-recorded workflow move, not Human approval.`);
      await waitForNew(session.conversation, actionStart, (event) => event.type === "client_tool_call" && event.client_tool_call.tool_name === "set_project_status");
      const actionResponse = await waitForNew(session.conversation, actionStart, isResponseComplete);
      transcript.push({speaker:"maya",kind:"project_action",text:responseText(actionResponse)});
      await waitForAudioPlayback(session.conversation, actionStart, {maxMs:policy.facilitator_turn_timeout_ms});
      if (!projectAction.result) throw new Error("Maya requested no successful guarded Project move");
      closeSession(session);
      commitSession(session);
      projectAction.writes_enabled = false;
      guard.disableMutations();
      liveContext.state = "closing";
      liveContext.current_agent = "maya";
      liveContext.current_report = null;
      session = await startSession();
      start = session.conversation.events.length;
      session.conversation.sendUserMessage(`Coordinator to Maya: close this huddle in ${scenario.speech.closing.min_words} to ${scenario.speech.closing.max_words} words. Summarize the bounded conclusion once, record that Issue ${scenario.project.action.issue_number} was moved to ${scenario.project.action.status} and will be restored after the test, name the accountable Human owners, and say no Human approval was given. ${absentAgents.length ? `Also name these roles as not present: ${absentAgents.join(", ")}.` : ""} Your final audible words must be exactly: ${scenario.speech.closing.exact_final_phrase}`);
      const closing = await waitForNew(session.conversation, start, isResponseComplete);
      transcript.push({speaker:"maya",kind:"closing",text:responseText(closing)});
      await waitForAudioPlayback(session.conversation, start, {maxMs:policy.facilitator_turn_timeout_ms});
      if (!session.sessionAudio.length) throw new Error("Maya closing produced no audible audio");
      closeSession(session);
      commitSession(session, {addGap:false});
    } else {
      liveContext.state = "closing";
      liveContext.current_agent = "maya";
      liveContext.current_report = null;
      session = await startSession();
      start = session.conversation.events.length;
      session.conversation.sendUserMessage(`Coordinator to Maya: close this huddle in ${scenario.speech.closing.min_words} to ${scenario.speech.closing.max_words} words. Summarize the bounded conclusion once, name the accountable Human owners, and say no Human approval was given. ${absentAgents.length ? `Also name these roles as not present: ${absentAgents.join(", ")}.` : ""} Your final audible words must be exactly: ${scenario.speech.closing.exact_final_phrase}`);
      const closing = await waitForNew(session.conversation, start, isResponseComplete);
      transcript.push({speaker:"maya",kind:"closing",text:responseText(closing)});
      await waitForAudioPlayback(session.conversation, start, {maxMs:policy.facilitator_turn_timeout_ms});
      if (!session.sessionAudio.length) throw new Error("Maya closing produced no audible audio");
      closeSession(session);
      commitSession(session, {addGap:false});
    }
  } finally {
    process.removeListener("SIGINT", stopConversation);
    process.removeListener("SIGTERM", stopConversation);
    if (activeSession) closeSession(activeSession);
    if (guard.ledger.length) await guard.restore();
    const after = await guard.snapshot();
    restored = before.sha256 === after.sha256;
    await writeFile(path.join(runDir, "project-after.json"), `${JSON.stringify(after, null, 2)}\n`, {mode:0o600});
    await audit.write("project_restoration", {restored, before_sha256:before.sha256, after_sha256:after.sha256});
  }
  const pcm = Buffer.concat(audio);
  await writeFile(path.join(runDir, "audio.pcm"), pcm, {mode:0o600});
  await writeFile(path.join(runDir, "audio.wav"), pcm16ToWav(pcm), {mode:0o600});
  await writeFile(path.join(runDir, "transcript.json"), `${JSON.stringify(transcript, null, 2)}\n`, {mode:0o600});
  const details = await Promise.all(conversationIds.map((conversationId) => waitForConversationDetails(client, conversationId)));
  await writeFile(path.join(runDir, "conversation.json"), `${JSON.stringify(details, null, 2)}\n`, {mode:0o600});
  const auditText = await readFile(path.join(runDir, "events.jsonl"), "utf8");
  const durationSeconds = pcmDurationSeconds(pcm.length);
  const creditsUsed = details.reduce((sum, item) => sum + Number(item?.metadata?.cost ?? 0), 0);
  const evaluation = evaluateRun({transcript, investigations, events:allEvents, floorEvents:floor.events, projectAction, projectRestored:restored, auditText, durationSeconds, creditsUsed, creditCeiling:policy.credit_ceiling, mutationRequired:mutateProject, scenario});
  await writeFile(path.join(runDir, "acceptance.json"), `${JSON.stringify(evaluation, null, 2)}\n`, {mode:0o600});
  await writeFile(path.join(runDir, "report.html"), renderRunReport({runId,evaluation,transcript,conversationId:conversationIds.join(", ")}), {mode:0o600});
  console.log(JSON.stringify({run_id:runId, conversation_ids:conversationIds, artifact_dir:runDir, accepted:evaluation.passed, failed_criteria:evaluation.criteria.filter((criterion) => !criterion.passed).map((criterion) => criterion.id), project_mutation:mutateProject, agent_project_request:projectAction.requested, project_restored:restored, audio_bytes:pcm.length, duration_seconds:evaluation.observations.duration_seconds, credits_used:creditsUsed, turns:transcript.length}, null, 2));
  if (!restored) throw new Error(`Project ${scenario.project.number} did not restore exactly`);
  if (!evaluation.passed) throw new Error(`run did not pass acceptance: ${evaluation.criteria.filter((criterion) => !criterion.passed).map((criterion) => criterion.id).join(", ")}`);
}

async function projectMutationProof() {
  const runId = `reset-${randomUUID().slice(0, 8)}`;
  const runDir = path.join(artifacts, "runs", runId);
  const audit = new AuditLog(path.join(runDir, "events.jsonl"));
  const guard = projectGuard(audit);
  const before = await guard.snapshot();
  try {
    guard.enableMutations();
    await guard.setStatus({snapshot:before.snapshot, issueNumber:scenario.project.action.issue_number, status:scenario.project.action.status});
    await guard.addRunDraft({runId, title:"Reset proof only", body:"Temporary draft item created solely to prove exact restoration."});
  } finally {
    if (guard.ledger.length) await guard.restore();
  }
  const after = await guard.snapshot();
  const restored = before.sha256 === after.sha256;
  await mkdir(runDir, {recursive:true});
  await writeFile(path.join(runDir, "reset-proof.json"), `${JSON.stringify({run_id:runId,before_sha256:before.sha256,after_sha256:after.sha256,restored}, null, 2)}\n`, {mode:0o600});
  console.log(JSON.stringify({run_id:runId,restored,before_sha256:before.sha256,after_sha256:after.sha256}, null, 2));
  if (!restored) throw new Error(`Project ${scenario.project.number} restoration proof failed`);
}

const command = process.argv[2];
const commands = {
  preflight,
  "build-evidence":buildEvidence,
  "provision-spike":() => provisionAgents(["maya","marcus"]),
  provision:() => provisionAgents(),
  "project-snapshot":snapshotProject,
  "project-reset-proof":projectMutationProof,
  "transfer-spike":transferSpike,
  "text-rehearsal":textRehearsal,
  "live-no-write":() => liveRun({mutateProject:false}),
  "live-accepted":() => liveRun({mutateProject:true})
};
if (!commands[command]) {
  console.error(`Usage: node cli.mjs ${Object.keys(commands).join("|")}`);
  process.exitCode = 2;
} else {
  try { console.error(`[huddle] scenario ${scenario.id} (${scenarioPath})`); await commands[command](); }
  catch (error) { console.error(error.stack ?? error.message); process.exitCode = 1; }
}
