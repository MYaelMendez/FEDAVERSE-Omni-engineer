#!/usr/bin/env python3
"""
WebMCP Python Tool Server
=========================
Reads JSON-RPC 2.0 requests from stdin (one per line, NDJSON) and writes
JSON-RPC 2.0 responses/notifications to stdout (one per line, NDJSON).

Supported method: tools/call
Supported tool:   terminal.run

Governance
----------
Risky commands are identified by a built-in denylist.  When a risky command
is received without approval the server replies with:
  { result: { is_governance_required: true, command, risk_score, risk_reason,
              approvalToken } }
The client must re-send the request with { approved: true, approvalToken } to
proceed.  The token is a HMAC-SHA256 digest of the command string so that
the approved command cannot silently differ from the one the user approved.
"""

import hashlib
import hmac
import json
import os
import re
import subprocess
import sys
import threading

# ---------------------------------------------------------------------------
# Governance helpers
# ---------------------------------------------------------------------------

# Secret used to sign approval tokens – random per process start.
_TOKEN_SECRET = os.urandom(32)

# Denylist: (pattern, risk_score, human-readable reason)
_DENYLIST = [
    (r"\brm\b", 9, "destructive file removal"),
    (r"\bsudo\b", 10, "privilege escalation"),
    (r"\bchmod\b", 7, "permission change"),
    (r"\bchown\b", 7, "ownership change"),
    (r"\bmkfs\b", 10, "filesystem format"),
    (r"\bdd\b", 9, "low-level disk write"),
    (r"curl\b.*\|\s*(ba)?sh\b", 10, "remote code execution via pipe"),
    (r"wget\b.*\|\s*(ba)?sh\b", 10, "remote code execution via pipe"),
    (r"\bmv\b.*\s/[a-zA-Z]", 6, "move to system path"),
    (r"\bkill\b", 6, "process termination"),
    (r"\bshutdown\b", 10, "system shutdown"),
    (r"\breboot\b", 10, "system reboot"),
    (r"\bpkill\b", 6, "process kill"),
    (r"\biptables\b", 8, "firewall modification"),
    (r"\bcrontab\b", 7, "scheduled task modification"),
]


def _assess_risk(command: str):
    """Return (risk_score, risk_reason) or (0, None) if command is safe."""
    for pattern, score, reason in _DENYLIST:
        if re.search(pattern, command):
            return score, reason
    return 0, None


def _make_token(command: str) -> str:
    return hmac.new(_TOKEN_SECRET, command.encode(), hashlib.sha256).hexdigest()


def _verify_token(command: str, token: str) -> bool:
    expected = _make_token(command)
    return hmac.compare_digest(expected, token)


# ---------------------------------------------------------------------------
# Output helpers
# ---------------------------------------------------------------------------

_stdout_lock = threading.Lock()


def _emit(obj: dict) -> None:
    """Write a single NDJSON line to stdout."""
    with _stdout_lock:
        sys.stdout.write(json.dumps(obj) + "\n")
        sys.stdout.flush()


def _notify(request_id, chunk: str) -> None:
    _emit(
        {
            "jsonrpc": "2.0",
            "method": "notifications/terminal/output",
            "params": {"id": request_id, "chunk": chunk},
        }
    )


def _respond(request_id, result=None, error=None) -> None:
    msg = {"jsonrpc": "2.0", "id": request_id}
    if error is not None:
        msg["error"] = error
    else:
        msg["result"] = result
    _emit(msg)


# ---------------------------------------------------------------------------
# Tool: terminal.run
# ---------------------------------------------------------------------------

def _handle_terminal_run(request_id, args: dict) -> None:
    command = args.get("command", "").strip()
    approved = args.get("approved", False)
    approval_token = args.get("approvalToken", "")

    if not command:
        _respond(
            request_id,
            error={"code": -32602, "message": "Missing required argument: command"},
        )
        return

    risk_score, risk_reason = _assess_risk(command)

    if risk_score > 0 and not approved:
        token = _make_token(command)
        _respond(
            request_id,
            result={
                "is_governance_required": True,
                "command": command,
                "risk_score": risk_score,
                "risk_reason": risk_reason,
                "approvalToken": token,
            },
        )
        return

    if risk_score > 0 and approved:
        if not approval_token or not _verify_token(command, approval_token):
            _respond(
                request_id,
                error={"code": -32603, "message": "Invalid or missing approvalToken"},
            )
            return

    # Run the command and stream output as notifications.
    try:
        proc = subprocess.Popen(
            command,
            shell=True,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True,
        )
    except Exception as exc:
        _respond(
            request_id,
            error={"code": -32603, "message": f"Failed to spawn process: {exc}"},
        )
        return

    # Stream stdout+stderr line-by-line.
    assert proc.stdout is not None
    for line in proc.stdout:
        _notify(request_id, line)

    proc.wait()
    _respond(
        request_id,
        result={"exitCode": proc.returncode, "done": True},
    )


# ---------------------------------------------------------------------------
# Dispatch
# ---------------------------------------------------------------------------

def _dispatch(request: dict) -> None:
    request_id = request.get("id")
    method = request.get("method", "")
    params = request.get("params", {})

    if method != "tools/call":
        _respond(
            request_id,
            error={"code": -32601, "message": f"Method not found: {method}"},
        )
        return

    tool_name = params.get("name", "")
    arguments = params.get("arguments", {})

    if tool_name == "terminal.run":
        t = threading.Thread(
            target=_handle_terminal_run,
            args=(request_id, arguments),
            daemon=True,
        )
        t.start()
    else:
        _respond(
            request_id,
            error={"code": -32601, "message": f"Unknown tool: {tool_name}"},
        )


# ---------------------------------------------------------------------------
# Main loop
# ---------------------------------------------------------------------------

def main() -> None:
    for raw_line in sys.stdin:
        raw_line = raw_line.strip()
        if not raw_line:
            continue
        try:
            request = json.loads(raw_line)
        except json.JSONDecodeError as exc:
            _emit(
                {
                    "jsonrpc": "2.0",
                    "id": None,
                    "error": {"code": -32700, "message": f"Parse error: {exc}"},
                }
            )
            continue
        _dispatch(request)


if __name__ == "__main__":
    main()
