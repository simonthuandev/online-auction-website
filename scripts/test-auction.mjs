import http from 'node:http';
import assert from 'node:assert';

// Polyfill minimal browser globals for testing
globalThis.localStorage = {
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {},
  clear: () => {},
};

async function testAuctionModule() {
  console.log('====================================================');
  console.log('🧪 RUNNING AUCTION MODULE TEST SUITE [WEB-AUC-01]');
  console.log('====================================================\n');

  const {
    parseAuctionFilters,
    buildAuctionFilterParams,
    getAuctionStatusMeta,
    maskBidderId,
    isUserLeadingBidder,
    PUBLIC_AUCTION_STATUSES,
  } = await import('../src/features/auctions/utils/auctionHelpers.ts');

  const { formatVnd, addVnd, compareVnd } = await import('../src/lib/money.ts');
  const { getRemainingMs, formatCountdown } = await import('../src/lib/time.ts');
  const { mockAuctions, mockBidsByAuctionId } = await import(
    '../src/features/auctions/mocks/auctions.mock.ts'
  );

  // ----------------------------------------------------
  // Test 1: URL Filter Parsing, Sanitization & Clean URL Builder
  // ----------------------------------------------------
  console.log('👉 [1/6] Testing Auction URL Filter Parsing & Sanitization...');

  assert.deepStrictEqual(
    [...PUBLIC_AUCTION_STATUSES],
    ['ACTIVE', 'PENDING', 'ENDED'],
    'Public statuses must strictly be ACTIVE, PENDING, ENDED'
  );

  // Valid params
  const validUrl = new URLSearchParams(
    'page=2&pageSize=24&status=ACTIVE&search=iPhone%2015'
  );
  const parsedValid = parseAuctionFilters(validUrl);
  assert.strictEqual(parsedValid.page, 2);
  assert.strictEqual(parsedValid.pageSize, 24);
  assert.strictEqual(parsedValid.status, 'ACTIVE');
  assert.strictEqual(parsedValid.search, 'iPhone 15');

  // Malformed params fallback
  const malformedUrl = new URLSearchParams(
    'page=-10&pageSize=99999&status=INVALID_STATUS&search=%20%20'
  );
  const parsedMalformed = parseAuctionFilters(malformedUrl);
  assert.strictEqual(parsedMalformed.page, 1, 'Negative page must fallback to 1');
  assert.strictEqual(parsedMalformed.pageSize, 12, 'Out of range pageSize must fallback to 12');
  assert.strictEqual(parsedMalformed.status, undefined, 'Invalid status must be filtered out');
  assert.strictEqual(parsedMalformed.search, undefined, 'Whitespace search must be undefined');

  // Clean URL builder
  const builtClean = buildAuctionFilterParams({
    page: 1,
    pageSize: 12,
  });
  assert.strictEqual(builtClean.get('page'), null, 'Page 1 should be omitted from URL');
  assert.strictEqual(builtClean.get('pageSize'), null, 'Default pageSize should be omitted');

  const builtCustom = buildAuctionFilterParams({
    page: 3,
    pageSize: 24,
    status: 'ACTIVE',
    search: 'MacBook',
  });
  assert.strictEqual(builtCustom.get('page'), '3');
  assert.strictEqual(builtCustom.get('pageSize'), '24');
  assert.strictEqual(builtCustom.get('status'), 'ACTIVE');
  assert.strictEqual(builtCustom.get('search'), 'MacBook');
  console.log('  ✅ Filter parsing and URL sync passed!\n');

  // ----------------------------------------------------
  // Test 2: Leading Bidder Identification & Masking
  // ----------------------------------------------------
  console.log('👉 [2/6] Testing Leading Bidder Identification & Masking...');

  const currentUserId = 'user-current-123';
  const otherUserId = 'user-other-456';

  // Latest bidder matches current user
  assert.strictEqual(
    isUserLeadingBidder(currentUserId, currentUserId),
    true,
    'When latest bid is from current user, isUserLeadingBidder must be true'
  );

  // Latest bidder does not match current user
  assert.strictEqual(
    isUserLeadingBidder(otherUserId, currentUserId),
    false,
    'When latest bid is from someone else, isUserLeadingBidder must be false'
  );

  // No bids yet
  assert.strictEqual(
    isUserLeadingBidder(null, currentUserId),
    false,
    'Null bidder must return false'
  );
  assert.strictEqual(
    isUserLeadingBidder(undefined, currentUserId),
    false,
    'Undefined bidder must return false'
  );

  // Masking
  assert.strictEqual(maskBidderId(currentUserId, currentUserId), 'Bạn');
  assert.strictEqual(maskBidderId('abc', otherUserId), 'Người dùng #abc');
  assert.strictEqual(maskBidderId('user-other-456', currentUserId), 'user...-456');
  assert.strictEqual(maskBidderId(null), 'Ẩn danh');
  console.log('  ✅ Leading bidder identification & masking passed!\n');

  // ----------------------------------------------------
  // Test 3: Status Badge Metadata
  // ----------------------------------------------------
  console.log('👉 [3/6] Testing Status Badge Metadata...');
  assert.strictEqual(getAuctionStatusMeta('ACTIVE').label, 'Đang diễn ra');
  assert.strictEqual(getAuctionStatusMeta('PENDING').label, 'Sắp mở');
  assert.strictEqual(getAuctionStatusMeta('ENDED').label, 'Đã kết thúc');
  assert.strictEqual(getAuctionStatusMeta('CANCELLED').label, 'Đã hủy');
  assert.strictEqual(getAuctionStatusMeta('INITIALIZING').label, 'Đang khởi tạo');
  console.log('  ✅ Status badge metadata passed!\n');

  // ----------------------------------------------------
  // Test 4: BigInt Money Formatting & Step Increments
  // ----------------------------------------------------
  console.log('👉 [4/6] Testing BigInt Money Formatting & Increments...');
  assert.strictEqual(formatVnd('23500000'), '23.500.000 ₫');
  assert.strictEqual(formatVnd('0'), '0 ₫');
  assert.strictEqual(formatVnd('1000000000000'), '1.000.000.000.000 ₫');

  // Step increment: currentPrice + bidIncrement using BigInt
  const nextMinBid = addVnd('23500000', '500000');
  assert.strictEqual(nextMinBid, '24000000');
  assert.strictEqual(compareVnd(nextMinBid, '23500000'), 1);
  console.log('  ✅ BigInt money calculations passed!\n');

  // ----------------------------------------------------
  // Test 5: UTC Countdown Timer Calculation
  // ----------------------------------------------------
  console.log('👉 [5/6] Testing UTC Countdown Calculation...');
  const futureDate = new Date(Date.now() + 1000 * 3665).toISOString(); // 1 hour, 1 min, 5s
  const remainingMs = getRemainingMs(futureDate);
  assert(remainingMs > 0, 'Remaining ms for future date must be > 0');

  const countdown = formatCountdown(remainingMs);
  assert.strictEqual(countdown.hours, 1);
  assert.strictEqual(countdown.minutes, 1);

  const pastDate = new Date(Date.now() - 10000).toISOString();
  assert.strictEqual(getRemainingMs(pastDate), 0, 'Past date remaining ms must be 0');
  assert.strictEqual(formatCountdown(0).formatted, '00:00:00');
  console.log('  ✅ UTC countdown calculations passed!\n');

  // ----------------------------------------------------
  // Test 6: API Client with Mock HTTP Server
  // ----------------------------------------------------
  console.log('👉 [6/6] Testing Auction API Client via Mock HTTP Server...');

  const server = http.createServer((req, res) => {
    const url = new URL(req.url, `http://${req.headers.host}`);
    res.setHeader('Content-Type', 'application/json');

    if (url.pathname === '/api/auctions' && req.method === 'GET') {
      res.writeHead(200);
      res.end(
        JSON.stringify({
          items: mockAuctions,
          page: 1,
          pageSize: 10,
          total: mockAuctions.length,
        })
      );
      return;
    }

    if (url.pathname === '/api/auctions/auc-001' && req.method === 'GET') {
      res.writeHead(200);
      res.end(JSON.stringify(mockAuctions[0]));
      return;
    }

    if (url.pathname === '/api/auctions/auc-001/bids' && req.method === 'GET') {
      const bids = mockBidsByAuctionId['auc-001-active-iphone'] ?? [];
      res.writeHead(200);
      res.end(
        JSON.stringify({
          items: bids,
          page: 1,
          pageSize: 10,
          total: bids.length,
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
    // 6.1 Get auctions list
    const auctionsRes = await auctionApi.getAuctions({ page: 1, pageSize: 10 });
    assert.strictEqual(auctionsRes.items.length, mockAuctions.length);
    assert.strictEqual(auctionsRes.total, mockAuctions.length);

    // 6.2 Get single auction
    const auctionRes = await auctionApi.getAuction('auc-001');
    assert.strictEqual(auctionRes.id, mockAuctions[0].id);
    assert.strictEqual(auctionRes.status, 'ACTIVE');

    // 6.3 Get bids for auction
    const bidsRes = await auctionApi.getAuctionBids('auc-001', { page: 1 });
    assert(bidsRes.items.length > 0);
    assert.strictEqual(bidsRes.items[0].id, 'bid-007');
    assert.strictEqual(bidsRes.items[0].bidderId, 'user-bidder-lead');
    console.log('  ✅ Mock server API client verification passed!\n');
  } finally {
    server.close();
  }

  console.log('====================================================');
  console.log('🎉 ALL AUCTION MODULE TESTS PASSED! [WEB-AUC-01]');
  console.log('====================================================\n');
}

testAuctionModule().catch((err) => {
  console.error('\n❌ AUCTION MODULE TEST SUITE FAILED:', err);
  process.exit(1);
});
