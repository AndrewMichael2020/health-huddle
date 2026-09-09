const NO_REPORT = /^I have nothing to report on this matter\.?(?:\s+I yield my time\.)?$/i;

function callsTool(entry, name) {
  return (entry?.tool_calls ?? []).some((call) => call.tool_name === name);
}

export function parseTransferRound(details, {agentName, specialistAgentId = null}) {
  const entries = details?.transcript ?? [];
  const handoffIndex = entries.findIndex((entry) => typeof entry.message === "string" && entry.message.includes(agentName) && /you have the floor/i.test(entry.message));
  if (handoffIndex < 0) return null;
  const yieldOffset = entries.slice(handoffIndex + 1).findIndex((entry) => callsTool(entry, "yield_floor"));
  if (yieldOffset < 0) return null;
  const yieldIndex = handoffIndex + 1 + yieldOffset;
  const turnEntries = entries.slice(handoffIndex + 1, yieldIndex);
  const attributable = specialistAgentId && turnEntries.some((entry) => entry.agent_metadata?.agent_id)
    ? turnEntries.filter((entry) => entry.agent_metadata?.agent_id === specialistAgentId)
    : turnEntries;
  const messages = attributable
    .filter((entry) => entry.role === "agent" && typeof entry.message === "string" && entry.message.trim())
    .map((entry) => entry.message.trim());
  const wordCount = (message) => message.split(/\s+/).length;
  const inRange = (message) => wordCount(message) >= 25 && wordCount(message) <= 70;
  const noReport = messages.find((message) => NO_REPORT.test(message));
  const yieldedContribution = messages.find((message) => /I yield (?:the floor to Maya|my time)\.?$/i.test(message) && inRange(message));
  const contribution = noReport ?? yieldedContribution ?? messages.find((message) => inRange(message) && !/you have the floor|floor is yours|I am (?:checking|parking|waiting)/i.test(message));
  if (!contribution) return null;
  const yieldCall = entries[yieldIndex].tool_calls.find((call) => call.tool_name === "yield_floor");
  let requestedStatus = null;
  try {
    requestedStatus = JSON.parse(yieldCall.params_as_json ?? "{}").status;
  } catch {
    return null;
  }
  if (Boolean(noReport) !== (requestedStatus === "nothing_to_report")) return null;
  return {
    handoff:entries[handoffIndex].message.trim(),
    contribution:noReport ? "I have nothing to report on this matter." : contribution,
    formalYield:messages.some((message) => /I yield (?:the floor to Maya|my time)\.?$/i.test(message)),
    noReport:Boolean(noReport)
  };
}
