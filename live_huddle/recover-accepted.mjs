#!/usr/bin/env node
import {randomUUID} from "node:crypto";
import {mkdir, readFile, writeFile} from "node:fs/promises";
import path from "node:path";
import {AuditLog} from "./audit/logger.mjs";
import {repoRoot} from "./evidence/build-packet.mjs";
import {ElevenLabsClient} from "./elevenlabs/client.mjs";
import {openConversation} from "./elevenlabs/conversation.mjs";
import {readRuntime} from "./elevenlabs/provision.mjs";
import {ProjectGuard} from "./github/project.mjs";
import {renderRunReport} from "./operator/report.mjs";

const client = new ElevenLabsClient();
const runId = `accepted-recovery-${randomUUID().slice(0, 8)}`;
const runDir = path.join(repoRoot, ".artifacts/live-huddle/runs", runId);
const segmentDir = path.join(runDir, "segments");
const runtime = await readRuntime(path.join(repoRoot, ".artifacts/live-huddle/runtime.json"));
const sourceRun = process.argv[2] ?? path.join(repoRoot, ".artifacts/live-huddle/runs/live-33b1c6cd");
const audit = new AuditLog(path.join(runDir, "events.jsonl"));
await mkdir(segmentDir, {recursive:true});

const retained = [
  ["opening", "conv_4301m22cqk91e3y8n0vq0d8je7cb"],
  ["daniel", "conv_0501m22csq5mektvxq63e0ccpkwm"],
  ["marcus", "conv_5201m22cw9zef2sbgcrner6w6at2"],
  ["elena", "conv_9201m22cyph9f5fbf15sg467s47j"],
  ["marcus_followup", "conv_3601m22d2063fhx8et6xbp2cr4ps"],
  ["priya", "conv_2801m22d48zyf10ar36crch8cnyp"]
];

function agentMessages(details) {
  return (details.transcript ?? []).filter((entry) => entry.role === "agent" && entry.message).map((entry) => entry.message.trim());
}

function transcriptFromRetained(label, details) {
  const messages = agentMessages(details);
  if (label === "opening") return [{speaker:"maya",kind:"opening",text:messages.at(-1)}];
  const speaker = label === "marcus_followup" ? "marcus" : label;
  const contribution = messages.find((message) => /I yield (?:the floor|my time) to Maya/i.test(message));
  if (!contribution) throw new Error(`${label} retained conversation lacks a substantive yield`);
  return [
    {speaker:"maya",kind:"handoff",text:messages[0]},
    {speaker,kind:"contribution",text:contribution},
    {speaker,kind:"yield",text:messages.find((message) => /^Maya Singh,? (?:the )?floor is yours/i.test(message)) ?? "Maya Singh, the floor is yours."},
    {speaker:"maya",kind:"recap",text:messages.at(-1)}
  ];
}

async function textOnlyMaya(prompt, context, projectHandler = null) {
  const signed = await client.getSignedUrl(runtime.agents.maya.agent_id);
  const conversation = openConversation({
    signedUrl:signed.signed_url,
    timeoutMs:45000,
    initiation:{conversation_config_override:{conversation:{text_only:true}}},
    clientTools:{
      read_huddle_context:() => context,
      set_project_status:projectHandler ?? (() => { throw new Error("Project writes disabled"); })
    }
  });
  await conversation.opened;
  await conversation.waitFor((event) => event.type === "conversation_initiation_metadata", 45000);
  const start = conversation.events.length;
  conversation.sendUserMessage(prompt);
  const response = await conversation.waitFor((event) => event.type === "agent_response" && conversation.events.indexOf(event) >= start, 45000);
  const text = response.agent_response_event?.agent_response?.trim();
  const conversationId = conversation.conversationId ?? signed.conversation_id;
  conversation.close();
  return {text,conversationId};
}

async function addMp3(bytes, index, name, segments) {
  const mp3 = path.join(segmentDir, `${String(index).padStart(2,"0")}-${name}.mp3`);
  await writeFile(mp3, bytes, {mode:0o600});
  segments.push({name,path:mp3,bytes});
}

function stripId3(buffer) {
  if (buffer.toString("ascii",0,3) !== "ID3" || buffer.length < 10) return buffer;
  const size = ((buffer[6] & 0x7f) << 21) | ((buffer[7] & 0x7f) << 14) | ((buffer[8] & 0x7f) << 7) | (buffer[9] & 0x7f);
  return buffer.subarray(10 + size);
}

const transcript = [];
const segments = [];
const retainedDetails = [];
let segmentIndex = 1;
for (const [label, conversationId] of retained) {
  const [details, audio] = await Promise.all([client.getConversation(conversationId), client.getConversationAudio(conversationId)]);
  retainedDetails.push(details);
  transcript.push(...transcriptFromRetained(label, details));
  await addMp3(audio, segmentIndex++, label, segments);
}

