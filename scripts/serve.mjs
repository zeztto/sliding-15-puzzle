import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { createServer } from 'node:http';
import { extname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = resolve(fileURLToPath(new URL('../dist/', import.meta.url)));
const port = Number(process.env.PORT ?? 4182);
const types = { '.html':'text/html; charset=utf-8', '.js':'text/javascript; charset=utf-8', '.css':'text/css; charset=utf-8' };
const server = createServer(async (request, response) => {
  try {
    const url = new URL(request.url, 'http://127.0.0.1');
    const path = resolve(root, `.${decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname)}`);
    if (!path.startsWith(`${root.replace(/\/$/, '')}${sep}`) || !(await stat(path)).isFile()) throw new Error('missing');
    response.writeHead(200, { 'Content-Type':types[extname(path)] ?? 'application/octet-stream',
      'X-Content-Type-Options':'nosniff', 'Content-Security-Policy':"default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; object-src 'none'; frame-ancestors 'none'; base-uri 'none'", 'Cache-Control':'no-store' });
    createReadStream(path).pipe(response);
  } catch { response.writeHead(404); response.end('파일을 찾을 수 없습니다.'); }
});
server.listen(port, '127.0.0.1', () => console.log(`Preview: http://127.0.0.1:${server.address().port}`));
