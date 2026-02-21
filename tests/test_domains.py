from forge.domains import DomainAgent, DnsTxtRecord, DomainVerificationRequest, NamecheapDnsPlanner
from forge.domains.models import Registrar


def test_domain_request_builds_atproto_record():
    request = DomainVerificationRequest(domain="privateclient.ai", did="did:plc:abc123")

    assert request.atproto_record == DnsTxtRecord(host="_atproto", value="did=did:plc:abc123", ttl=60)


def test_domain_request_normalizes_domain_and_did():
    request = DomainVerificationRequest(domain=" PrivateClient.AI. ", did=" did:plc:abc123 ")

    assert request.domain == "privateclient.ai"
    assert request.did == "did:plc:abc123"


def test_domain_request_rejects_invalid_domain_or_did():
    try:
        DomainVerificationRequest(domain="invalid_domain", did="did:plc:abc123")
        assert False, "Expected ValueError for invalid domain"
    except ValueError as exc:
        assert "Invalid domain" in str(exc)

    try:
        DomainVerificationRequest(domain="privateclient.ai", did="did:web:privateclient.ai")
        assert False, "Expected ValueError for non-plc DID"
    except ValueError as exc:
        assert "did:plc:" in str(exc)


def test_namecheap_planner_replaces_conflicting_atproto_record():
    existing = [
        DnsTxtRecord(host="@", value="example"),
        DnsTxtRecord(host="_atproto", value="did=did:plc:old"),
    ]
    target = DnsTxtRecord(host="_atproto", value="did=did:plc:new")

    merged = NamecheapDnsPlanner.merge_records(existing, target)

    assert DnsTxtRecord(host="@", value="example") in merged
    assert DnsTxtRecord(host="_atproto", value="did=did:plc:new") in merged
    assert DnsTxtRecord(host="_atproto", value="did=did:plc:old") not in merged


def test_domain_agent_builds_deterministic_plan():
    request = DomainVerificationRequest(domain="privateclient.ai", did="did:plc:new")
    existing = [
        DnsTxtRecord(host="@", value="keep"),
        DnsTxtRecord(host="_atproto", value="did=did:plc:old"),
    ]

    plan = DomainAgent().build_plan(request, existing)

    assert plan.request == request
    assert plan.records_before == tuple(existing)
    assert plan.records_after == (
        DnsTxtRecord(host="@", value="keep"),
        DnsTxtRecord(host="_atproto", value="did=did:plc:new", ttl=60),
    )


def test_domain_agent_rejects_unknown_registrar():
    request = DomainVerificationRequest(
        domain="privateclient.ai",
        did="did:plc:new",
        registrar="other",  # type: ignore[arg-type]
    )

    try:
        DomainAgent().build_plan(request, [])
        assert False, "Expected ValueError"
    except ValueError as exc:
        assert "Unsupported registrar" in str(exc)


def test_domain_agent_first_step_builds_plan_from_raw_inputs():
    plan = DomainAgent().first_step(
        domain="PrivateClient.ai.",
        did=" did:plc:new ",
        existing_records=[
            DnsTxtRecord(host="_atproto", value="did=did:plc:old"),
            DnsTxtRecord(host="@", value="keep"),
        ],
    )

    assert plan.request.domain == "privateclient.ai"
    assert plan.request.did == "did:plc:new"
    assert plan.records_after == (
        DnsTxtRecord(host="@", value="keep"),
        DnsTxtRecord(host="_atproto", value="did=did:plc:new", ttl=60),
    )


def test_domain_plan_to_dict_returns_api_ready_payload():
    plan = DomainAgent().first_step(
        domain="privateclient.ai",
        did="did:plc:new",
        existing_records=[DnsTxtRecord(host="@", value="keep")],
    )

    assert plan.to_dict() == {
        "request": {
            "domain": "privateclient.ai",
            "did": "did:plc:new",
            "registrar": "namecheap",
        },
        "records_before": [{"host": "@", "value": "keep", "ttl": 60}],
        "records_after": [
            {"host": "@", "value": "keep", "ttl": 60},
            {"host": "_atproto", "value": "did=did:plc:new", "ttl": 60},
        ],
        "next_action": "review_and_apply_dns",
    }