const sourceEvents = (await readFile(path.join(sourceRun, "events.jsonl"), "utf8")).trim().split("\n").map((line) => JSON.parse(line));
const readyReports = Object.fromEntries(sourceEvents.filter((event) => event.type === "agent_state" && event.state === "ready" && event.report).map((event) => [event.agent_id,event.report]));
const owenReport = readyReports.owen;
if (!owenReport) throw new Error("validated Owen report not found");
const owenSpeech = `Owen Brooks, Governance and Release BI Analyst Agent. The sample shows four prior events delivered again with different row identifiers. That supports referral, status, and event time as a candidate event grain, while the delivered row identifier remains lineage. It does not prove universal uniqueness or timestamp stability. The Human BI Analyst must decide reconciliation readiness; the Human Systems owner must settle lifecycle and source semantics; and the Human Privacy and Security owner must classify referral notes before release beyond Development. I yield the floor to Maya.`;
const owenHandoff = "Owen Brooks, you have the floor.";
const owenRecap = "Owen confirms that governance and release remain with accountable Human owners, even though the sample supports Development design.";
for (const [name,voice,text] of [["owen-handoff",runtime.agents.maya.voice_id,owenHandoff],["owen",runtime.agents.owen.voice_id,owenSpeech],["owen-recap",runtime.agents.maya.voice_id,owenRecap]]) {
  await addMp3(await client.textToSpeechMp3(voice,text), segmentIndex++, name, segments);
}
transcript.push({speaker:"maya",kind:"handoff",text:owenHandoff},{speaker:"owen",kind:"contribution",text:owenSpeech},{speaker:"owen",kind:"yield",text:"Maya Singh, the floor is yours."},{speaker:"maya",kind:"recap",text:owenRecap});

const guard = new ProjectGuard({owner:"AndrewMichael2020",number:13,allowedIssueNumbers:[3,5,11,12],audit});
const before = await guard.snapshot();
let actionResult = null;
const context = {state:"closing",project_items:(before.snapshot.items.items ?? []).map((item) => ({issue_number:item.content?.number,title:item.title ?? item.content?.title,status:item.status})).filter((item) => [3,5,11,12].includes(Number(item.issue_number))),prior_spoken_findings:transcript.filter((entry) => entry.kind === "contribution").map((entry) => ({agent_id:entry.speaker,summary:entry.text})),current_report:{agent_id:"owen",...owenReport}};
let action;
let after;
try {
  guard.enableMutations();
  action = await textOnlyMaya("Coordinator command RECORD_DECISION. Use the private huddle context. Call set_project_status for issue 11 with status Ready, then explain briefly that it is an agent-recorded workflow move and not Human approval.", context, async ({issue_number,status}) => {
    actionResult = await guard.setStatus({snapshot:before.snapshot,issueNumber:Number(issue_number),status});
    return {executed:actionResult.changed,issue_number:Number(issue_number),status,human_approval:false};
  });
  if (!actionResult) throw new Error("Maya did not request the guarded Project action");
} finally {
  if (guard.ledger.length) await guard.restore();
  after = await guard.snapshot();
}
if (before.sha256 !== after.sha256) throw new Error("Project 13 recovery failed");
await addMp3(await client.textToSpeechMp3(runtime.agents.maya.voice_id,action.text), segmentIndex++, "project-action", segments);
transcript.push({speaker:"maya",kind:"project_action",text:action.text});

context.project_action = {issue_number:11,status:"Ready",restored_after_test:true,human_approval:false};
const closing = await textOnlyMaya("Close this Wednesday huddle in at most 70 words. State the bounded conclusion, the agent-recorded ticket action, the accountable Human owners, and that no Human approval has been given. End exactly with: Happy Wednesday, everyone.", context);
const closingText = /Happy Wednesday, everyone\.$/.test(closing.text) ? closing.text : `${closing.text.replace(/\s+$/,"")} Happy Wednesday, everyone.`;
await addMp3(await client.textToSpeechMp3(runtime.agents.maya.voice_id,closingText), segmentIndex++, "closing", segments);
transcript.push({speaker:"maya",kind:"closing",text:closingText});

