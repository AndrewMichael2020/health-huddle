import test from "node:test";
import assert from "node:assert/strict";
import {ProjectGuard, snapshotHash} from "../github/project.mjs";

const fixture = {
  project:{id:"PVT_test", title:"Agents"},
  fields:{fields:[{id:"status-field",name:"Status",options:[{id:"blocked",name:"Blocked"},{id:"progress",name:"In Progress"}]}]},
  items:{items:[{id:"item-3",status:"Blocked",content:{number:3,title:"PARIS"}}]}
};

test("snapshot hash ignores object key and array order", () => {
  assert.equal(snapshotHash({b:[2,1],a:1}), snapshotHash({a:1,b:[1,2]}));
});

test("guard refuses unauthorized and disabled mutations", async () => {
  const guard = new ProjectGuard({owner:"owner",number:13,allowedIssueNumbers:[3],gh:async () => ""});
  await assert.rejects(() => guard.setStatus({snapshot:fixture,issueNumber:3,status:"In Progress"}), /disabled/);
  guard.enableMutations();
  await assert.rejects(() => guard.setStatus({snapshot:fixture,issueNumber:99,status:"In Progress"}), /allow-list/);
});

test("status mutation records and replays an inverse", async () => {
  const calls = [];
  const gh = async (args) => {
    calls.push(args);
    if (args[1] === "view") return JSON.stringify(fixture.project);
    if (args[1] === "field-list") return JSON.stringify(fixture.fields);
    if (args[1] === "item-list") return JSON.stringify(fixture.items);
    return "";
  };
  const guard = new ProjectGuard({owner:"owner",number:13,allowedIssueNumbers:[3],gh});
  guard.enableMutations();
  await guard.setStatus({snapshot:fixture,issueNumber:3,status:"In Progress"});
  assert.equal(guard.ledger.length, 1);
  await guard.restore();
  assert.equal(guard.ledger.length, 0);
  assert.equal(calls.filter((args) => args[1] === "item-edit").length, 2);
});
