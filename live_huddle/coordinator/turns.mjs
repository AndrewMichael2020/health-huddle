const NO_REPORT = /^I have nothing to report on this matter\.?$/i;

export function parseTransferRound(details, agentName) {
  const messages = (details?.transcript ?? [])
    .filter((entry) => entry.role === "agent" && typeof entry.message === "string" && entry.message.trim())
    .map((entry) => entry.message.trim());
  const wordCount = (message) => message.split(/\s+/).length;
  const inRange = (message) => wordCount(message) >= 25 && wordCount(message) <= 70;
  const noReport = messages.find((message) => NO_REPORT.test(message));
  const yieldedContribution = messages.find((message) => /I yield (?:the floor to Maya|my time)\.?$/i.test(message) && inRange(message));
  const contribution = noReport ?? yieldedContribution ?? messages.find((message) => inRange(message) && !/you have the floor|floor is yours|I am (?:checking|parking|waiting)/i.test(message));
  if (!contribution) return null;
  const handoff = messages.find((message) => message.includes(agentName) && /you have the floor/i.test(message)) ?? `${agentName}, you have the floor.`;
  const returnCue = messages.find((message) => /^Maya Singh,? (?:the )?floor is yours/i.test(message)) ?? "Maya Singh, the floor is yours.";
  const recap = [...messages].reverse().find((message) => message !== contribution && message !== handoff && message !== returnCue && !/you have the floor/i.test(message));
  return {handoff, contribution, returnCue, recap, formalYield:Boolean(yieldedContribution), noReport:Boolean(noReport)};
}
