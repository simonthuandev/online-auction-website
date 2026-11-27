import http from 'node:http';
import assert from 'node:assert';

// Polyfill minimal browser globals for testing
globalThis.localStorage = {
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {},
  clear: () => {},
};

async function testSellerAuctionModule() {
  console.log('====================================================');
  console.log('🧪 RUNNING SELLER CREATE AUCTION TEST SUITE [WEB-AUC-03]');
  console.log('====================================================\n');

  const {
    validateAuctionPrices,
    validateAuctionTime,
    formatDatetimeLocal,
    shouldPollAuctionStatus,
  } = await import('../src/features/auctions/utils/auctionHelpers.ts');

  const { generateIdempotencyKey } = await import('../src/lib/idempotency.ts');

  // ----------------------------------------------------
  // Test 1: Price Validation (startingPrice > 0, bidIncrement > 0)
  // ----------------------------------------------------
  console.log('👉 [1/6] Testing Auction Price Validation (VND BigInt)...');

  // Valid prices
  const validPrices = validateAuctionPrices('1000000', '50000');
  assert.strictEqual(validPrices.isValid, true);

  // Negative starting price
  const negativeStart = validateAuctionPrices('-500', '50000');
  assert.strictEqual(negativeStart.isValid, false);

  // Zero starting price (must be strictly > 0)
  const zeroStart = validateAuctionPrices('0', '50000');
  assert.strictEqual(zeroStart.isValid, false);

  // Zero bid increment
  const zeroIncrement = validateAuctionPrices('1000000', '0');
  assert.strictEqual(zeroIncrement.isValid, false);

  // Floating point or invalid string
  const floatPrice = validateAuctionPrices('1000.5', '50000');
  assert.strictEqual(floatPrice.isValid, false);
  console.log('  ✅ Auction price validation passed!\n');

  // ----------------------------------------------------
  // Test 2: Time Validation (startTime >= now, endTime > startTime)
  // ----------------------------------------------------
  console.log('👉 [2/6] Testing Auction Time Validation (ISO UTC & Schedule)...');

  const nowMs = Date.now();
  const futureStart = new Date(nowMs + 60 * 1000); // +1 min
  const futureEnd = new Date(nowMs + 3600 * 1000); // +1 hour

  // Valid schedule
  const validTimes = validateAuctionTime(futureStart, futureEnd, nowMs);
  assert.strictEqual(validTimes.isValid, true);

  // Start time in past (older than 30s tolerance)
  const pastStart = new Date(nowMs - 120 * 1000);
  const invalidPastStart = validateAuctionTime(pastStart, futureEnd, nowMs);
  assert.strictEqual(invalidPastStart.isValid, false);
  assert(invalidPastStart.error?.includes('thời điểm hiện tại'));

  // End time before start time
  const invalidOrderTimes = validateAuctionTime(futureEnd, futureStart, nowMs);
  assert.strictEqual(invalidOrderTimes.isValid, false);
  assert(invalidOrderTimes.error?.includes('sau thời gian bắt đầu'));

  // Equal start and end time
  const equalTimes = validateAuctionTime(futureStart, futureStart, nowMs);
  assert.strictEqual(equalTimes.isValid, false);
  console.log('  ✅ Auction time validation passed!\n');

  // ----------------------------------------------------
  // Test 3: Datetime Local Formatter (YYYY-MM-DDTHH:mm)
  // ----------------------------------------------------
  console.log('👉 [3/6] Testing Datetime-local Formatter...');
  const testDate = new Date('2026-11-27T15:30:00');
  const formatted = formatDatetimeLocal(testDate);
  assert(/^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}$/.test(formatted));
  console.log('  ✅ Datetime-local formatting passed!\n');

  // ----------------------------------------------------
  // Test 4: Polling Status Predicate (INITIALIZING -> 2s, others -> stop)
  // ----------------------------------------------------
  console.log('👉 [4/6] Testing 2s Polling Predicate for INITIALIZING...');
  assert.strictEqual(shouldPollAuctionStatus('INITIALIZING'), true);
  assert.strictEqual(shouldPollAuctionStatus('PENDING'), false);
  assert.strictEqual(shouldPollAuctionStatus('ACTIVE'), false);
  assert.strictEqual(shouldPollAuctionStatus('CANCELLED'), false);
  assert.strictEqual(shouldPollAuctionStatus('ENDED'), false);
  assert.strictEqual(shouldPollAuctionStatus(undefined), false);
  console.log('  ✅ Polling predicate passed!\n');

  // ----------------------------------------------------
  // Test 5: Idempotency Key Anti Double-Click Properties
  // ----------------------------------------------------
  console.log('👉 [5/6] Testing Idempotency Key Generation...');
  const key1 = generateIdempotencyKey();
  const key2 = generateIdempotencyKey();
  assert(typeof key1 === 'string' && key1.length >= 8 && key1.length <= 128);
  assert.notStrictEqual(key1, key2);
  console.log('  ✅ Idempotency Key passed!\n');

  // ----------------------------------------------------
  // Test 6: API Client createAuction (202 Accepted) & Polling Flow
  // ----------------------------------------------------
  console.log('👉 [6/6] Testing createAuction (202 Accepted) & Initializing Lifecycle...');

  let receivedHeaders = {};
  let receivedBody = {};
  let getAuctionCallCount = 0;

  const server = http.createServer((req, res) => {
    const url = new URL(req.url, `http://${req.headers.host}`);
    res.setHeader('Content-Type', 'application/json');

    // POST /api/auctions
    if (url.pathname === '/api/auctions' && req.method === 'POST') {
      receivedHeaders = req.headers;
      let bodyData = '';
      req.on('data', (chunk) => {
        bodyData += chunk;
      });
      req.on('end', () => {
        receivedBody = JSON.parse(bodyData);
        res.writeHead(202);
        res.end(
          JSON.stringify({
            id: 'auc-init-999',
            productId: receivedBody.productId,
            sellerId: 'user-seller-1',
            productTitle: 'MacBook Pro M3 Max',
            productThumbnail: null,
            startingPrice: receivedBody.startingPrice,
            currentPrice: receivedBody.startingPrice,
            bidIncrement: receivedBody.bidIncrement,
            currency: 'VND',
            startTime: receivedBody.startTime,
            endTime: receivedBody.endTime,
            status: 'INITIALIZING', // 202 Accepted Initializing
            version: 1,
            winnerId: null,
            finalPrice: null,
          })
        );
      });
      return;
    }

    // GET /api/auctions/{id}
    if (url.pathname === '/api/auctions/auc-init-999' && req.method === 'GET') {
      getAuctionCallCount++;
      // Lifecycle simulation:
      // Call 1: INITIALIZING
      // Call 2: PENDING (worker finished product reservation)
      const currentStatus = getAuctionCallCount === 1 ? 'INITIALIZING' : 'PENDING';
      res.writeHead(200);
      res.end(
        JSON.stringify({
          id: 'auc-init-999',
          productId: 'prod-uuid-123',
          sellerId: 'user-seller-1',
          productTitle: 'MacBook Pro M3 Max',
          productThumbnail: null,
          startingPrice: '20000000',
          currentPrice: '20000000',
          bidIncrement: '500000',
          currency: 'VND',
          startTime: new Date(Date.now() + 60000).toISOString(),
          endTime: new Date(Date.now() + 3600000).toISOString(),
          status: currentStatus,
          version: getAuctionCallCount === 1 ? 1 : 2,
          winnerId: null,
          finalPrice: null,
        })
      );
      return;
    }

    res.writeHead(404);
    res.end(JSON.stringify({ code: 'NOT_FOUND', message: 'Not found' }));
  });

  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  const testBaseUrl = `http://127.0.0.1:${address.port}`;

  const { apiClient } = await import('../src/api/client.ts');
  apiClient.defaults.baseURL = testBaseUrl;

  const { auctionApi } = await import('../src/api/auction.api.ts');

  try {
    const testIdempotencyKey = 'uuid-v4-create-auction-key-1234';
    const inputPayload = {
      productId: 'prod-uuid-123',
      startingPrice: '20000000',
      bidIncrement: '500000',
      startTime: new Date(Date.now() + 60000).toISOString(),
      endTime: new Date(Date.now() + 3600000).toISOString(),
    };

    // 6.1 Create Auction returns 202 INITIALIZING
    const created = await auctionApi.createAuction(inputPayload, testIdempotencyKey);
    assert.strictEqual(created.id, 'auc-init-999');
    assert.strictEqual(created.status, 'INITIALIZING');
    assert.strictEqual(
      receivedHeaders['idempotency-key'],
      testIdempotencyKey,
      'Idempotency-Key header must be sent with POST /api/auctions'
    );
    assert.strictEqual(receivedBody.productId, 'prod-uuid-123');

    // 6.2 Polling flow: First poll returns INITIALIZING
    const poll1 = await auctionApi.getAuction('auc-init-999');
    assert.strictEqual(poll1.status, 'INITIALIZING');
    assert.strictEqual(shouldPollAuctionStatus(poll1.status), true);

    // 6.3 Second poll returns transition to PENDING (polling stops)
    const poll2 = await auctionApi.getAuction('auc-init-999');
    assert.strictEqual(poll2.status, 'PENDING');
    assert.strictEqual(shouldPollAuctionStatus(poll2.status), false);

    console.log('  ✅ createAuction & INITIALIZING -> PENDING lifecycle verified!\n');
  } finally {
    server.close();
  }

  console.log('====================================================');
  console.log('🎉 ALL SELLER AUCTION TESTS PASSED! [WEB-AUC-03]');
  console.log('====================================================\n');
}

testSellerAuctionModule().catch((err) => {
  console.error('\n❌ SELLER AUCTION MODULE TEST SUITE FAILED:', err);
  process.exit(1);
});
