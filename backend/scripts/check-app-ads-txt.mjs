const imported = await import('../dist/index.js');
const app = imported.default.default ?? imported.default;

const expectedBody = 'google.com, pub-9649241407302744, DIRECT, f08c47fec0942fa0\n';
const server = app.listen(0, '127.0.0.1');

try {
  await new Promise((resolve, reject) => {
    server.once('listening', resolve);
    server.once('error', reject);
  });

  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('Could not determine test server port.');

  const response = await fetch(`http://127.0.0.1:${address.port}/app-ads.txt`);
  const body = await response.text();
  const contentType = response.headers.get('content-type');

  if (response.status !== 200) throw new Error(`Expected HTTP 200, received ${response.status}.`);
  if (response.redirected || response.url.endsWith('/app-ads.txt/') || response.headers.has('location')) {
    throw new Error('app-ads.txt must not redirect.');
  }
  if (contentType !== 'text/plain; charset=utf-8') {
    throw new Error(`Expected text/plain; charset=utf-8, received ${contentType || '(missing)'}.`);
  }
  if (body !== expectedBody) {
    throw new Error(`Unexpected app-ads.txt body: ${JSON.stringify(body)}`);
  }

  const discovery = await fetch(`http://127.0.0.1:${address.port}/`);
  const discoveryBody = await discovery.text();
  if (!discoveryBody.includes('/app-ads.txt')) {
    throw new Error('Root discovery response must list /app-ads.txt.');
  }

  console.log('app-ads.txt response check passed.');
} finally {
  await new Promise(resolve => server.close(resolve));
}
