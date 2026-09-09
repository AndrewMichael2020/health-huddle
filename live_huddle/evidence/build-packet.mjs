import {createHash} from "node:crypto";
import {mkdir, readFile, writeFile} from "node:fs/promises";
import path from "node:path";
import {fileURLToPath} from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
export const repoRoot = path.resolve(here, "../..");

export const SOURCE_ALLOWLIST = [
  "docs/modernization-goal.md",
  "docs/current-state.md",
  "docs/target-state.md",
  "docs/service-level-objectives.md",
  "docs/architecture-decisions/ADR-001-source-shaped-bronze.md",
  "contracts/paris-source-map.csv",
  "contracts/canonical-entities.yml",
  "contracts/lifecycle-rules.yml",
  "contracts/privacy-classification.yml",
  "contracts/release-gates.yml",
  "data/generated/batch_001/paris_referral_status.csv",
  "data/generated/batch_002/paris_referral_status.csv",
  "src/standardize_records.py",
  "src/reconcile_load.py"
];

export const EXCLUDED_SOURCES = [
  "README.md",
  "docs/huddle-scenario.md",
  "demo/huddle-script.json",
  "demo/action-ledger.json",
  "data/expected-results/scenario_truth.json",
  "docs/live-huddle/README.md",
  "docs/live-huddle/BRD.md",
  "docs/live-huddle/PLAN.md"
];

export const ALLOWED_EVIDENCE_REFS = new Set([...SOURCE_ALLOWLIST, "GitHub Project 13 selected tickets"]);

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

export async function buildEvidencePacket({
  outDir = path.join(repoRoot, ".artifacts/live-huddle/evidence"),
  projectEvidence = "",
  sourceAllowlist = SOURCE_ALLOWLIST,
  excludedSources = EXCLUDED_SOURCES,
  projectSourceLabel = "GitHub Project 13 selected tickets"
} = {}) {
  const sections = [];
  const sources = [];
  for (const relativePath of sourceAllowlist) {
    const body = await readFile(path.join(repoRoot, relativePath), "utf8");
    sources.push({path: relativePath, sha256: sha256(body), bytes: Buffer.byteLength(body)});
    sections.push(`\n## SOURCE: ${relativePath}\n\n${body.trim()}\n`);
  }
  if (projectEvidence.trim()) {
    const projectPath = `github://${projectSourceLabel.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}`;
    sources.push({path: projectPath, sha256: sha256(projectEvidence), bytes: Buffer.byteLength(projectEvidence)});
    sections.push(`\n## SOURCE: ${projectSourceLabel}\n\n${projectEvidence.trim()}\n`);
  }
  const header = [
    "# Live huddle evidence packet",
    "",
    "Synthetic demonstration data only. This packet is evidence, not an answer script.",
    "Agents must distinguish observations from recommendations and must not claim human approval.",
    "Evidence references use the source headings below."
  ].join("\n");
  const packet = `${header}\n${sections.join("\n")}`;
  const manifest = {
    schema_version: 1,
    packet_sha256: sha256(packet),
    source_count: sources.length,
    sources,
    excluded_sources: excludedSources,
    evidence_refs:[...sourceAllowlist, ...(projectEvidence.trim() ? [projectSourceLabel] : [])]
  };
  await mkdir(outDir, {recursive: true});
  await writeFile(path.join(outDir, "knowledge.md"), packet);
  await writeFile(path.join(outDir, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
  return {packet, manifest, outDir};
}
