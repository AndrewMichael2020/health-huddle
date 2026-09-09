import {openConversation} from "./conversation.mjs";
import {extractJsonObject, validateReport} from "../coordinator/reports.mjs";
import {investigationPrompt} from "./prompts.mjs";
import {ALLOWED_EVIDENCE_REFS} from "../evidence/build-packet.mjs";

function responseText(event) { return event.agent_response_event?.agent_response ?? ""; }

export async function oneTextTurn({client, agentId, prompt, timeoutMs = 90000, onEvent = () => {}, context = {}, waitForInitial = false}) {
  const signed = await client.getSignedUrl(agentId);
  const conversation = openConversation({
    signedUrl:signed.signed_url,
    timeoutMs,
    initiation:{conversation_config_override:{conversation:{text_only:true}}},
    onEvent,
    clientTools:{read_huddle_context:() => context}
  });
  await conversation.opened;
  await conversation.waitFor((event) => event.type === "conversation_initiation_metadata", timeoutMs);
  try {
    if (waitForInitial) await conversation.waitFor((event) => event.type === "agent_response", timeoutMs);
    const start = conversation.events.length;
    conversation.sendUserMessage(prompt);
    await conversation.waitFor((event) => event.type === "agent_response" && conversation.events.indexOf(event) >= start, timeoutMs);
    const responses = conversation.events.slice(start).filter((event) => event.type === "agent_response").map(responseText);
    const text = responses.join("\n");
    const conversationId = conversation.conversationId ?? signed.conversation_id ?? null;
    return {text, conversationId, events:conversation.events};
  } finally {
    conversation.close();
  }
}

export function validateInvestigationBrief(text) {
  const brief = text.trim();
  const words = brief.split(/\s+/).length;
  const errors = [];
  if (words < 35 || words > 160) errors.push("brief must be 35 to 160 words");
  if (!/(?:two|both).{0,40}(?:batch|extract)|batch.{0,40}(?:two|both)/i.test(brief)) errors.push("brief must compare both batches");
  if (!/referral/i.test(brief) || !/status/i.test(brief) || !/(?:event time|event_at)/i.test(brief)) errors.push("brief must name the comparison fields");
  if (!/(?:group|reconcil|implementation|code)/i.test(brief)) errors.push("brief must inspect implementation logic");
  if (/\b(?:four|4)\b|\bthere (?:are|were) \w+ repeat|\bI (?:find|found|conclude|recommend)\b/i.test(brief)) errors.push("brief must not reveal a count or conclusion");
  if (errors.length) throw new Error(errors.join("; "));
  return brief;
}

export async function createInvestigationBrief({client, agentId, timeoutMs = 90000, context = {}}) {
  let prompt = "As Maya, assign a concise, result-free investigation method for the PARIS duplicate-event and lineage huddle. Tell specialists to compare both batch extracts using the contract's referral, normalized status, and event-time fields; inspect grouping and reconciliation logic; quantify what they independently find; separate sample evidence from Human source confirmation; and report uncertainty and help needed. Do not state any repeat count, finding, candidate-key conclusion, or recommendation. Return only the 60-to-120-word brief.";
  let lastError;
  for (let attempt = 1; attempt <= 2; attempt += 1) {
    const result = await oneTextTurn({client, agentId, prompt, timeoutMs, context, waitForInitial:true});
    try { return {...result, brief:validateInvestigationBrief(result.text), attempt}; }
    catch (error) {
      lastError = error;
      prompt = `${prompt}\n\nThe prior brief failed validation: ${error.message}. Return a corrected result-free brief only.`;
    }
  }
  throw new Error(`Maya failed to produce a result-free investigation brief after one repair: ${lastError?.message}`);
}

export async function investigate({client, agent, remote, brief, challenge = null, timeoutMs = 90000, onEvent = () => {}, context = {}}) {
  let lastError;
  let prompt = investigationPrompt(agent, {brief, challenge});
  for (let attempt = 1; attempt <= 2; attempt += 1) {
    const result = await oneTextTurn({client, agentId:remote.agent_id, prompt, timeoutMs, onEvent, context});
    try {
      const report = validateReport(extractJsonObject(result.text), {allowedEvidenceRefs:ALLOWED_EVIDENCE_REFS});
      return {...result, report, attempt};
    } catch (error) {
      lastError = error;
      prompt = `${prompt}\n\nYour previous response failed validation: ${error.message}. Use only these exact evidence source headings: ${[...ALLOWED_EVIDENCE_REFS].join(", ")}. Name Human BI Analyst or Human Analytics Director rather than saying the agent team or BI Analytics approves. Repair the structure and return only the corrected JSON object.`;
    }
  }
  throw new Error(`${agent.name} failed report validation after one repair: ${lastError?.message}`);
}
