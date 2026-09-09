import test from "node:test";
import assert from "node:assert/strict";
import {redact} from "../audit/logger.mjs";

test("redacts nested credentials and authorization strings", () => {
  const value = redact({api_key:"secret", nested:{authorization:"Bearer abcdef", note:"xi-api-key: secretvalue"}});
  assert.equal(value.api_key, "[REDACTED]");
  assert.equal(value.nested.authorization, "[REDACTED]");
  assert.equal(value.nested.note, "[REDACTED]");
});
