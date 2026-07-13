from aep.governance import authorize


def actor(roles, tenant_id="tenant-a"):
    return {"actor_id": "agent-1", "tenant_id": tenant_id, "roles": roles}


def test_grants_standard_actions_to_approved_roles():
    for roles, action in (
        (["viewer"], "event.subscribe"),
        (["publisher"], "event.publish"),
        (["publisher"], "task.submit"),
        (["operator"], "task.manage"),
        (["tenant-admin"], "governance.audit.read"),
        (["cross-tenant-operator"], "tenant.cross_access"),
    ):
        assert authorize(actor(roles), action, "tenant-a") == {
            "allowed": True,
            "action": action,
            "reason": "allowed",
            "actorTenant": "tenant-a",
            "targetTenant": "tenant-a",
        }


def test_denies_action_without_an_approved_role():
    assert authorize(actor(["viewer"]), "event.publish", "tenant-a") == {
        "allowed": False,
        "action": "event.publish",
        "reason": "missing_role",
        "actorTenant": "tenant-a",
        "targetTenant": "tenant-a",
    }


def test_denies_requests_missing_actor_identity_or_tenant_context():
    missing_identity = authorize(
        {"tenant_id": "tenant-a", "roles": ["publisher"]}, "event.publish", "tenant-a"
    )
    missing_tenant = authorize(actor(["publisher"]), "event.publish", None)

    assert missing_identity["reason"] == "missing_identity"
    assert missing_tenant["reason"] == "missing_tenant"


def test_denies_cross_tenant_actions_without_cross_tenant_access():
    denied = authorize(actor(["operator"]), "event.publish", "tenant-b")
    allowed = authorize(actor(["cross-tenant-operator"]), "event.publish", "tenant-b")

    assert denied["allowed"] is False
    assert denied["reason"] == "tenant_access_denied"
    assert allowed == {
        "allowed": True,
        "action": "event.publish",
        "reason": "allowed",
        "actorTenant": "tenant-a",
        "targetTenant": "tenant-b",
    }
