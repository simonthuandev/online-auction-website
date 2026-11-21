import http from 'node:http';
import assert from 'node:assert';

// Polyfill localStorage for Node.js test environment
const memoryStorage = new Map();
globalThis.localStorage = {
  getItem: (key) => memoryStorage.get(key) || null,
  setItem: (key, val) => memoryStorage.set(key, String(val)),
  removeItem: (key) => memoryStorage.delete(key),
  clear: () => memoryStorage.clear(),
};

async function testAll() {
  console.log('====================================================');
  console.log('🧪 RUNNING COMPREHENSIVE PLATFORM VERIFICATION TEST');
  console.log('====================================================\n');

  // ----------------------------------------------------
  // Test 1: Money Utilities (src/lib/money.ts)
  // ----------------------------------------------------
  console.log('👉 [1/5] Testing Money Utilities (BigInt VND)...');
  const { formatVnd, compareVnd, addVnd, subtractVnd, multiplyVnd, isValidVnd, isPositiveVnd } =
    await import('../src/lib/money.ts');

  assert.strictEqual(formatVnd('1500000'), '1.500.000 ₫');
  assert.strictEqual(formatVnd(1500000), '1.500.000 ₫');
  assert.strictEqual(formatVnd(1500000n), '1.500.000 ₫');
  assert.strictEqual(formatVnd('9999999999999999'), '9.999.999.999.999.999 ₫');

  assert.strictEqual(compareVnd('1500000', '2000000'), -1);
  assert.strictEqual(compareVnd('2000000', '1500000'), 1);
  assert.strictEqual(compareVnd('1000', '1000'), 0);

  assert.strictEqual(addVnd('1500000', '500000'), '2000000');
  assert.strictEqual(subtractVnd('2000000', '500000'), '1500000');
  assert.strictEqual(multiplyVnd('50000', 3), '150000');

  assert.strictEqual(isValidVnd('1500000'), true);
  assert.strictEqual(isValidVnd('0'), true);
  assert.strictEqual(isValidVnd('abc'), false);
  assert.strictEqual(isValidVnd('-100'), false);
  assert.strictEqual(isValidVnd('0123'), false); // leading zero invalid per regex

  assert.strictEqual(isPositiveVnd('1500000'), true);
  assert.strictEqual(isPositiveVnd('0'), false);
  console.log('  ✅ Money utilities tests passed!\n');

  // ----------------------------------------------------
  // Test 2: Time Utilities (src/lib/time.ts)
  // ----------------------------------------------------
  console.log('👉 [2/5] Testing Time Utilities (UTC <-> GMT+7)...');
  const { toUtcIso, formatLocalTime, getRemainingMs, formatCountdown, isPast, isFuture } =
    await import('../src/lib/time.ts');

  const now = new Date();
  const utcIso = toUtcIso(now);
  assert.ok(utcIso.endsWith('Z'), 'UTC ISO must end with Z');

  const localFormatted = formatLocalTime('2026-11-21T03:00:00.000Z');
  assert.ok(localFormatted.includes('10:00:00'), '03:00:00 UTC should be 10:00:00 in GMT+7');

  const futureMs = Date.now() + 90000; // 90 seconds in future
  const remaining = getRemainingMs(new Date(futureMs));
  assert.ok(remaining > 80000 && remaining <= 90000);

  const countdown = formatCountdown(90000);
  assert.strictEqual(countdown.formatted, '00:01:30');
  assert.strictEqual(countdown.minutes, 1);
  assert.strictEqual(countdown.seconds, 30);

  const dayCountdown = formatCountdown(100000000);
  assert.ok(dayCountdown.days >= 1);
  assert.ok(dayCountdown.formatted.includes('d '));

  assert.strictEqual(isPast(new Date(Date.now() - 10000)), true);
  assert.strictEqual(isFuture(new Date(Date.now() + 10000)), true);
  console.log('  ✅ Time utilities tests passed!\n');

  // ----------------------------------------------------
  // Test 3: Idempotency Key (src/lib/idempotency.ts)
  // ----------------------------------------------------
  console.log('👉 [3/5] Testing Idempotency Key (UUID v4)...');
  const { generateIdempotencyKey } = await import('../src/lib/idempotency.ts');

  const uuid1 = generateIdempotencyKey();
  const uuid2 = generateIdempotencyKey();
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  assert.ok(uuidRegex.test(uuid1), `UUID1 format valid: ${uuid1}`);
  assert.ok(uuidRegex.test(uuid2), `UUID2 format valid: ${uuid2}`);
  assert.notStrictEqual(uuid1, uuid2, 'Consecutive UUIDs must be unique');
  console.log('  ✅ Idempotency key tests passed!\n');

  // ----------------------------------------------------
  // Test 4: Socket Singletons (src/lib/socket.ts)
  // ----------------------------------------------------
  console.log('👉 [4/5] Testing Socket Singletons & Config...');
  const { getAuctionSocket, getNotifSocket, SOCKET_AUCTION_URL, SOCKET_NOTIF_URL } =
    await import('../src/lib/socket.ts');

  assert.strictEqual(SOCKET_AUCTION_URL, 'http://localhost:3003/auctions');
  assert.strictEqual(SOCKET_NOTIF_URL, 'http://localhost:3006/notifications');

  const sockA1 = getAuctionSocket();
  const sockA2 = getAuctionSocket();
  assert.strictEqual(sockA1, sockA2, 'getAuctionSocket must return singleton');

  const sockN1 = getNotifSocket();
  const sockN2 = getNotifSocket();
  assert.strictEqual(sockN1, sockN2, 'getNotifSocket must return singleton');
  console.log('  ✅ Socket singletons tests passed!\n');

  // ----------------------------------------------------
  // Test 5: Single-Flight Refresh Token Mutex (src/api/client.ts)
  // ----------------------------------------------------
  console.log('👉 [5/5] Testing Single-Flight Refresh Token Mutex with concurrent 401s...');
  let refreshCalls = 0;
  let serverRequestsWithExpired = 0;
  let serverRequestsWithNew = 0;

  const server = http.createServer((req, res) => {
    let body = '';
    req.on('data', (c) => { body += c; });
    req.on('end', () => {
      res.setHeader('Content-Type', 'application/json');

      if (req.url === '/api/auth/refresh' && req.method === 'POST') {
        refreshCalls++;
        setTimeout(() => {
          res.writeHead(200);
          res.end(JSON.stringify({
            accessToken: 'token-after-refresh',
            refreshToken: 'token-refresh-new',
          }));
        }, 40);
        return;
      }

      if (req.url?.startsWith('/api/auction-bid')) {
        const auth = req.headers['authorization'];
        if (auth === 'Bearer token-after-refresh') {
          serverRequestsWithNew++;
          res.writeHead(200);
          res.end(JSON.stringify({ ok: true, url: req.url }));
        } else {
          serverRequestsWithExpired++;
          res.writeHead(401);
          res.end(JSON.stringify({ code: 'UNAUTHORIZED', message: 'Token expired' }));
        }
        return;
      }

      res.writeHead(404);
      res.end(JSON.stringify({ code: 'NOT_FOUND' }));
    });
  });

  await new Promise((resolve) => server.listen(9877, resolve));

  try {
    const { apiClient, setAuthCallbacks } = await import('../src/api/client.ts');
    const { tokenStorage } = await import('../src/lib/tokenStorage.ts');

    apiClient.defaults.baseURL = 'http://localhost:9877';

    let callbackRefreshedToken = '';
    setAuthCallbacks({
      onTokenRefreshed: (tok) => { callbackRefreshedToken = tok; },
    });

    tokenStorage.setTokens({
      accessToken: 'stale-token',
      refreshToken: 'valid-refresh-token',
    });

    // Fire 3 simultaneous requests
    const [res1, res2, res3] = await Promise.all([
      apiClient.get('/api/auction-bid/1'),
      apiClient.get('/api/auction-bid/2'),
      apiClient.get('/api/auction-bid/3'),
    ]);

    assert.strictEqual(refreshCalls, 1, 'Single-flight mutex must issue EXACTLY ONE refresh call');
    assert.strictEqual(serverRequestsWithExpired, 3, 'All 3 requests initially faced 401');
    assert.strictEqual(serverRequestsWithNew, 3, 'All 3 requests replayed with new token');

    assert.strictEqual(res1.data.ok, true);
    assert.strictEqual(res2.data.ok, true);
    assert.strictEqual(res3.data.ok, true);

    assert.strictEqual(tokenStorage.getAccessToken(), 'token-after-refresh');
    assert.strictEqual(callbackRefreshedToken, 'token-after-refresh');

    console.log('  ✅ Single-flight refresh token mutex test passed!\n');
  } finally {
    server.close();
  }

  console.log('====================================================');
  console.log('🎉 ALL ACCEPTANCE TESTS PASSED SUCCESSFULLY!');
  console.log('====================================================');
}

testAll().catch((err) => {
  console.error('❌ Verification failed:', err);
  process.exit(1);
});
