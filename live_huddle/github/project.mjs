import {createHash} from "node:crypto";
import {execFile} from "node:child_process";
import {promisify} from "node:util";

const execFileAsync = promisify(execFile);

function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical).sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));
  if (value && typeof value === "object") return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonical(value[key])]));
  return value;
}

export function canonicalJson(value) { return JSON.stringify(canonical(value)); }
export function snapshotHash(snapshot) { return createHash("sha256").update(canonicalJson(snapshot)).digest("hex"); }

export async function defaultGh(args) {
  const {stdout} = await execFileAsync("gh", args, {maxBuffer:10 * 1024 * 1024});
  return stdout;
}

export class ProjectGuard {
  constructor({owner, number, allowedIssueNumbers, gh = defaultGh, audit = null}) {
    this.owner = owner;
    this.number = number;
    this.allowedIssueNumbers = new Set(allowedIssueNumbers);
    this.gh = gh;
    this.audit = audit;
    this.mutationsEnabled = false;
    this.ledger = [];
  }

  async readJson(args) { return JSON.parse(await this.gh(args)); }

  async snapshot() {
    const [project, fields, items] = await Promise.all([
      this.readJson(["project","view",String(this.number),"--owner",this.owner,"--format","json"]),
      this.readJson(["project","field-list",String(this.number),"--owner",this.owner,"--format","json"]),
      this.readJson(["project","item-list",String(this.number),"--owner",this.owner,"--limit","1000","--format","json"])
    ]);
    const snapshot = {project, fields, items};
    return {snapshot, sha256:snapshotHash(snapshot)};
  }

  enableMutations() {
    if (this.ledger.length) throw new Error("cannot enable mutations with an unresolved action ledger");
    this.mutationsEnabled = true;
  }
  disableMutations() { this.mutationsEnabled = false; }
  requireMutation() { if (!this.mutationsEnabled) throw new Error("Project mutations are disabled"); }

  findIssueItem(snapshot, issueNumber) {
    if (!this.allowedIssueNumbers.has(issueNumber)) throw new Error(`issue #${issueNumber} is outside the allow-list`);
    const items = snapshot.items?.items ?? snapshot.items ?? [];
    const item = items.find((candidate) => Number(candidate.content?.number) === Number(issueNumber));
    if (!item) throw new Error(`issue #${issueNumber} is not on Project ${this.number}`);
    return item;
  }

  findField(snapshot, name) {
    const fields = snapshot.fields?.fields ?? snapshot.fields ?? [];
    const field = fields.find((candidate) => candidate.name === name);
    if (!field) throw new Error(`Project field not found: ${name}`);
    return field;
  }

  async setStatus({snapshot, issueNumber, status}) {
    this.requireMutation();
    const item = this.findIssueItem(snapshot, issueNumber);
    const field = this.findField(snapshot, "Status");
    const option = field.options?.find((candidate) => candidate.name === status);
    if (!option) throw new Error(`unknown status: ${status}`);
    const previous = item.status ?? item.fieldValues?.find?.((v) => v.field?.name === "Status")?.name;
    if (previous === status) return {changed:false};
    if (!previous) throw new Error("current status is unavailable; refusing a non-reversible change");
    const previousOption = field.options.find((candidate) => candidate.name === previous);
    if (!previousOption) throw new Error(`cannot resolve previous status: ${previous}`);
    await this.gh(["project","item-edit","--id",item.id,"--project-id",snapshot.project.id,"--field-id",field.id,"--single-select-option-id",option.id]);
    const inverse = {type:"set_status", item_id:item.id, field_id:field.id, option_id:previousOption.id, issue_number:issueNumber, from:status, to:previous};
    this.ledger.push(inverse);
    await this.audit?.write("project_action", {action:"set_status", issue_number:issueNumber, from:previous, to:status, inverse});
    return {changed:true, inverse};
  }

  async addRunDraft({runId, title, body = ""}) {
    this.requireMutation();
    if (!/^[a-zA-Z0-9_-]{6,80}$/.test(runId)) throw new Error("invalid run identifier");
    const taggedTitle = `[HH-LIVE ${runId}] ${title}`;
    const result = await this.readJson(["project","item-create",String(this.number),"--owner",this.owner,"--title",taggedTitle,"--body",body,"--format","json"]);
    const inverse = {type:"delete_draft", item_id:result.id, run_id:runId, title:taggedTitle};
    this.ledger.push(inverse);
    await this.audit?.write("project_action", {action:"add_run_draft", item_id:result.id, title:taggedTitle, inverse});
    return result;
  }

  async restore() {
    this.disableMutations();
    const outcomes = [];
    for (const inverse of [...this.ledger].reverse()) {
      if (inverse.type === "set_status") {
        await this.gh(["project","item-edit","--id",inverse.item_id,"--project-id",(await this.snapshot()).snapshot.project.id,"--field-id",inverse.field_id,"--single-select-option-id",inverse.option_id]);
      } else if (inverse.type === "delete_draft") {
        await this.gh(["project","item-delete",String(this.number),"--owner",this.owner,"--id",inverse.item_id]);
      } else throw new Error(`unknown inverse action: ${inverse.type}`);
      outcomes.push(inverse);
      await this.audit?.write("project_inverse", inverse);
    }
    this.ledger = [];
    return outcomes;
  }
}

export async function selectedIssueEvidence({owner, repository, issueNumbers, gh = defaultGh}) {
  const records = [];
  for (const number of issueNumbers) {
    const raw = await gh(["issue","view",String(number),"--repo",`${owner}/${repository}`,"--json","number,title,state,url,labels"]);
    const issue = JSON.parse(raw);
    const labels = (issue.labels ?? []).map((label) => label.name).filter(Boolean).join(", ") || "none";
    records.push(`### Issue #${issue.number}: ${issue.title}\nState: ${issue.state}\nLabels: ${labels}\nURL: ${issue.url}\n\nThe prior deterministic demonstration's decision body is deliberately excluded. Re-investigate this ticket from source evidence.`);
  }
  return records.join("\n\n");
}
