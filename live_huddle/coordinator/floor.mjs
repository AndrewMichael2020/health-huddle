const STATES = new Set(["thinking","ready","parked","skipped","floor_granted","speaking","challenged","yielded","complete"]);

export class FloorCoordinator {
  constructor(agentIds, {transitionMs = 400, clock = () => Date.now()} = {}) {
    this.clock = clock;
    this.transitionMs = transitionMs;
    this.floorHolder = null;
    this.lastYieldAt = Number.NEGATIVE_INFINITY;
    this.agents = new Map(agentIds.map((id) => [id, {state:"thinking", report:null}]));
    this.events = [];
  }

  record(agentId, state, detail = {}) {
    if (!STATES.has(state)) throw new Error(`unknown state: ${state}`);
    if (!this.agents.has(agentId)) throw new Error(`unknown agent: ${agentId}`);
    this.agents.get(agentId).state = state;
    const event = {at:this.clock(), agent_id:agentId, state, ...detail};
    this.events.push(event);
    return event;
  }

  ready(agentId, report) {
    const current = this.agents.get(agentId)?.state;
    if (!new Set(["thinking","parked","challenged"]).has(current)) throw new Error(`${agentId} cannot become ready from ${current}`);
    this.agents.get(agentId).report = report;
    return this.record(agentId, "ready");
  }

  grant(agentId) {
    if (this.floorHolder) throw new Error(`floor already held by ${this.floorHolder}`);
    if (this.agents.get(agentId)?.state !== "ready") throw new Error(`${agentId} is not ready`);
    if (this.clock() - this.lastYieldAt < this.transitionMs) throw new Error("floor transition gap has not elapsed");
    this.floorHolder = agentId;
    return this.record(agentId, "floor_granted");
  }

  speaking(agentId) {
    if (this.floorHolder !== agentId || this.agents.get(agentId)?.state !== "floor_granted") throw new Error(`${agentId} does not hold the floor`);
    return this.record(agentId, "speaking");
  }

  yield(agentId) {
    if (this.floorHolder !== agentId) throw new Error(`${agentId} cannot yield another agent's floor`);
    this.floorHolder = null;
    this.lastYieldAt = this.clock();
    return this.record(agentId, "yielded");
  }

  challenge(agentId) {
    if (this.floorHolder === agentId) throw new Error("speaker must yield before follow-up investigation");
    return this.record(agentId, "challenged");
  }

  park(agentId, reason) {
    if (this.floorHolder === agentId) {
      this.floorHolder = null;
      this.lastYieldAt = this.clock();
    }
    return this.record(agentId, "parked", {reason});
  }
  skip(agentId, reason) {
    if (this.floorHolder === agentId) {
      this.floorHolder = null;
      this.lastYieldAt = this.clock();
    }
    return this.record(agentId, "skipped", {reason});
  }
  complete(agentId) { return this.record(agentId, "complete"); }
}