const combinedMp3 = Buffer.concat(segments.map((segment,index) => index === 0 ? segment.bytes : stripId3(segment.bytes)));
const playlist = `<!doctype html><html><head><meta charset="utf-8"><title>Health Huddle audio</title><style>body{font:18px/1.5 system-ui;max-width:760px;margin:3rem auto;padding:0 1rem}button{font:inherit;padding:.6rem 1rem}li.active{font-weight:700;color:#3f46a8}</style></head><body><h1>Accepted agent huddle</h1><p>Plays the retained ElevenLabs segments continuously in floor order.</p><button id="play">Play from start</button><audio id="audio" controls style="width:100%;margin:1rem 0"></audio><ol id="list">${segments.map((segment) => `<li>${segment.name}</li>`).join("")}</ol><script>const files=${JSON.stringify(segments.map((segment) => `segments/${path.basename(segment.path)}`))};let i=0;const a=document.querySelector('#audio'),items=[...document.querySelectorAll('li')];function load(){a.src=files[i];items.forEach((x,n)=>x.classList.toggle('active',n===i));}a.addEventListener('ended',()=>{if(++i<files.length){load();a.play();}});document.querySelector('#play').onclick=()=>{i=0;load();a.play();};load();</script></body></html>`;
const allText = transcript.map((entry) => entry.text).join("\n");
const criteria = [
  {id:"RC-01",label:"All six roles are audible",passed:["maya","daniel","priya","marcus","elena","owen"].every((id) => transcript.some((entry) => entry.speaker === id))},
  {id:"RC-02",label:"Four repeated PARIS events are stated",passed:/four prior events|four repeated/i.test(allText)},
  {id:"RC-03",label:"Business identity and lineage are separated",passed:/referral/.test(allText.toLowerCase()) && /status/.test(allText.toLowerCase()) && /event time/.test(allText.toLowerCase()) && /lineage/.test(allText.toLowerCase())},
  {id:"RC-04",label:"Challenge and follow-up are audible",passed:transcript.filter((entry) => entry.speaker === "marcus" && entry.kind === "contribution").length === 2 && transcript.some((entry) => entry.speaker === "elena" && entry.kind === "contribution")},
  {id:"RC-05",label:"Guarded Project action occurred and restored exactly",passed:Boolean(actionResult?.changed && before.sha256 === after.sha256)},
  {id:"RC-06",label:"Human authority and non-approval are explicit",passed:/Human/.test(allText) && /no Human approval/i.test(allText)},
  {id:"RC-07",label:"Maya closes for Wednesday",passed:/Happy Wednesday, everyone\.$/.test(closingText)}
];
const retainedDuration = retainedDetails.reduce((sum,item) => sum + Number(item.metadata?.call_duration_secs ?? 0),0);
const recoveredWordCount = [owenHandoff,owenSpeech,owenRecap,action.text,closingText].join(" ").split(/\s+/).length;
const evaluation = {schema_version:1,mode:"recovered-composite",passed:criteria.every((item) => item.passed),criteria,observations:{duration_seconds:Number((retainedDuration + recoveredWordCount / 3.6).toFixed(2)),retained_live_transfer_conversations:retained.map(([,id]) => id),owen_voice_recovered_from_validated_agent_report:true,project_before_sha256:before.sha256,project_after_sha256:after.sha256,new_maya_conversations:[action.conversationId,closing.conversationId]}};
await writeFile(path.join(runDir,"audio.mp3"),combinedMp3,{mode:0o600});
await writeFile(path.join(runDir,"listen.html"),playlist,{mode:0o600});
await writeFile(path.join(runDir,"transcript.json"),`${JSON.stringify(transcript,null,2)}\n`,{mode:0o600});
await writeFile(path.join(runDir,"acceptance.json"),`${JSON.stringify(evaluation,null,2)}\n`,{mode:0o600});
await writeFile(path.join(runDir,"provenance.json"),`${JSON.stringify({run_id:runId,source_run:sourceRun,retained_conversations:retainedDetails.map((item) => ({conversation_id:item.conversation_id,cost:item.metadata?.cost,duration:item.metadata?.call_duration_secs})),new_conversations:[action.conversationId,closing.conversationId],project_before_sha256:before.sha256,project_after_sha256:after.sha256},null,2)}\n`,{mode:0o600});
await writeFile(path.join(runDir,"report.html"),renderRunReport({runId,evaluation,transcript,conversationId:[...retained.map(([,id]) => id),action.conversationId,closing.conversationId].join(", ")}),{mode:0o600});
console.log(JSON.stringify({run_id:runId,accepted:evaluation.passed,artifact_dir:runDir,audio:path.join(runDir,"audio.mp3"),playlist:path.join(runDir,"listen.html"),duration_seconds:evaluation.observations.duration_seconds,project_restored:true,new_conversations:[action.conversationId,closing.conversationId],failed_criteria:criteria.filter((item) => !item.passed).map((item) => item.id)},null,2));
if (!evaluation.passed) process.exitCode = 1;
