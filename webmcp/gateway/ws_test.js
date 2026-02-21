const WebSocket = require('ws');
const ws = new WebSocket('ws://127.0.0.1:8080');
const msgs = [];

ws.on('open', () => {
  ws.send(JSON.stringify({
    jsonrpc: '2.0', id: 1, method: 'tools/call',
    params: { name: 'terminal.run', arguments: { command: 'echo hello_gateway' } }
  }));
});

ws.on('message', (data) => {
  const msg = JSON.parse(data);
  msgs.push(msg);
  if (msg.id === 1 && msg.result && msg.result.done) {
    console.log('All messages:', JSON.stringify(msgs, null, 2));
    ws.close();
    process.exit(0);
  }
});

ws.on('error', (e) => { console.error('WS error:', e.message); process.exit(1); });
setTimeout(() => { console.error('Timeout'); process.exit(1); }, 5000);
