import { createReadStream } from 'node:fs';
import { realpath, stat } from 'node:fs/promises';
import { createServer } from 'node:http';
import { dirname, extname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const documentRoot = await realpath(join(projectRoot, 'dist'));
const port = Number(process.env.PORT || 4173);
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new RangeError('PORT must be an integer from 1 to 65535.');

const mimeTypes = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.gif': 'image/gif',
  '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.woff2': 'font/woff2'
};

function insideRoot(candidate) {
  const path = relative(documentRoot, candidate);
  return path === '' || (!isAbsolute(path) && path !== '..' && !path.startsWith(`..${sep}`));
}

function reply(response, status, message) {
  response.writeHead(status, { 'Content-Type': 'text/plain; charset=utf-8' });
  response.end(message);
}

const server = createServer(async (request, response) => {
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    response.setHeader('Allow', 'GET, HEAD');
    return reply(response, 405, 'Method not allowed.');
  }
  let pathname;
  try {
    pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
  } catch {
    return reply(response, 400, 'Invalid URL.');
  }
  if (pathname.includes('\0') || pathname.split(/[\\/]/).some(segment => segment.startsWith('.'))) {
    return reply(response, 404, 'Not found.');
  }
  try {
    let candidate = resolve(documentRoot, `.${pathname}`);
    if (!insideRoot(candidate)) return reply(response, 404, 'Not found.');
    let information = await stat(candidate);
    if (information.isDirectory()) candidate = join(candidate, 'index.html');
    const file = await realpath(candidate);
    if (!insideRoot(file)) return reply(response, 404, 'Not found.');
    information = await stat(file);
    if (!information.isFile()) return reply(response, 404, 'Not found.');
    response.writeHead(200, {
      'Content-Type': mimeTypes[extname(file).toLowerCase()] || 'application/octet-stream',
      'Content-Length': information.size,
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff'
    });
    if (request.method === 'HEAD') return response.end();
    const stream = createReadStream(file);
    stream.on('error', () => response.destroy());
    stream.pipe(response);
  } catch {
    reply(response, 404, 'Not found.');
  }
});

server.on('error', error => {
  console.error(`Unable to start local server: ${error.message}`);
  process.exitCode = 1;
});
server.listen(port, '127.0.0.1', () => console.log(`Open http://127.0.0.1:${port} (serving dist/)`));
