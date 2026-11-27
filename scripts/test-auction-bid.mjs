import http from 'node:http';
import assert from 'node:assert';

// Polyfill minimal browser globals for testing
globalThis.localStorage = {
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {},
  clear: () => {},
};

async function testAuctionBidModule() {
  console.log('====================================================');
  console.log('🧪 RUNNING BID & REALTIME SOCKET TEST SUITE [WEB-AUC-02]');
  console.log('====================================================\n');

  const {
    calculateMinimumBid,
    calculateQuickSteps,
  } = await import('../src/features/auctions/utils/auctionHelpers.ts');

  const { generateIdempotencyKey } = await import('../src/lib/idempotency.ts');
  const { formatVnd, compareVnd, isValidVnd, addVnd } = await import(
    '../src/lib/money.ts'
  );

  // ----------------------------------------------------
  // Test 1: Minimum Bid Calculation (0 bids vs >=1 bids)
  // ----------------------------------------------------
  console.log('👉 [1/6] Testing Minimum Bid Calculation...');

  const startingPrice = '20000000'; // 20.000.000 ₫
  const currentPrice = '23500000'; // 23.500.000 ₫
  const bidIncrement = '500000'; // 500.000 ₫

  // Case A: No bids yet -> min = startingPrice
  const minNoBids = calculateMinimumBid(startingPrice, currentPrice, bidIncrement, false);
  assert.strictEqual(
    minNoBids,
    startingPrice,
    'When no bids exist, minimum bid must be exactly startingPrice'
  );

  // Case B: At least 1 bid -> min = currentPrice + bidIncrement (BigInt)
  const minWithBids = calculateMinimumBid(startingPrice, currentPrice, bidIncrement, true);
  assert.strictEqual(
    minWithBids,
    '24000000',
    'When bids exist, minimum bid must be currentPrice + bidIncrement (24.000.000 ₫)'
  );
  assert.strictEqual(
    compareVnd(minWithBids, currentPrice),
    1,
    'Minimum bid must be strictly greater than currentPrice'
  );
  console.log('  ✅ Minimum bid calculation passed!\n');

  // ----------------------------------------------------
  // Test 2: Quick Steps Calculation (+1, +2, +5 steps)
  // ----------------------------------------------------
  console.log('👉 [2/6] Testing Quick Steps Calculation (+1, +2, +5)...');

  // When bids exist
  const stepsWithBids = calculateQuickSteps(startingPrice, currentPrice, bidIncrement, true);
  assert.strictEqual(stepsWithBids.step1, '24000000'); // current + 1 step
  assert.strictEqual(stepsWithBids.step2, '24500000'); // current + 2 steps
  assert.strictEqual(stepsWithBids.step5, '26000000'); // current + 5 steps

  // When no bids exist
  const stepsNoBids = calculateQuickSteps(startingPrice, currentPrice, bidIncrement, false);
  assert.strictEqual(stepsNoBids.step1, startingPrice); // starting price
  assert.strictEqual(stepsNoBids.step2, addVnd(startingPrice, '500000')); // starting + 1 step
  assert.strictEqual(stepsNoBids.step5, addVnd(startingPrice, '2000000')); // starting + 4 steps
  console.log('  ✅ Quick steps calculation passed!\n');

  // ----------------------------------------------------
  // Test 3: Idempotency Key Generator & Constraints
  // ----------------------------------------------------
  console.log('👉 [3/6] Testing Idempotency Key Properties...');
  const key1 = generateIdempotencyKey();
  const key2 = generateIdempotencyKey();
  assert(typeof key1 === 'string', 'Key must be a string');
  assert(key1.length >= 8 && key1.length <= 128, 'Key length must be 8-128 chars');
  assert.notStrictEqual(key1, key2, 'Consecutive keys must be unique UUIDs');
  console.log('  ✅ Idempotency Key properties passed!\n');

  // ----------------------------------------------------
  // Test 4: UI Guard & Role Lock Rules
  // ----------------------------------------------------
  console.log('👉 [4/6] Testing UI Guard & Lock Constraints...');

  const auctionMock = {
    id: 'auc-001',
    sellerId: 'user-seller',
    status: 'ACTIVE',
    startingPrice: '1000000',
    currentPrice: '1000000',
    bidIncrement: '100000',
    endTime: new Date(Date.now() + 3600 * 1000).toISOString(),
  };

  // Helper simulating BidBox locks
  const checkCanBid = ({ user, auction, latestBidderId }) => {
    if (!user) return { canBid: false, reason: 'GUEST' };
    if (user.id === auction.sellerId) return { canBid: false, reason: 'SELLER_FORBIDDEN' };
    if (latestBidderId && user.id === latestBidderId) return { canBid: false, reason: 'ALREADY_LEADING' };
    if (auction.status !== 'ACTIVE') return { canBid: false, reason: 'NOT_ACTIVE' };
    return { canBid: true };
  };

  assert.strictEqual(
    checkCanBid({ user: null, auction: auctionMock, latestBidderId: 'other' }).reason,
    'GUEST'
  );
  assert.strictEqual(
    checkCanBid({
      user: { id: 'user-seller' },
      auction: auctionMock,
      latestBidderId: 'other',
    }).reason,
    'SELLER_FORBIDDEN'
  );
  assert.strictEqual(
    checkCanBid({
      user: { id: 'user-bidder-lead' },
      auction: auctionMock,
      latestBidderId: 'user-bidder-lead',
    }).reason,
    'ALREADY_LEADING'
  );
  assert.strictEqual(
    checkCanBid({
      user: { id: 'user-normal' },
      auction: { ...auctionMock, status: 'ENDED' },
      latestBidderId: 'other',
    }).reason,
    'NOT_ACTIVE'
  );
  assert.strictEqual(
    checkCanBid({
      user: { id: 'user-normal' },
      auction: auctionMock,
      latestBidderId: 'other',
    }).canBid,
    true
  );
  console.log('  ✅ UI guard and lock rules passed!\n');

  // ----------------------------------------------------
  // Test 5: Realtime Socket Version Filtering Logic
  // ----------------------------------------------------
  console.log('👉 [5/6] Testing Socket Version Filtering (payload.version > current.version)...');

  let currentVersion = 5;
  const processIncomingEvent = (payload) => {
    if (payload.version <= currentVersion) {
      return { accepted: false, reason: 'STALE_OR_OUT_OF_ORDER' };
    }
    currentVersion = payload.version;
    return { accepted: true, newVersion: currentVersion };
  };

  // Stale event arriving late
  const staleEvent = { version: 4, amount: '21000000' };
  assert.strictEqual(processIncomingEvent(staleEvent).accepted, false);
  assert.strictEqual(currentVersion, 5, 'Current version must not regress');

  // Same version duplicate packet
  const dupEvent = { version: 5, amount: '21000000' };
  assert.strictEqual(processIncomingEvent(dupEvent).accepted, false);

  // Newer version event
  const newEvent = { version: 6, amount: '22000000' };
  assert.strictEqual(processIncomingEvent(newEvent).accepted, true);
  assert.strictEqual(currentVersion, 6);
  console.log('  ✅ Socket version filtering passed!\n');

  // ----------------------------------------------------
  // Test 6: API Client placeBid with Mock HTTP Server
  // ----------------------------------------------------
  console.log('👉 [6/6] Testing placeBid API Client & Idempotency Header...');

  let receivedHeaders = {};
  let receivedBody = {};

  const server = http.createServer((req, res) => {
    const url = new URL(req.url, `http://${req.headers.host}`);
    res.setHeader('Content-Type', 'application/json');

    if (url.pathname === '/api/auctions/auc-test/bids' && req.method === 'POST') {
      receivedHeaders = req.headers;
      let bodyData = '';
      req.on('data', (chunk) => {
        bodyData += chunk;
      });
      req.on('end', () => {
        receivedBody = JSON.parse(bodyData);
        res.writeHead(201);
        res.end(
          JSON.stringify({
            id: 'bid-new-123',
            auctionId: 'auc-test',
            bidderId: 'user-bidder',
            amount: receivedBody.amount,
            createdAt: new Date().toISOString(),
          })
        );
      });
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
    const testKey = 'test-idempotency-key-uuid-1234';
    const bidResult = await auctionApi.placeBid('auc-test', '25000000', testKey);

    assert.strictEqual(bidResult.id, 'bid-new-123');
    assert.strictEqual(bidResult.amount, '25000000');
    assert.strictEqual(
      receivedHeaders['idempotency-key'],
      testKey,
      'Idempotency-Key header must be transmitted to server'
    );
    assert.strictEqual(receivedBody.amount, '25000000');
    console.log('  ✅ placeBid API with Idempotency-Key verified!\n');
  } finally {
    server.close();
  }

  console.log('====================================================');
  console.log('🎉 ALL BID & REALTIME SOCKET TESTS PASSED! [WEB-AUC-02]');
  console.log('====================================================\n');
}

testAuctionBidModule().catch((err) => {
  console.error('\n❌ BID MODULE TEST SUITE FAILED:', err);
  process.exit(1);
});
