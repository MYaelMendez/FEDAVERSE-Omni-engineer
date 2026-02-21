import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve('./packages/viewport');
const server = http.createServer((req, res) => {
  let file = req.url === '/' ? 'index.html' : req.url.slice(1);
  const target = path.join(root, file);
  if (!fs.existsSync(target)) { res.statusCode = 404; res.end('not found'); return; }
  res.end(fs.readFileSync(target));
});
server.listen(5173, () => console.log('Viewport at http://localhost:5173'));
