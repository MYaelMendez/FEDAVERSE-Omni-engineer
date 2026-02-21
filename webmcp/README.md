# WebMCP Terminal Widget

A browser-based terminal UI backed by a local WebSocket gateway that bridges
to a Python tool server over stdio/NDJSON.

```
Browser (xterm.js)
    │  WebSocket (ws://127.0.0.1:8080)
    ▼
Node.js Gateway  (webmcp/gateway/server.js)
    │  stdin/stdout NDJSON
    ▼
Python Tool Server  (webmcp/gateway/tool_server.py)
    │  subprocess
    ▼
Shell command
```

---

## Quick start

### 1. Install Node.js dependencies

```bash
cd webmcp/gateway
npm install
```

### 2. Start the gateway

```bash
node webmcp/gateway/server.js
```

The gateway will:
- Listen on `ws://127.0.0.1:8080`
- Spawn `tool_server.py` automatically (requires `python3` on `PATH`)

Override the Python interpreter with the `PYTHON_CMD` environment variable:
```bash
PYTHON_CMD=python3.11 node webmcp/gateway/server.js
```

Override the port with `WEBMCP_PORT`:
```bash
WEBMCP_PORT=9090 node webmcp/gateway/server.js
```

### 3. Open the UI

Open `webmcp/widget/index.html` directly in a browser:

```bash
# macOS
open webmcp/widget/index.html

# Linux
xdg-open webmcp/widget/index.html

# Or serve it with any static file server, e.g.:
npx serve webmcp/widget
```

---

## Usage

1. Type a command in the input bar and press **Enter** or click **Run**.
2. Output streams in real time via the xterm.js terminal.
3. **Risky commands** (see governance section below) trigger a modal asking
   you to approve or abort before the command runs.

---

## Governance / approval flow

The Python tool server classifies commands against a denylist (patterns
such as `rm`, `sudo`, `chmod`, `curl | sh`, etc.).

When a risky command is submitted **without** prior approval the server
responds with:

```json
{
  "result": {
    "is_governance_required": true,
    "command": "rm -rf /tmp/test",
    "risk_score": 9,
    "risk_reason": "destructive file removal",
    "approvalToken": "<hmac-sha256-hex>"
  }
}
```

The UI shows a modal displaying the command, risk score, and reason.

- **Approve & Run** – re-sends the request with `approved: true` and the
  `approvalToken`.  The server verifies the token (HMAC-SHA256, keyed to the
  exact command string) and proceeds.
- **Abort** – discards the command.

The `approvalToken` is a per-process HMAC tied to the command string.  If the
command is altered between the governance response and the approval request,
the token will not verify and the server rejects the attempt.

---

## Request/response format

### Client → gateway → Python

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/call",
  "params": {
    "name": "terminal.run",
    "arguments": {
      "command": "echo hello",
      "approved": false
    }
  }
}
```

### Python → gateway → client (streaming notification)

```json
{
  "jsonrpc": "2.0",
  "method": "notifications/terminal/output",
  "params": { "id": 1, "chunk": "hello\n" }
}
```

### Python → gateway → client (final response)

```json
{ "jsonrpc": "2.0", "id": 1, "result": { "exitCode": 0, "done": true } }
```

---

## Security notes

| Topic | Detail |
|---|---|
| **Localhost only** | The WebSocket server binds to `127.0.0.1`.  It is not reachable from the network unless you deliberately expose it. |
| **No authentication** | The gateway has **no authentication**.  Anyone with access to `127.0.0.1:8080` can execute shell commands under your user account.  Do not run this on a shared machine without additional access controls. |
| **Approval token** | The `approvalToken` is a per-process HMAC-SHA256 keyed with a random secret generated at startup.  It cannot be forged without the secret and is tied to the exact command string. |
| **Command execution** | Commands run as the OS user that started `tool_server.py`.  There is no sandboxing beyond the governance denylist. |
| **Production use** | This is a **local development tool**.  Do not expose it to the internet. |
