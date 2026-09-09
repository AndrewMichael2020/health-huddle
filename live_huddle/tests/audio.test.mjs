import test from "node:test";
import assert from "node:assert/strict";
import {pcm16ToWav, pcmDurationSeconds} from "../audio/wav.mjs";

test("wraps 16 kHz mono PCM in a valid WAV container", () => {
  const pcm = Buffer.alloc(32000);
  const wav = pcm16ToWav(pcm);
  assert.equal(wav.subarray(0, 4).toString(), "RIFF");
  assert.equal(wav.subarray(8, 12).toString(), "WAVE");
  assert.equal(wav.readUInt32LE(40), pcm.length);
  assert.equal(wav.length, pcm.length + 44);
  assert.equal(pcmDurationSeconds(pcm.length), 1);
});
