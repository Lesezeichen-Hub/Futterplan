import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';

const port = Number(process.env.PORT ?? 18784);
const assets = new Map([
  ['index.html', 'text/html; charset=utf-8'], ['styles.css', 'text/css; charset=utf-8'], ['mark.svg', 'image/svg+xml'],
  ['vendor/qrcode-generator.mjs', 'text/javascript; charset=utf-8'],
  ...['app', 'storage', 'views', 'dialogs', 'model', 'species'].map(name => [`${name}.mjs`, 'text/javascript; charset=utf-8']),
]);
createServer(async (request, response) => {
  const path = new URL(request.url, 'http://localhost').pathname;
  const file = path === '/' ? 'index.html' : path.slice(1);
  if (!assets.has(file)) { response.writeHead(404).end(); return; }
  try {
    const data = await readFile(new URL(file, import.meta.url));
    response.writeHead(200, { 'Content-Type': assets.get(file), 'X-Content-Type-Options': 'nosniff' }).end(data);
  } catch { response.writeHead(500).end(); }
}).listen(port, '127.0.0.1', () => console.log(`http://127.0.0.1:${port}`));