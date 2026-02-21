#!/usr/bin/env node
/**
 * WebMCP Gateway – server.js
 * ==========================
 * Starts a WebSocket server on ws://127.0.0.1:8080 and spawns
 * webmcp/gateway/tool_server.py as a child process.
 *
 * Protocol
 * --------
 * WS clients send JSON-RPC 2.0 messages (stringified JSON).
 * The gateway forwards them to the Python tool server over stdin (NDJSON).
 * The Python tool server replies on stdout (NDJSON).
 * The gateway routes each reply back to the correct WS client:
 *   - Messages with a top-level `id` are routed by that id.
 *   - Notifications that carry `params.id` are routed by params.id.
 *
 * Security
 * --------
 * The WebSocket server binds to 127.0.0.1 (loopback) only, so it is NOT
 * reachable from the network.  See README.md for details.
 */

"use strict";

const { WebSocketServer, WebSocket } = require("ws");
const { spawn } = require("child_process");
const path = require("path");
const readline = require("readline");

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const HOST = "127.0.0.1";
const PORT = parseInt(process.env.WEBMCP_PORT || "8080", 10);
const TOOL_SERVER = path.join(__dirname, "tool_server.py");
const PYTHON = process.env.PYTHON_CMD || "python3";

// ---------------------------------------------------------------------------
// Routing table  requestId -> WebSocket
// ---------------------------------------------------------------------------

/** @type {Map<string|number, import('ws').WebSocket>} */
const routeMap = new Map();

// ---------------------------------------------------------------------------
// Spawn Python tool server
// ---------------------------------------------------------------------------

const pythonProc = spawn(PYTHON, [TOOL_SERVER], {
  stdio: ["pipe", "pipe", "inherit"], // stdin writeable, stdout readable, stderr inherited
});

pythonProc.on("error", (err) => {
  console.error("[gateway] Failed to spawn tool server:", err.message);
  process.exit(1);
});

pythonProc.on("close", (code) => {
  console.warn("[gateway] Tool server exited with code", code);
});

// Read NDJSON lines from Python stdout and route to the correct WS client.
const rl = readline.createInterface({ input: pythonProc.stdout, crlfDelay: Infinity });

rl.on("line", (line) => {
  line = line.trim();
  if (!line) return;

  let msg;
  try {
    msg = JSON.parse(line);
  } catch (e) {
    console.error("[gateway] Failed to parse line from tool server:", line);
    return;
  }

  // Determine routing key.
  let routeKey = null;
  if (msg.id !== undefined && msg.id !== null) {
    routeKey = msg.id;
  } else if (msg.params && msg.params.id !== undefined && msg.params.id !== null) {
    routeKey = msg.params.id;
  }

  if (routeKey === null) {
    // No routing key – broadcast to all connected clients.
    wss.clients.forEach((ws) => {
      if (ws.readyState === WebSocket.OPEN) ws.send(line);
    });
    return;
  }

  const ws = routeMap.get(routeKey);
  if (!ws || ws.readyState !== WebSocket.OPEN) {
    // Client gone; clean up.
    routeMap.delete(routeKey);
    return;
  }

  // If this is a final response (has `result` or `error` but NOT a notification),
  // remove the route entry after delivery.
  const isFinalResponse =
    (msg.result !== undefined || msg.error !== undefined) &&
    msg.method === undefined;

  ws.send(line);

  if (isFinalResponse) {
    routeMap.delete(routeKey);
  }
});

// ---------------------------------------------------------------------------
// WebSocket server
// ---------------------------------------------------------------------------

const wss = new WebSocketServer({ host: HOST, port: PORT });

wss.on("listening", () => {
  console.log(`[gateway] WebSocket server listening on ws://${HOST}:${PORT}`);
});

wss.on("connection", (ws, req) => {
  const clientAddr = req.socket.remoteAddress;
  console.log(`[gateway] Client connected from ${clientAddr}`);

  ws.on("message", (data) => {
    let raw;
    try {
      raw = data.toString("utf8");
    } catch {
      return;
    }

    let msg;
    try {
      msg = JSON.parse(raw);
    } catch (e) {
      ws.send(
        JSON.stringify({
          jsonrpc: "2.0",
          id: null,
          error: { code: -32700, message: "Parse error" },
        })
      );
      return;
    }

    // Register route for this request id before forwarding.
    if (msg.id !== undefined && msg.id !== null) {
      routeMap.set(msg.id, ws);
    }

    // Forward to Python tool server.
    pythonProc.stdin.write(JSON.stringify(msg) + "\n");
  });

  ws.on("close", () => {
    console.log(`[gateway] Client disconnected from ${clientAddr}`);
    // Remove all route entries that pointed to this socket.
    for (const [key, sock] of routeMap) {
      if (sock === ws) routeMap.delete(key);
    }
  });

  ws.on("error", (err) => {
    console.error(`[gateway] WS error from ${clientAddr}:`, err.message);
  });
});

wss.on("error", (err) => {
  console.error("[gateway] Server error:", err.message);
  process.exit(1);
});

// Graceful shutdown.
process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);

function shutdown() {
  console.log("[gateway] Shutting down…");
  wss.close();
  pythonProc.kill();
  process.exit(0);
}
