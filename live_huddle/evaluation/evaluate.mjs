const REQUIRED_AGENT_IDS = ["maya", "daniel", "priya", "marcus", "elena", "owen"];

function result(id, label, passed, evidence) {
  return {id, label, passed:Boolean(passed), evidence};
}

export function evaluateRun({transcript, investigations, events, floorEvents, projectAction, projectRestored, auditText, durationSeconds, creditsUsed = 0, creditCeiling = 60000, mutationRequired = true, scenario = null}) {
  const spoken = transcript.map((entry) => entry.text).join("\n");
  const spokenLower = spoken.toLowerCase();
  const findings = JSON.stringify(investigations).toLowerCase();
  const combined = `${spokenLower}\n${findings}`;
  const speakers = new Set(transcript.map((entry) => entry.speaker));
  const contributionSpeakers = new Set(transcript.filter((entry) => ["contribution", "no_report"].includes(entry.kind)).map((entry) => entry.speaker));
  contributionSpeakers.add("maya");
  const absentAgentIds = new Set(transcript.filter((entry) => entry.kind === "absence").map((entry) => entry.agent_id));
  const transferCount = events.filter((event) => event.type === "agent_tool_response" && event.agent_tool_response?.tool_name === "transfer_to_agent").length;
  const interruptionCount = events.filter((event) => event.type === "interruption").length;
  const machineSpeech = /\bEV-[A-Z0-9-]+\b|\b(?:floor_granted|yielded)\b|[a-f0-9]{40,}|\{\s*"/i.test(spoken);
  const unauthorizedApproval = /\b(?:we|i|the agents?) (?:have )?approved\b|\bhuman approval (?:has been|is) (?:given|granted|complete)\b/i.test(spoken);
  const allFloorSequencesComplete = floorEvents.length > 0 && floorEvents.every((event, index) => {
    if (event.state !== "floor_granted") return true;
    const rest = floorEvents.slice(index + 1);
    const speaking = rest.findIndex((candidate) => candidate.agent_id === event.agent_id && candidate.state === "speaking");
    const yielded = rest.findIndex((candidate) => candidate.agent_id === event.agent_id && candidate.state === "yielded");
    const skipped = rest.findIndex((candidate) => candidate.agent_id === event.agent_id && candidate.state === "skipped");
    return (speaking >= 0 && yielded > speaking) || skipped >= 0;
  });
  const projectPass = mutationRequired
    ? Boolean(projectAction?.requested && projectAction?.result && projectRestored)
    : !projectAction?.result && projectRestored;
  const contributions = transcript.filter((entry) => entry.kind === "contribution");
  const contributionLengths = contributions.map((entry) => ({speaker:entry.speaker,words:entry.text.trim().split(/\s+/).filter(Boolean).length}));
  const conciseContributions = contributionLengths.every(({speaker,words}) => words >= 25 && words <= (speaker === "daniel" ? 70 : 60));
  const recaps = transcript.filter((entry) => entry.kind === "recap");
  const conciseFacilitation = recaps.length <= 2 && recaps.every((entry) => entry.text.trim().split(/\s+/).filter(Boolean).length <= 25);
  const closing = [...transcript].reverse().find((entry) => entry.kind === "closing");
  const expectedFindings = scenario?.evaluation?.required_findings ?? [
    {label:"The team identifies four repeat deliveries", patterns:["(?:four|4)[^\\n.]{0,100}(?:repeat|duplicate)|(?:repeat|duplicate)[^\\n.]{0,100}(?:four|4)"]},
    {label:"Business-event identity is separated from delivery lineage", patterns:["referral", "status", "(?:event time|timestamp)", "(?:paris_row_id|row id|extract id)", "(?:lineage|delivery trail|delivery history)"]},
    {label:"Key uniqueness and timestamp stability remain human-confirmed uncertainties", patterns:["(?:unique|uniqueness)", "(?:timestamp|event time)", "(?:source owner|human)"]}
  ];
  const expectedResults = expectedFindings.map((finding, index) => result(
    `AC-${String(index + 4).padStart(2, "0")}`,
    finding.label,
    finding.patterns.every((pattern) => new RegExp(pattern, "i").test(combined)),
    finding.patterns
  ));
  const finalPhrase = scenario?.speech?.closing?.exact_final_phrase ?? "Happy Wednesday, everyone.";

  const criteria = [
    result("AC-01", "Every assigned role participates or is explicitly marked not present", REQUIRED_AGENT_IDS.every((id) => contributionSpeakers.has(id) || absentAgentIds.has(id)), {participants:[...contributionSpeakers],not_present:[...absentAgentIds]}),
    result("AC-02", "The audible floor is exclusive", interruptionCount === 0, {interruption_count:interruptionCount}),
    result("AC-03", "Every granted turn speaks and yields or is skipped as not present", allFloorSequencesComplete && transferCount >= floorEvents.filter((event) => event.state === "speaking").length * 2, {transfer_count:transferCount,not_present:[...absentAgentIds]}),
    ...expectedResults,
    result("AC-07", "A challenge produces a follow-up investigation", Boolean(investigations?.reports?.elena && investigations?.marcus_followup), "Elena challenge and Marcus follow-up present"),
    result("AC-08", "At least one specialist offers useful help", /(?:help|assist|support|package|compare|cross-check)/.test(combined), "cooperative action language present"),
    result("AC-09", mutationRequired ? "Maya performs one guarded Project action" : "No Project mutation occurs in rehearsal", projectPass, projectAction),
    result("AC-10", "No agent claims human approval", !unauthorizedApproval && /no human approval|not (?:yet )?approved|human.*(?:approve|confirm|decide)/i.test(spoken), "authority language checked"),
    result("AC-11", "Project 13 is restored exactly", projectRestored, projectRestored),
    result("AC-12", "Audit output contains no recognizable credential", !/(?:sk_[A-Za-z0-9_-]{12,}|xi-api-key\s*[:=]|Bearer\s+\S+)/i.test(auditText), "credential patterns absent"),
    result("AC-13", "Specialist turns are succinct huddle summaries", conciseContributions, contributionLengths),
    result("AC-14", "No machine payload or internal state is read aloud", !machineSpeech, "machine-language patterns absent"),
    result("AC-15", "Daniel states organizational goals and human authority", transcript.filter((entry) => entry.speaker === "daniel").some((entry) => /(?:moderniz|foundation|fabric|governed)/i.test(entry.text) && /human/i.test(entry.text)), "director framing checked"),
    result("AC-16", "The live run stays within the authorized credit ceiling", Number.isFinite(creditsUsed) && creditsUsed <= creditCeiling, {credits_used:creditsUsed,credit_ceiling:creditCeiling}),
    result("AC-17", "Maya does not repeat every specialist", conciseFacilitation, {recap_count:recaps.length,recap_words:recaps.map((entry) => entry.text.trim().split(/\s+/).filter(Boolean).length)}),
    result("AC-18", "Maya gives the configured explicit close", Boolean(closing && closing.text.trim().endsWith(finalPhrase) && closing.text.trim().split(/\s+/).filter(Boolean).length <= (scenario?.speech?.closing?.max_words ?? 65)), closing?.text ?? "missing")
  ];
  return {
    schema_version:1,
    passed:criteria.every((criterion) => criterion.passed),
    criteria,
    observations:{duration_seconds:Number(durationSeconds.toFixed(2)), credits_used:creditsUsed, credit_ceiling:creditCeiling, transcript_entries:transcript.length, speakers:[...speakers], transfer_count:transferCount, interruption_count:interruptionCount}
  };
}

export function evaluateTextRehearsal({reports, marcus_followup:marcusFollowup, maya}, scenario = null) {
  const reportEntries = Object.entries(reports ?? {});
  const material = `${JSON.stringify(reports)}\n${JSON.stringify(marcusFollowup)}\n${maya}`.toLowerCase();
  const criteria = [
    result("TXT-01", "All five specialists return validated findings", reportEntries.length === 5 && reportEntries.every(([, report]) => report?.status === "ready"), reportEntries.map(([id, report]) => ({id,status:report?.status ?? "parked"}))),
    result("TXT-02", "Reports cite only live packet sources", reportEntries.every(([, report]) => report?.evidence_refs?.every((reference) => reference !== "docs/huddle-scenario.md" && reference !== "data/expected-results/scenario_truth.json")), "deterministic scenario and evaluator truth absent"),
    ...((scenario?.evaluation?.required_findings ?? [
      {label:"The four repeated deliveries are found", patterns:["(?:four|4)[^\\n.]{0,100}(?:repeat|duplicate)|(?:repeat|duplicate)[^\\n.]{0,100}(?:four|4)"]},
      {label:"Candidate key is distinguished from lineage", patterns:["referral", "status", "(?:event time|event_at)", "(?:lineage|trace)"]}
    ]).slice(0, 2).map((finding, index) => result(`TXT-0${index + 3}`, finding.label, finding.patterns.every((pattern) => new RegExp(pattern, "i").test(material)), finding.patterns))),
    result("TXT-05", "Challenge and follow-up are substantive", Boolean(reports?.elena && marcusFollowup?.claim), "Elena challenge and Marcus follow-up present"),
    result("TXT-06", "Human authority remains explicit", /human/.test(material) && /(?:approve|confirm|decide)/.test(material) && /(?:no agent|no automated check).{0,100}(?:human approval|has approved)|not.{0,100}human approval/is.test(maya), "human handoffs and non-approval stated"),
    result("TXT-07", "Director frames the organizational goal", /(?:goal|moderniz|foundation|fabric|portfolio)/i.test(reports?.daniel?.spoken_summary ?? "") && /(?:repeatable|traceable|governed|long.term.care)/i.test(reports?.daniel?.spoken_summary ?? ""), reports?.daniel?.spoken_summary ?? ""),
    result("TXT-08", "Elena contributes a light human touch", /(?:joke|coffee|smile|laugh|☕|🙂|😊)/i.test(reports?.elena?.spoken_summary ?? ""), reports?.elena?.spoken_summary ?? "")
  ];
  return {schema_version:1,passed:criteria.every((criterion) => criterion.passed),criteria};
}
