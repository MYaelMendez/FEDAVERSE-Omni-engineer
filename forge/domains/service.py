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


class DomainAgent:
    """Application-facing orchestration layer for domain verification planning."""

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
