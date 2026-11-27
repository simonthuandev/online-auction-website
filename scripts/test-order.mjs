import http from 'node:http';
import assert from 'node:assert';

// Polyfill minimal browser globals for testing
globalThis.localStorage = {
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {},
  clear: () => {},
};

async function testOrderModule() {
  console.log('====================================================');
  console.log('🧪 RUNNING ORDER MODULE TEST SUITE [WEB-ORD-01]');
  console.log('====================================================\n');

  const {
    parseOrderFilters,
    buildOrderSearchParams,
    getOrderRole,
    shouldShowPaymentPanel,
    formatOrderAmount,
    getOrderStatusMeta,
    getOrderErrorStatusCode,
    ORDER_STATUSES,
  } = await import('../src/features/orders/utils/orderHelpers.ts');

  // ----------------------------------------------------
  // Test 1: URL Filter Sync & Sanitization + Page Reset
  // ----------------------------------------------------
  console.log('👉 [1/6] Testing Order Filter <-> URL Sync & Sanitization...');
  const validParams = new URLSearchParams('status=PAID&page=3&pageSize=10');
  const parsedValid = parseOrderFilters(validParams);
  assert.strictEqual(parsedValid.status, 'PAID');
  assert.strictEqual(parsedValid.page, 3);
  assert.strictEqual(parsedValid.pageSize, 10);

  const invalidParams = new URLSearchParams('status=UNKNOWN_STATUS&page=-2&pageSize=999');
  const parsedInvalid = parseOrderFilters(invalidParams);
  assert.strictEqual(parsedInvalid.status, undefined, 'Unknown status must be ignored');
  assert.strictEqual(parsedInvalid.page, 1, 'Negative page must reset to 1');
  assert.strictEqual(parsedInvalid.pageSize, 20, 'Out-of-range pageSize must fallback to 20');

  // Reset page to 1 when filter changes
  const resetParams = buildOrderSearchParams({
    page: 1,
    pageSize: 20,
    status: 'PENDING_PAYMENT',
  });
  assert.strictEqual(resetParams.get('status'), 'PENDING_PAYMENT');
  assert.strictEqual(resetParams.get('page'), null, 'Default page=1 is omitted cleanly from URL');
  console.log('  ✅ Order filter <-> URL sync & sanitization passed!\n');

  // ----------------------------------------------------
  // Test 2: Order Role Tag ("Đơn mua" / "Đơn bán") by buyerId/sellerId
  // ----------------------------------------------------
  console.log('👉 [2/6] Testing Buyer/Seller Role Detection by ID...');
  const sampleOrder = {
    id: 'ord-1',
    buyerId: 'user-buyer-1',
    sellerId: 'user-seller-2',
    status: 'PENDING_PAYMENT',
  };
  assert.strictEqual(getOrderRole(sampleOrder, 'user-buyer-1'), 'BUYER');
  assert.strictEqual(getOrderRole(sampleOrder, 'user-seller-2'), 'SELLER');
  assert.strictEqual(getOrderRole(sampleOrder, 'user-stranger-3'), null);
  assert.strictEqual(getOrderRole(sampleOrder, undefined), null);
  console.log('  ✅ Buyer/Seller role detection passed!\n');

  // ----------------------------------------------------
  // Test 3: Status Badges for all 4 Contract Statuses
  // ----------------------------------------------------
  console.log('👉 [3/6] Testing Order Status Badges (4 statuses)...');
  assert.deepStrictEqual(
    [...ORDER_STATUSES],
    ['PENDING_PAYMENT', 'PAID', 'CANCELLED', 'COMPLETED']
  );
  assert.strictEqual(getOrderStatusMeta('PENDING_PAYMENT').label, 'Chờ thanh toán');
  assert.strictEqual(getOrderStatusMeta('PAID').label, 'Đã thanh toán');
  assert.strictEqual(getOrderStatusMeta('CANCELLED').label, 'Đã hủy');
  assert.strictEqual(getOrderStatusMeta('COMPLETED').label, 'Hoàn tất');
  console.log('  ✅ Order status badges passed!\n');

  // ----------------------------------------------------
  // Test 4: Payment Panel Visibility (Buyer + PENDING_PAYMENT only)
  // ----------------------------------------------------
  console.log('👉 [4/6] Testing Payment Panel Visibility Rules...');
  assert.strictEqual(
    shouldShowPaymentPanel({ buyerId: 'buyer-1', status: 'PENDING_PAYMENT' }, 'buyer-1'),
    true,
    'Buyer with PENDING_PAYMENT must see payment panel'
  );
  assert.strictEqual(
    shouldShowPaymentPanel({ buyerId: 'buyer-1', status: 'PAID' }, 'buyer-1'),
    false,
    'Buyer with PAID order must NOT see payment panel'
  );
  assert.strictEqual(
    shouldShowPaymentPanel({ buyerId: 'buyer-1', status: 'PENDING_PAYMENT' }, 'seller-2'),
    false,
    'Seller must NOT see payment panel'
  );
  assert.strictEqual(
    shouldShowPaymentPanel({ buyerId: 'buyer-1', status: 'PENDING_PAYMENT' }, null),
    false
  );
  console.log('  ✅ Payment panel visibility passed!\n');

  // ----------------------------------------------------
  // Test 5: VND Formatting Precision (BigInt)
  // ----------------------------------------------------
  console.log('👉 [5/6] Testing BigInt VND Currency Formatting...');
  assert.strictEqual(formatOrderAmount('1500000'), '1.500.000 ₫');
  // Test integer larger than Number.MAX_SAFE_INTEGER (9007199254740991) -> 16 digits max per BE pattern
  assert.strictEqual(
    formatOrderAmount('9999999999999999'),
    '9.999.999.999.999.999 ₫',
    'Must preserve exact digits without JS float precision loss'
  );
  assert.strictEqual(formatOrderAmount(null), '0 ₫');
  console.log('  ✅ BigInt VND formatting passed!\n');

  // ----------------------------------------------------
  // Test 6: API Integration (GET /api/orders, GET /api/orders/{id}, 404, non-fatal payment error)
  // ----------------------------------------------------
  console.log('👉 [6/6] Testing Order API Client, 404 Handling & Non-Fatal Payment Error...');
  let capturedOrdersQuery = '';
  const mockServer = http.createServer((req, res) => {
    res.setHeader('Content-Type', 'application/json');

    if (req.url?.startsWith('/api/orders?') || req.url === '/api/orders') {
      capturedOrdersQuery = req.url;
      res.statusCode = 200;
      res.end(
        JSON.stringify({
          items: [
            {
              id: 'ord-100',
              auctionId: 'auc-100',
              productId: 'prod-100',
              buyerId: 'buyer-1',
              sellerId: 'seller-2',
              totalAmount: '2500000',
              currency: 'VND',
              status: 'PENDING_PAYMENT',
              productTitle: 'Đồng hồ cổ điển',
              productThumbnail: null,
            },
          ],
          page: 1,
          pageSize: 20,
          total: 1,
        })
      );
      return;
    }

    if (req.url === '/api/orders/ord-100') {
      res.statusCode = 200;
      res.end(
        JSON.stringify({
          id: 'ord-100',
          auctionId: 'auc-100',
          productId: 'prod-100',
          buyerId: 'buyer-1',
          sellerId: 'seller-2',
          totalAmount: '2500000',
          currency: 'VND',
          status: 'PAID',
          productTitle: 'Đồng hồ cổ điển',
          productThumbnail: null,
        })
      );
      return;
    }

    if (req.url === '/api/orders/stranger-or-missing') {
      res.statusCode = 404;
      res.end(
        JSON.stringify({
          code: 'NOT_FOUND',
          message: 'Order not found',
          requestId: 'req-404',
        })
      );
      return;
    }

    if (req.url === '/api/payments/order/ord-100') {
      res.statusCode = 403;
      res.end(
        JSON.stringify({
          code: 'FORBIDDEN',
          message: 'Not allowed',
          requestId: 'req-403',
        })
      );
      return;
    }

    res.statusCode = 500;
    res.end(JSON.stringify({ code: 'INTERNAL_ERROR', message: 'Server error', requestId: 'req-500' }));
  });

  await new Promise((resolve) => mockServer.listen(9881, '127.0.0.1', resolve));

  try {
    const { apiClient } = await import('../src/api/client.ts');
    const { orderApi } = await import('../src/api/order.api.ts');
    apiClient.defaults.baseURL = 'http://127.0.0.1:9881';

    // List orders (ensure no userId sent)
    const listRes = await orderApi.getOrders({ page: 1, pageSize: 20, status: 'PENDING_PAYMENT' });
    assert.strictEqual(listRes.items.length, 1);
    assert.strictEqual(capturedOrdersQuery.includes('userId='), false, 'Must NOT send userId');

    // Get detail
    const detail = await orderApi.getOrder('ord-100');
    assert.strictEqual(detail.id, 'ord-100');
    assert.strictEqual(detail.totalAmount, '2500000');

    // 404 Not Found
    let err404 = null;
    try {
      await orderApi.getOrder('stranger-or-missing');
    } catch (e) {
      err404 = e;
    }
    assert.strictEqual(getOrderErrorStatusCode(err404), 404);

    // Payment lookup fails with 403 (handled gracefully by caller without crashing order page)
    let paymentErr = null;
    try {
      await orderApi.getPaymentByOrderId('ord-100');
    } catch (e) {
      paymentErr = e;
    }
    assert.strictEqual(getOrderErrorStatusCode(paymentErr), 403);

    console.log('  ✅ Order API integration & error handling passed!\n');
  } finally {
    mockServer.close();
  }

  console.log('====================================================');
  console.log('🎉 ALL ORDER MODULE TESTS PASSED SUCCESSFULLY!');
  console.log('====================================================');
}

testOrderModule().catch((err) => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});

