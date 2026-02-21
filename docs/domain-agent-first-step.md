# DomainAgent First Step: DNS Planning Core

This repo now includes a `forge.domains` scaffold as the first implementation step for the Sovereign Gateway onboarding flow.

## The first step to bring the agent to life

Implement the **deterministic DNS planning core** first, before OAuth or live registrar writes.

That means:

1. Accept a `domain + did:plc` verification request.
2. Compute the exact `_atproto` TXT record target (`did=did:plc:...`).
3. Merge it against existing DNS records by removing conflicting `_atproto` values while preserving unrelated records.
4. Return a reviewable before/after plan object.

This is the highest-leverage first step because it creates a stable contract for every later phase (OAuth, API transport, polling, and UI) without risking accidental DNS mutations.

## What this enables now

- A canonical `DomainVerificationRequest` object that turns a `did:plc:...` value into an `_atproto` TXT record.
- A deterministic `NamecheapDnsPlanner.merge_records(...)` function that removes conflicting `_atproto` entries and appends the desired value.
- A `DomainAgent.build_plan(...)` orchestration seam that returns a full before/after DNS plan for safe review before API writes.
- A `DomainAgent.first_step(...)` helper that accepts raw onboarding inputs (`domain`, `did`, and existing TXT records) and returns the same deterministic plan in one call.
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
