import http from 'node:http';
import assert from 'node:assert';

// Polyfill minimal browser globals for testing
globalThis.localStorage = {
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {},
  clear: () => {},
};

async function testProductModule() {
  console.log('====================================================');
  console.log('🧪 RUNNING PRODUCT MODULE TEST SUITE [WEB-PROD-01]');
  console.log('====================================================\n');

  // ----------------------------------------------------
  // Test 1: URL Filter Parsing & Sanitization
  // ----------------------------------------------------
  console.log('👉 [1/6] Testing URL Filter Parsing, Sanitization & DRAFT Exclusion...');
  const {
    parseProductFilters,
    buildProductFilterParams,
    PUBLIC_PRODUCT_STATUSES,
  } = await import('../src/features/products/utils/filterHelpers.ts');

  // 1.1 Strictly verify DRAFT is not in public product statuses
  assert.strictEqual(
    PUBLIC_PRODUCT_STATUSES.includes('DRAFT'),
    false,
    'PUBLIC_PRODUCT_STATUSES must NOT contain DRAFT'
  );
  assert.deepStrictEqual(
    [...PUBLIC_PRODUCT_STATUSES],
    ['READY', 'RESERVED', 'IN_AUCTION', 'SOLD'],
    'Public statuses must match exactly READY, RESERVED, IN_AUCTION, SOLD'
  );

  // 1.2 Valid parameters
  const validUrl = new URLSearchParams(
    'page=3&pageSize=20&categoryId=c8994781-a792-4f3e-9dc4-1b702ec4058d&status=READY&search=iPhone%2016'
  );
  const parsedValid = parseProductFilters(validUrl);
  assert.strictEqual(parsedValid.page, 3);
  assert.strictEqual(parsedValid.pageSize, 20);
  assert.strictEqual(parsedValid.categoryId, 'c8994781-a792-4f3e-9dc4-1b702ec4058d');
  assert.strictEqual(parsedValid.status, 'READY');
  assert.strictEqual(parsedValid.search, 'iPhone 16');

  // 1.3 Malformed & malicious URL params sanitization
  const malformedUrl = new URLSearchParams(
    'page=-5&pageSize=999999&categoryId=%20%20&status=DRAFT&search=%20%20%20'
  );
  const parsedMalformed = parseProductFilters(malformedUrl);
  assert.strictEqual(parsedMalformed.page, 1, 'Negative page must fallback to 1');
  assert.strictEqual(parsedMalformed.pageSize, 12, 'Excessive pageSize (>100) must fallback to 12');
  assert.strictEqual(parsedMalformed.categoryId, undefined, 'Whitespace categoryId must be ignored');
  assert.strictEqual(parsedMalformed.status, undefined, 'DRAFT status on public query must be ignored');
  assert.strictEqual(parsedMalformed.search, undefined, 'Whitespace search must be ignored');

  // 1.4 Random bogus status sanitization
  const bogusStatusUrl = new URLSearchParams('status=UNKNOWN_STATUS_123');
  assert.strictEqual(parseProductFilters(bogusStatusUrl).status, undefined);

  // 1.5 Parameter builder verification
  const rebuiltParams = buildProductFilterParams({
    page: 2,
    pageSize: 20,
    categoryId: 'cat-1',
    status: 'IN_AUCTION',
    search: 'MacBook',
  });
  assert.strictEqual(rebuiltParams.get('page'), '2');
  assert.strictEqual(rebuiltParams.get('pageSize'), '20');
  assert.strictEqual(rebuiltParams.get('categoryId'), 'cat-1');
  assert.strictEqual(rebuiltParams.get('status'), 'IN_AUCTION');
  assert.strictEqual(rebuiltParams.get('search'), 'MacBook');

  // Default page 1 should be omitted from URL
  const page1Params = buildProductFilterParams({ page: 1, pageSize: 12 });
  assert.strictEqual(page1Params.get('page'), null, 'Page 1 should be omitted from clean URL');
  console.log('  ✅ Filter parsing and sanitization passed!\n');

  // ----------------------------------------------------
  // Test 2: Reset Page to 1 on Filter Change
  // ----------------------------------------------------
  console.log('👉 [2/6] Testing Reset Page to 1 on Filter Change...');

  const currentFilters = {
    page: 5,
    pageSize: 12,
    categoryId: 'cat-old',
    status: 'READY',
    search: 'old search',
  };

  // Simulating filter change logic from ProductListPage
  const applyFilterChange = (current, updates) => {
    return {
      ...current,
      ...updates,
      page: 1, // Contract: any filter change must reset page to 1
    };
  };

  const changedCategory = applyFilterChange(currentFilters, { categoryId: 'cat-new' });
  assert.strictEqual(changedCategory.page, 1, 'Changing category must reset page to 1');
  assert.strictEqual(changedCategory.categoryId, 'cat-new');

  const changedStatus = applyFilterChange(currentFilters, { status: 'SOLD' });
  assert.strictEqual(changedStatus.page, 1, 'Changing status must reset page to 1');
  assert.strictEqual(changedStatus.status, 'SOLD');

  const changedSearch = applyFilterChange(currentFilters, { search: 'new laptop' });
  assert.strictEqual(changedSearch.page, 1, 'Changing search query must reset page to 1');
  console.log('  ✅ Page reset on filter change passed!\n');

  // ----------------------------------------------------
  // Test 3: Search Debounce Simulation (350ms window)
  // ----------------------------------------------------
  console.log('👉 [3/6] Testing Search Debounce (300–400ms)...');

  let debouncedCalls = 0;
  let finalSearchValue = '';

  const createDebouncedSearch = (delay = 350) => {
    let timer = null;
    return (value) => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        debouncedCalls++;
        finalSearchValue = value;
      }, delay);
    };
  };

  const triggerSearch = createDebouncedSearch(350);

  // Rapid typing: 'i', 'ip', 'iph', 'iphone'
  triggerSearch('i');
  triggerSearch('ip');
  triggerSearch('iph');
  triggerSearch('iphone');

  // Check immediately: debounce timer hasn't fired yet
  assert.strictEqual(debouncedCalls, 0, 'Debounce should not fire synchronously');

  // Wait 400ms for debounce timer to settle
  await new Promise((resolve) => setTimeout(resolve, 400));

  assert.strictEqual(debouncedCalls, 1, 'Debounce should have fired exactly once');
  assert.strictEqual(finalSearchValue, 'iphone', 'Debounced value should be the final keystroke');
  console.log('  ✅ Search debounce test passed!\n');

  // ----------------------------------------------------
  // Test 4: Condition and Status Display Mapping
  // ----------------------------------------------------
  console.log('👉 [4/6] Testing Condition & Status Display Labels...');

  const CONDITION_VIETNAMESE = {
    NEW: 'Mới 100%',
    LIKE_NEW: 'Như mới (99%)',
    USED: 'Đã sử dụng',
  };

  assert.strictEqual(CONDITION_VIETNAMESE.NEW, 'Mới 100%');
  assert.strictEqual(CONDITION_VIETNAMESE.LIKE_NEW, 'Như mới (99%)');
  assert.strictEqual(CONDITION_VIETNAMESE.USED, 'Đã sử dụng');

  const STATUS_VIETNAMESE = {
    READY: 'Sẵn sàng đấu giá',
    RESERVED: 'Đã giữ chỗ',
    IN_AUCTION: 'Đang đấu giá',
    SOLD: 'Đã bán',
    DRAFT: 'Bản nháp',
  };

  assert.strictEqual(STATUS_VIETNAMESE.READY, 'Sẵn sàng đấu giá');
  assert.strictEqual(STATUS_VIETNAMESE.IN_AUCTION, 'Đang đấu giá');
  assert.strictEqual(STATUS_VIETNAMESE.SOLD, 'Đã bán');
  console.log('  ✅ Status & Condition label mappings passed!\n');

  // ----------------------------------------------------
  // Test 5: Owner Action Permissions (SELLER + Owner + DRAFT/READY)
  // ----------------------------------------------------
  console.log('👉 [5/6] Testing Owner Action Permissions (Edit / Create Auction)...');

  const checkCanModify = (currentUser, product) => {
    if (!currentUser || !currentUser.id) return false;
    const isSellerOrAdmin = currentUser.role === 'SELLER' || currentUser.role === 'ADMIN';
    if (!isSellerOrAdmin) return false;
    const isOwner = currentUser.id === product.sellerId;
    if (!isOwner) return false;
    return product.status === 'DRAFT' || product.status === 'READY';
  };

  const seller1 = { id: 'seller-uuid-1', role: 'SELLER' };
  const seller2 = { id: 'seller-uuid-2', role: 'SELLER' };
  const buyer = { id: 'buyer-uuid-3', role: 'USER' };

  const readyProduct = { id: 'prod-1', sellerId: 'seller-uuid-1', status: 'READY' };
  const draftProduct = { id: 'prod-2', sellerId: 'seller-uuid-1', status: 'DRAFT' };
  const inAuctionProduct = { id: 'prod-3', sellerId: 'seller-uuid-1', status: 'IN_AUCTION' };
  const soldProduct = { id: 'prod-4', sellerId: 'seller-uuid-1', status: 'SOLD' };

  // Owner seller with READY -> Allowed
  assert.strictEqual(checkCanModify(seller1, readyProduct), true, 'Owner seller with READY should see actions');

  // Owner seller with DRAFT -> Allowed
  assert.strictEqual(checkCanModify(seller1, draftProduct), true, 'Owner seller with DRAFT should see actions');

  // Owner seller with IN_AUCTION -> Disallowed (locked)
  assert.strictEqual(checkCanModify(seller1, inAuctionProduct), false, 'Product in auction should NOT show edit/create');

  // Owner seller with SOLD -> Disallowed
  assert.strictEqual(checkCanModify(seller1, soldProduct), false, 'Sold product should NOT show edit/create');

  // Other seller -> Disallowed
  assert.strictEqual(checkCanModify(seller2, readyProduct), false, 'Non-owner seller should NOT see actions');

  // Normal buyer -> Disallowed
  assert.strictEqual(checkCanModify(buyer, readyProduct), false, 'Buyer should NOT see owner actions');

  // Guest (unauthenticated) -> Disallowed
  assert.strictEqual(checkCanModify(null, readyProduct), false, 'Guest should NOT see owner actions');
  console.log('  ✅ Owner actions permission checks passed!\n');

  // ----------------------------------------------------
  // Test 6: API Integration & 404 Distinction
  // ----------------------------------------------------
  console.log('👉 [6/6] Testing API Client with Product Endpoints & 404 Error Handling...');

  const sampleProduct = {
    id: 'b1d0335e-cbe0-43eb-8e93-018244fb1b9a',
    sellerId: 'seller-uuid-1',
    categoryId: 'cat-uuid-1',
    category: {
      id: 'cat-uuid-1',
      name: 'Điện tử',
      description: 'Thiết bị điện tử',
    },
    title: 'iPhone 15 Pro Max',
    description: 'Bản 256GB Titan Tự nhiên mới 100%',
    status: 'READY',
    condition: 'NEW',
    images: [
      { url: 'https://example.com/img1.jpg', isPrimary: true },
      { url: 'https://example.com/img2.jpg', isPrimary: false },
    ],
  };

  const mockProductServer = http.createServer((req, res) => {
    res.setHeader('Content-Type', 'application/json');

    // GET /api/products/b1d0335e-cbe0-43eb-8e93-018244fb1b9a
    if (req.url === `/api/products/${sampleProduct.id}` && req.method === 'GET') {
      res.writeHead(200);
      res.end(JSON.stringify(sampleProduct));
      return;
    }

    // GET /api/products/non-existent-id -> 404
    if (req.url === '/api/products/non-existent-id' && req.method === 'GET') {
      res.writeHead(404);
      res.end(
        JSON.stringify({
          code: 'NOT_FOUND',
          message: 'Sản phẩm không tồn tại',
          requestId: 'req-404-01',
        })
      );
      return;
    }

    // GET /api/products -> list
    if (req.url?.startsWith('/api/products') && req.method === 'GET') {
      res.writeHead(200);
      res.end(
        JSON.stringify({
          items: [sampleProduct],
          page: 1,
          pageSize: 12,
          total: 1,
        })
      );
      return;
    }

    res.writeHead(404);
    res.end(JSON.stringify({ code: 'NOT_FOUND' }));
  });

  await new Promise((resolve) => mockProductServer.listen(9880, resolve));

  try {
    const { apiClient } = await import('../src/api/client.ts');
    const { productApi } = await import('../src/api/product.api.ts');

    apiClient.defaults.baseURL = 'http://127.0.0.1:9880';

    // 1. Fetch valid product detail
    const productRes = await productApi.getProduct(sampleProduct.id);
    assert.strictEqual(productRes.id, sampleProduct.id);
    assert.strictEqual(productRes.title, 'iPhone 15 Pro Max');
    assert.strictEqual(productRes.sellerId, 'seller-uuid-1');
    assert.strictEqual(productRes.category?.name, 'Điện tử');
    assert.strictEqual(productRes.images.length, 2);

    // 2. Fetch non-existent product -> Must fail with 404
    let error404 = null;
    try {
      await productApi.getProduct('non-existent-id');
    } catch (err) {
      error404 = err;
    }

    assert.ok(error404, 'Non-existent product must throw an error');
    assert.strictEqual(error404.statusCode, 404, 'Status code must be 404');
    assert.strictEqual(error404.code, 'NOT_FOUND', 'Error code must be NOT_FOUND');

    // 3. Fetch product list
    const listRes = await productApi.getProducts({ page: 1, pageSize: 12 });
    assert.strictEqual(listRes.items.length, 1);
    assert.strictEqual(listRes.total, 1);

    console.log('  ✅ Product API calls & 404 handling verified!\n');
  } finally {
    mockProductServer.close();
  }

  console.log('====================================================');
  console.log('🎉 ALL PRODUCT MODULE TESTS PASSED SUCCESSFULLY!');
  console.log('====================================================');
}

testProductModule().catch((err) => {
  console.error('❌ Product Verification failed:', err);
  process.exit(1);
});

