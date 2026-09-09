import test from "node:test";
import assert from "node:assert/strict";
import {mkdtemp, readFile} from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {buildEvidencePacket, EXCLUDED_SOURCES} from "../evidence/build-packet.mjs";

test("builds deterministic evidence without the scripted answer", async () => {
  const firstDir = await mkdtemp(path.join(os.tmpdir(), "hh-evidence-a-"));
  const secondDir = await mkdtemp(path.join(os.tmpdir(), "hh-evidence-b-"));
  const first = await buildEvidencePacket({outDir:firstDir});
  const second = await buildEvidencePacket({outDir:secondDir});
  assert.equal(first.manifest.packet_sha256, second.manifest.packet_sha256);
  const packet = await readFile(path.join(firstDir, "knowledge.md"), "utf8");
  for (const excluded of EXCLUDED_SOURCES) assert.doesNotMatch(packet, new RegExp(`SOURCE: ${excluded.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`));
  assert.match(packet, /paris_row_id/);
  assert.doesNotMatch(packet, /expected_paris_duplicate_delivery_rows/);
  assert.doesNotMatch(packet, /four PARIS status events repeat earlier business events/i);
  assert.doesNotMatch(packet, /The stable key is referral, status and event time/i);
});
