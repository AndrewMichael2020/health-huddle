import {readFile} from "node:fs/promises";
import path from "node:path";
import {fileURLToPath} from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
export const DEFAULT_SCENARIO_PATH = path.join(here, "scenarios/paris-lineage.json");

function nonEmpty(value, label, errors) {
  if (typeof value !== "string" || !value.trim()) errors.push(`${label} must be a non-empty string`);
}

export function validateScenario(scenario) {
  const errors = [];
  if (scenario?.schema_version !== 1) errors.push("schema_version must be 1");
  for (const key of ["id", "title", "question", "private_brief", "method_prompt"]) nonEmpty(scenario?.[key], key, errors);
  const sources = scenario?.knowledge?.source_allowlist;
  if (!Array.isArray(sources) || !sources.length || sources.some((item) => typeof item !== "string" || !item)) errors.push("knowledge.source_allowlist must contain paths");
  if (!Array.isArray(scenario?.knowledge?.excluded_sources)) errors.push("knowledge.excluded_sources must be an array");
  nonEmpty(scenario?.knowledge?.project_source_label, "knowledge.project_source_label", errors);
  const project = scenario?.project;
  nonEmpty(project?.owner, "project.owner", errors);
  nonEmpty(project?.repository, "project.repository", errors);
  if (!Number.isInteger(project?.number) || project.number < 1) errors.push("project.number must be a positive integer");
  if (!Array.isArray(project?.allowed_issue_numbers) || !project.allowed_issue_numbers.every(Number.isInteger)) errors.push("project.allowed_issue_numbers must be integers");
  if (!project?.allowed_issue_numbers?.includes(project?.action?.issue_number)) errors.push("project.action.issue_number must be allow-listed");
  nonEmpty(project?.action?.status, "project.action.status", errors);
  const flow = scenario?.flow;
  if (!Array.isArray(flow?.base_investigators) || !flow.base_investigators.length) errors.push("flow.base_investigators is required");
  nonEmpty(flow?.challenge?.challenger_id, "flow.challenge.challenger_id", errors);
  nonEmpty(flow?.challenge?.subject_id, "flow.challenge.subject_id", errors);
  if (!Array.isArray(flow?.audible_turns) || !flow.audible_turns.length) errors.push("flow.audible_turns is required");
  const audibleIds = flow?.audible_turns?.map((turn) => turn.agent_id) ?? [];
  if (new Set(audibleIds).size !== audibleIds.length) errors.push("each specialist may appear only once in flow.audible_turns");
  for (const turn of flow?.audible_turns ?? []) {
    nonEmpty(turn?.agent_id, "audible turn agent_id", errors);
    nonEmpty(turn?.source, "audible turn source", errors);
    nonEmpty(turn?.instruction, "audible turn instruction", errors);
  }
  for (const id of [...(flow?.base_investigators ?? []), flow?.challenge?.challenger_id].filter(Boolean)) {
    nonEmpty(scenario?.role_lenses?.[id], `role_lenses.${id}`, errors);
  }
  const closing = scenario?.speech?.closing;
  nonEmpty(closing?.exact_final_phrase, "speech.closing.exact_final_phrase", errors);
  if (!Number.isInteger(closing?.min_words) || !Number.isInteger(closing?.max_words) || closing.min_words > closing.max_words) errors.push("speech.closing word bounds are invalid");
  const findings = scenario?.evaluation?.required_findings;
  if (!Array.isArray(findings) || findings.length !== 3) errors.push("evaluation.required_findings must contain exactly three checks");
  for (const finding of findings ?? []) {
    nonEmpty(finding?.label, "evaluation finding label", errors);
    if (!Array.isArray(finding?.patterns) || !finding.patterns.length || finding.patterns.some((pattern) => typeof pattern !== "string" || !pattern)) errors.push("evaluation finding patterns are required");
  }
  if (errors.length) throw new Error(`Invalid huddle scenario: ${errors.join("; ")}`);
  return scenario;
}

export async function loadScenario(filePath = process.env.HUDDLE_SCENARIO || DEFAULT_SCENARIO_PATH) {
  const resolved = path.resolve(filePath);
  const scenario = validateScenario(JSON.parse(await readFile(resolved, "utf8")));
  return {scenario, path:resolved};
}
