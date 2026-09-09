import {appendFile, mkdir} from "node:fs/promises";
import path from "node:path";

const SECRET_KEYS = /(?:api[_-]?key|authorization|token|secret|signed_url)/i;
const SECRET_VALUES = /(?:sk_[A-Za-z0-9_-]{12,}|xi-api-key\s*[:=]\s*\S+|Bearer\s+\S+)/gi;

export function redact(value) {
  if (Array.isArray(value)) return value.map(redact);
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).map(([key, child]) => [key, SECRET_KEYS.test(key) ? "[REDACTED]" : redact(child)]));
  if (typeof value === "string") return value.replace(SECRET_VALUES, "[REDACTED]");
  return value;
}

export class AuditLog {
  constructor(filePath) { this.filePath = filePath; }
  async write(type, payload = {}) {
    await mkdir(path.dirname(this.filePath), {recursive:true});
    const event = redact({timestamp:new Date().toISOString(), type, ...payload});
    await appendFile(this.filePath, `${JSON.stringify(event)}\n`, {mode:0o600});
    return event;
  }
}
