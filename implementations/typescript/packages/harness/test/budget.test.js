import test from "node:test";
import assert from "node:assert/strict";
import { HarmovelaHarness } from "../src/harness.js";
import { ErrorCode } from "@axisrobo/harmovela-event";

test("budget established, within-budget ack, exceeding emits limit_exceeded", () => {
  const h = new HarmovelaHarness();

  const established = {
    spec_version: "0.2",
    id: "evt_adapt_001",
    type: "adaptation.budget.established",
    source: "agent:budget-manager",
    created_at: "2026-07-14T10:00:00Z",
    tenant_id: "tenant-alpha",
    actor_id: "actor_admin",
    payload: { budget_id: "budget-01", limit: 100 },
  };
  h.handle(established);
  assert.equal(h._budgetLimits["budget-01"], 100);

  const withinBudget = {
    spec_version: "0.2",
    id: "evt_adapt_002",
    type: "adaptation.outcome.correlated",
    source: "agent:worker",
    created_at: "2026-07-14T10:01:00Z",
    tenant_id: "tenant-alpha",
    actor_id: "actor_worker",
    budget_id: "budget-01",
    budget_cost: 50,
    payload: {},
  };
  const resp1 = h.handle(withinBudget);
  assert.ok(resp1.some((r) => r.type === "event.acknowledged"));

  const exceedBudget = {
    spec_version: "0.2",
    id: "evt_adapt_003",
    type: "adaptation.outcome.correlated",
    source: "agent:worker",
    created_at: "2026-07-14T10:02:00Z",
    tenant_id: "tenant-alpha",
    actor_id: "actor_worker",
    budget_id: "budget-01",
    budget_cost: 200,
    payload: {},
  };
  const resp2 = h.handle(exceedBudget);
  const rejected = resp2.find((r) => r.type === "event.rejected");
  assert.ok(rejected);
  assert.equal(rejected.payload.error.code, ErrorCode.BUDGET_EXCEEDED);
  const limitExceeded = resp2.find((r) => r.type === "adaptation.budget.limit_exceeded");
  assert.ok(limitExceeded);
});
