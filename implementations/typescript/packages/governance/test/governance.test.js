import assert from "node:assert/strict";
import test from "node:test";
import { authorize } from "../src/index.js";

const actor = (roles, tenantId = "tenant-a") => ({
  actorId: "agent-1",
  tenantId,
  roles
});

test("grants the standard actions to their approved roles", () => {
  for (const [roles, action] of [
    [["viewer"], "event.subscribe"],
    [["publisher"], "event.publish"],
    [["publisher"], "task.submit"],
    [["operator"], "task.manage"],
    [["tenant-admin"], "governance.audit.read"],
    [["cross-tenant-operator"], "tenant.cross_access"]
  ]) {
    const decision = authorize({ actor: actor(roles), action, targetTenant: "tenant-a" });
    assert.deepEqual(decision, {
      allowed: true,
      action,
      reason: "allowed",
      actorTenant: "tenant-a",
      targetTenant: "tenant-a"
    });
  }
});

test("denies an action without an approved role", () => {
  const decision = authorize({
    actor: actor(["viewer"]),
    action: "event.publish",
    targetTenant: "tenant-a"
  });

  assert.deepEqual(decision, {
    allowed: false,
    action: "event.publish",
    reason: "missing_role",
    actorTenant: "tenant-a",
    targetTenant: "tenant-a"
  });
});

test("denies requests missing actor identity or tenant context", () => {
  const missingIdentity = authorize({
    actor: { tenantId: "tenant-a", roles: ["publisher"] },
    action: "event.publish",
    targetTenant: "tenant-a"
  });
  const missingTenant = authorize({
    actor: actor(["publisher"]),
    action: "event.publish",
    targetTenant: null
  });

  assert.equal(missingIdentity.reason, "missing_identity");
  assert.equal(missingTenant.reason, "missing_tenant");
});

test("denies cross-tenant actions unless the actor has cross-tenant access", () => {
  const denied = authorize({
    actor: actor(["operator"]),
    action: "event.publish",
    targetTenant: "tenant-b"
  });
  const allowed = authorize({
    actor: actor(["cross-tenant-operator"]),
    action: "event.publish",
    targetTenant: "tenant-b"
  });

  assert.equal(denied.allowed, false);
  assert.equal(denied.reason, "tenant_access_denied");
  assert.deepEqual(allowed, {
    allowed: true,
    action: "event.publish",
    reason: "allowed",
    actorTenant: "tenant-a",
    targetTenant: "tenant-b"
  });
});
