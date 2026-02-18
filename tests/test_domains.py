from forge.domains import DomainAgent, DnsTxtRecord, DomainVerificationRequest, NamecheapDnsPlanner
from forge.domains.models import Registrar


def test_domain_request_builds_atproto_record():
    request = DomainVerificationRequest(domain="privateclient.ai", did="did:plc:abc123")

    assert request.atproto_record == DnsTxtRecord(host="_atproto", value="did=did:plc:abc123", ttl=60)


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
