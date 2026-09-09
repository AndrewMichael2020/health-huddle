const FORBIDDEN_SPOKEN_PATTERNS = [
  /\bEV-[A-Z0-9_-]+\b/i,
  /\b(?:thinking|floor_granted|yield_floor)\b/i,
  /\{\s*"(?:status|claim|evidence_refs)"/i,
  /\bBI Analytics (?:must|can|will) (?:approve|confirm|decide|authorize|veto)\b/i
];

export function validateReport(value, {minEvidence = 1, allowedEvidenceRefs = null} = {}) {
  const errors = [];
  if (!value || typeof value !== "object" || Array.isArray(value)) errors.push("report must be an object");
  if (value?.status !== "ready") errors.push("status must be ready");
  if (typeof value?.claim !== "string" || value.claim.trim().length < 12) errors.push("claim is too short");
  if (!Array.isArray(value?.evidence_refs) || value.evidence_refs.length < minEvidence || value.evidence_refs.some((x) => typeof x !== "string" || !x.trim())) errors.push("evidence_refs are required");
  if (allowedEvidenceRefs && value?.evidence_refs?.some((reference) => !allowedEvidenceRefs.has(reference))) errors.push("evidence_refs contain an unknown source heading");
  if (!Array.isArray(value?.uncertainties)) errors.push("uncertainties must be an array");
  if (typeof value?.recommended_action !== "string" || !value.recommended_action.trim()) errors.push("recommended_action is required");
  if (typeof value?.human_handoff !== "string" || !value.human_handoff.trim()) errors.push("human_handoff is required");
  if (typeof value?.confidence !== "number" || value.confidence < 0 || value.confidence > 1) errors.push("confidence must be between 0 and 1");
  if (typeof value?.spoken_summary !== "string" || value.spoken_summary.trim().length < 30) errors.push("spoken_summary is required");
  if (FORBIDDEN_SPOKEN_PATTERNS.some((pattern) => pattern.test(value?.spoken_summary ?? ""))) errors.push("spoken_summary contains machine-facing language");
  if (errors.length) throw new Error(errors.join("; "));
  return value;
}

export function extractJsonObject(text) {
  const first = text.indexOf("{");
  const last = text.lastIndexOf("}");
  if (first < 0 || last <= first) throw new Error("agent response did not contain a JSON object");
  return JSON.parse(text.slice(first, last + 1));
}
