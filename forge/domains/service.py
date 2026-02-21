from __future__ import annotations

from dataclasses import dataclass

from .models import DnsTxtRecord, DomainVerificationRequest, Registrar
from .namecheap import NamecheapDnsPlanner


@dataclass(frozen=True)
class DomainPlan:
    """Deterministic plan produced before touching registrar APIs."""

    request: DomainVerificationRequest
    records_before: tuple[DnsTxtRecord, ...]
    records_after: tuple[DnsTxtRecord, ...]

    def to_dict(self) -> dict[str, object]:
        """JSON-ready plan payload for UI and API review surfaces."""

        return {
            "request": {
                "domain": self.request.domain,
                "did": self.request.did,
                "registrar": self.request.registrar.value,
            },
            "records_before": [
                {"host": record.host, "value": record.value, "ttl": record.ttl}
                for record in self.records_before
            ],
            "records_after": [
                {"host": record.host, "value": record.value, "ttl": record.ttl}
                for record in self.records_after
            ],
            "next_action": "review_and_apply_dns",
        }


class DomainAgent:
    """Application-facing orchestration layer for domain verification planning."""

    def first_step(
        self,
        *,
        domain: str,
        did: str,
        existing_records: list[DnsTxtRecord],
        registrar: Registrar = Registrar.NAMECHEAP,
    ) -> DomainPlan:
        """Build the deterministic DNS plan used as onboarding step one.

        This helper creates a validated request and then computes the
        before/after DNS plan without touching registrar APIs.
        """

        request = DomainVerificationRequest(domain=domain, did=did, registrar=registrar)
        return self.build_plan(request=request, existing_records=existing_records)

    def build_plan(
        self,
        request: DomainVerificationRequest,
        existing_records: list[DnsTxtRecord],
    ) -> DomainPlan:
        if request.registrar != Registrar.NAMECHEAP:
            raise ValueError(f"Unsupported registrar: {request.registrar}")

        merged = NamecheapDnsPlanner.merge_records(existing_records, request.atproto_record)
        return DomainPlan(
            request=request,
            records_before=tuple(existing_records),
            records_after=tuple(merged),
        )
