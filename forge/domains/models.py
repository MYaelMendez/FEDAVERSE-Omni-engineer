from __future__ import annotations

from dataclasses import dataclass
from enum import Enum
import re


DOMAIN_RE = re.compile(r"^(?=.{1,253}$)([a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)(\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+$")


class Registrar(str, Enum):
    """Supported DNS providers for sovereign-handle onboarding."""

    NAMECHEAP = "namecheap"


@dataclass(frozen=True)
class DnsTxtRecord:
    """Canonical representation of an _atproto TXT record."""

    host: str
    value: str
    ttl: int = 60


@dataclass(frozen=True)
class DomainVerificationRequest:
    """Data required to anchor a DID to a user-owned domain."""

    domain: str
    did: str
    registrar: Registrar = Registrar.NAMECHEAP

    def __post_init__(self) -> None:
        normalized_domain = self.domain.strip().lower().rstrip(".")
        normalized_did = self.did.strip()

        if not DOMAIN_RE.match(normalized_domain):
            raise ValueError(f"Invalid domain: {self.domain}")

        if not normalized_did.startswith("did:plc:"):
            raise ValueError("DID must start with did:plc:")

        object.__setattr__(self, "domain", normalized_domain)
        object.__setattr__(self, "did", normalized_did)

    @property
    def atproto_record(self) -> DnsTxtRecord:
        return DnsTxtRecord(host="_atproto", value=f"did={self.did}")
