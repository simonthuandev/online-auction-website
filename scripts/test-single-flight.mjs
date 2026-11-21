import http from 'node:http';
import assert from 'node:assert';

// Polyfill localStorage for Node.js test environment if needed
if (typeof globalThis.localStorage === 'undefined') {
  const storage = new Map();
  globalThis.localStorage = {
    getItem: (key) => storage.get(key) || null,
    setItem: (key, val) => storage.set(key, String(val)),
    removeItem: (key) => storage.delete(key),
    clear: () => storage.clear(),
  };
}

// Polyfill import.meta.env if needed
if (!globalThis.importMetaEnvConfigured) {
  process.env.VITE_API_BASE_URL = 'http://localhost:9876';
}

async function runTest() {
  console.log('🧪 Starting Single-Flight Refresh Token Simulation Test...');

  let refreshCallCount = 0;
  let dataRequestsWithExpiredToken = 0;
  let dataRequestsWithNewToken = 0;

  // 1. Setup mock server on port 9876
  const server = http.createServer((req, res) => {
    let body = '';
    req.on('data', (chunk) => { body += chunk; });
    req.on('end', () => {
      res.setHeader('Content-Type', 'application/json');

      if (req.url === '/api/auth/refresh' && req.method === 'POST') {
        refreshCallCount++;
        const parsed = JSON.parse(body || '{}');
        if (parsed.refreshToken === 'valid-refresh-token') {
          // Add small delay to simulate network latency and ensure parallel requests hit interceptor
          setTimeout(() => {
            res.writeHead(200);
            res.end(JSON.stringify({
              accessToken: 'new-valid-access-token',
              refreshToken: 'new-valid-refresh-token',
            }));
          }, 50);
          return;
        } else {
          res.writeHead(401);
          res.end(JSON.stringify({ code: 'INVALID_REFRESH_TOKEN', message: 'Refresh token invalid' }));
          return;
        }
      }

      if (req.url.startsWith('/api/test-data')) {
        const auth = req.headers['authorization'];
        if (auth === 'Bearer new-valid-access-token') {
          dataRequestsWithNewToken++;
          res.writeHead(200);
          res.end(JSON.stringify({ success: true, url: req.url, auth }));
        } else {
          dataRequestsWithExpiredToken++;
          res.writeHead(401);
          res.end(JSON.stringify({ code: 'TOKEN_EXPIRED', message: 'Access token expired' }));
        }
        return;
      }

      res.writeHead(404);
      res.end(JSON.stringify({ code: 'NOT_FOUND', message: 'Not found' }));
    });
  });

  await new Promise((resolve) => server.listen(9876, resolve));
  console.log('  ✓ Mock server listening on http://localhost:9876');

  try {
    // 2. Import modules
    const { apiClient } = await import('../src/api/client.ts');
    const { tokenStorage } = await import('../src/lib/tokenStorage.ts');

    apiClient.defaults.baseURL = 'http://localhost:9876';

    // Seed expired access token and valid refresh token
    tokenStorage.setTokens({
      accessToken: 'expired-access-token',
      refreshToken: 'valid-refresh-token',
    });

    console.log('  ✓ Seeded expired access token & valid refresh token');
    console.log('  🚀 Firing 3 parallel GET requests with expired token...');

    // 3. Fire 3 concurrent requests simultaneously
    const [res1, res2, res3] = await Promise.all([
      apiClient.get('/api/test-data/item-1'),
      apiClient.get('/api/test-data/item-2'),
      apiClient.get('/api/test-data/item-3'),
    ]);

    // 4. Assertions
    console.log('  📊 Evaluating assertions:');
    console.log(`    - refreshCallCount: ${refreshCallCount} (expected: 1)`);
    console.log(`    - dataRequestsWithExpiredToken: ${dataRequestsWithExpiredToken} (expected: 3)`);
    console.log(`    - dataRequestsWithNewToken: ${dataRequestsWithNewToken} (expected: 3)`);

    assert.strictEqual(refreshCallCount, 1, 'Only 1 refresh request should be issued!');
    assert.strictEqual(dataRequestsWithExpiredToken, 3, 'All 3 requests initially got 401');
    assert.strictEqual(dataRequestsWithNewToken, 3, 'All 3 requests replayed successfully with new token');

    assert.strictEqual(res1.data.success, true);
    assert.strictEqual(res2.data.success, true);
    assert.strictEqual(res3.data.success, true);

    assert.strictEqual(res1.data.auth, 'Bearer new-valid-access-token');
    assert.strictEqual(res2.data.auth, 'Bearer new-valid-access-token');
    assert.strictEqual(res3.data.auth, 'Bearer new-valid-access-token');

    assert.strictEqual(tokenStorage.getAccessToken(), 'new-valid-access-token');
    assert.strictEqual(tokenStorage.getRefreshToken(), 'new-valid-refresh-token');

    console.log('  ✅ SUCCESS: Single-Flight Refresh Token passed! Only 1 refresh request was made for 3 concurrent 401s, and all requests replayed seamlessly.');
  } finally {
    server.close();
  }
}

runTest().catch((err) => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
