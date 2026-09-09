import test from "node:test";
import assert from "node:assert/strict";
import {extractJsonObject, validateReport} from "../coordinator/reports.mjs";

const good = {
  status:"ready",
  claim:"Four delivered rows repeat existing business events.",
  evidence_refs:["SOURCE: batch 002"],
  uncertainties:["The sample cannot prove universal key uniqueness."],
  recommended_action:"Document and validate the candidate business key.",
  human_handoff:"Human Data Engineering must confirm upstream semantics.",
  confidence:0.87,
  spoken_summary:"Four rows are repeat deliveries of events already seen. The delivery identifier is useful lineage, but it should not define the business event. Data Engineering still needs to confirm the upstream meaning before adopting the candidate key."
};

test("accepts grounded machine report with human speech", () => assert.equal(validateReport(good), good));
test("rejects internal state and evidence IDs in speech", () => assert.throws(() => validateReport({...good, spoken_summary:"My floor_granted report cites EV-12 and should now yield_floor for the next service."}), /machine-facing/));
test("extracts one JSON object from fenced output", () => assert.equal(extractJsonObject(`\n\`\`\`json\n${JSON.stringify(good)}\n\`\`\``).claim, good.claim));
test("rejects evidence outside the uploaded source manifest", () => assert.throws(() => validateReport(good, {allowedEvidenceRefs:new Set(["another-source"])}), /unknown source/));
test("rejects ambiguous agent-team authority language", () => assert.throws(() => validateReport({...good, spoken_summary:"The evidence supports this bounded candidate key. BI Analytics must approve it before promotion, while the source owner confirms timestamp behavior and Privacy decides handling."}), /machine-facing/));
test("rejects a verbose spoken summary", () => assert.throws(() => validateReport({...good, spoken_summary:Array.from({length:66}, (_, index) => `word${index}`).join(" ")}), /exceeds 65 words/));
