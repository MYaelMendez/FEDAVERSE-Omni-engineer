# DomainAgent First Step: DNS Planning Core

This repo now includes a `forge.domains` scaffold as the first implementation step for the Sovereign Gateway onboarding flow.

## What this enables now

- A canonical `DomainVerificationRequest` object that turns a `did:plc:...` value into an `_atproto` TXT record.
- A deterministic `NamecheapDnsPlanner.merge_records(...)` function that removes conflicting `_atproto` entries and appends the desired value.
- A clean seam for the next milestone: adding OAuth-backed Namecheap transport calls without rewriting onboarding logic.

## Why this is the best first step

It isolates core domain-verification logic from network dependencies. That gives us:

1. Unit-testable behavior immediately.
2. Safer rollout before touching real DNS records.
3. A stable contract the UI/OAuth flow can already integrate against.

## Next implementation tasks

1. Add Namecheap API transport client and wire planner output into `domains.dns.setHosts` requests.
2. Add DNS propagation polling against public resolvers.
3. Expose orchestration endpoints in FastAPI for the onboarding agent.
