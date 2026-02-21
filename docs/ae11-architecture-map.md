# AE11 Runtime Alignment Architecture Map

## Keep
- Existing Python `forge/domains` package and tests remain as the sovereign domain-planning baseline.

## Add (new npm workspace foundation)
- `packages/runtime`: ESM-only cryptography, chain verification, DAO gate, epoch logic, PNG provenance export.
- `packages/cli`: Node `mcp` command consuming runtime.
- `packages/viewport`: Browser MVP MCP viewport.
- `packages/widget-factory`: distributive widget registry/factory package.
- `packages/terminal-adapter`: optional runtime consumer adapter.

## Move/Delete
- No destructive deletes were required in this phase; new workspace foundation is additive to preserve prior domain-agent work.

## Dependency Direction
- `runtime` is dependency root.
- `cli`, `viewport`, `widget-factory`, and `terminal-adapter` depend on `runtime` only.
- `runtime` does not import any adapter/UI/CLI package.
