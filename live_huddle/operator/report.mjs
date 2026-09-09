function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[character]);
}

export function renderRunReport({runId, evaluation, transcript, conversationId}) {
  const rows = evaluation.criteria.map((criterion) => `<tr><td>${criterion.passed ? "PASS" : "FAIL"}</td><td>${escapeHtml(criterion.id)}</td><td>${escapeHtml(criterion.label)}</td></tr>`).join("\n");
  const turns = transcript.map((entry) => `<article><strong>${escapeHtml(entry.speaker)} · ${escapeHtml(entry.kind)}</strong><p>${escapeHtml(entry.text)}</p></article>`).join("\n");
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Health Huddle ${escapeHtml(runId)}</title>
<style>body{font:16px/1.5 system-ui;max-width:980px;margin:2rem auto;padding:0 1rem;color:#18202b}h1{margin-bottom:.25rem}.pass{color:#08783f}.fail{color:#a21a1a}table{border-collapse:collapse;width:100%}td{padding:.45rem;border-bottom:1px solid #ddd}article{border-left:4px solid #6b75d8;padding:.25rem 1rem;margin:1rem 0;background:#f7f7fb}code{font-size:.85em}</style></head>
<body><h1>Live agent huddle acceptance report</h1><p class="${evaluation.passed ? "pass" : "fail"}">${evaluation.passed ? "Accepted" : "Not accepted"} · ${escapeHtml(runId)}</p>
<p>Conversation <code>${escapeHtml(conversationId ?? "unavailable")}</code> · ${evaluation.observations.duration_seconds} seconds · ${evaluation.observations.interruption_count} interruption events</p>
<h2>Acceptance criteria</h2><table><tbody>${rows}</tbody></table><h2>Human-readable transcript</h2>${turns}</body></html>`;
}
