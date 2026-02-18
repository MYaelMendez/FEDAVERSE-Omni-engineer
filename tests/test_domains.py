from forge.domains import DnsTxtRecord, DomainVerificationRequest, NamecheapDnsPlanner


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
