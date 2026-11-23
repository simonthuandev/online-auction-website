import http from 'node:http';
import assert from 'node:assert';

// Polyfill localStorage and window for Node.js test environment
const memoryStorage = new Map();
globalThis.localStorage = {
  getItem: (key) => memoryStorage.get(key) || null,
  setItem: (key, val) => memoryStorage.set(key, String(val)),
  removeItem: (key) => memoryStorage.delete(key),
  clear: () => memoryStorage.clear(),
};

globalThis.window = {
  location: {
    origin: 'http://localhost:5173',
    replace: () => {},
  },
};

async function testAuth() {
  console.log('====================================================');
  console.log('🧪 RUNNING AUTH & PROFILE TEST SUITE [WEB-AUTH-01]');
  console.log('====================================================\n');

  // ----------------------------------------------------
  // Test 1: Redirect Validation & Safe URL helper
  // ----------------------------------------------------
  console.log('👉 [1/5] Testing Redirect Validation (Anti-Open-Redirect)...');
  const { getSafeRedirectUrl } = await import('../src/lib/redirect.ts');

  // Valid internal relative routes
  assert.strictEqual(getSafeRedirectUrl('/auctions/123'), '/auctions/123');
  assert.strictEqual(getSafeRedirectUrl('/profile?tab=security'), '/profile?tab=security');
  assert.strictEqual(getSafeRedirectUrl('/products?category=electronics&page=2'), '/products?category=electronics&page=2');
  assert.strictEqual(getSafeRedirectUrl('/seller/products/new'), '/seller/products/new');

  // Malicious open redirect attempts (must fallback to default '/')
  assert.strictEqual(getSafeRedirectUrl('//evil.com'), '/', 'Should block protocol-relative URL //evil.com');
  assert.strictEqual(getSafeRedirectUrl('//google.com/phishing'), '/', 'Should block //google.com');
  assert.strictEqual(getSafeRedirectUrl('https://malicious-site.com'), '/', 'Should block absolute https URL');
  assert.strictEqual(getSafeRedirectUrl('http://attacker.com/login'), '/', 'Should block absolute http URL');
  assert.strictEqual(getSafeRedirectUrl('javascript:alert(1)'), '/', 'Should block javascript scheme');
  assert.strictEqual(getSafeRedirectUrl('/\\evil.com'), '/', 'Should block backslash injection');
  assert.strictEqual(getSafeRedirectUrl('/login'), '/', 'Should prevent redirect loop to /login');
  assert.strictEqual(getSafeRedirectUrl('/register'), '/', 'Should prevent redirect loop to /register');
  assert.strictEqual(getSafeRedirectUrl(null), '/', 'Should fallback on null');
  assert.strictEqual(getSafeRedirectUrl(undefined), '/', 'Should fallback on undefined');
  assert.strictEqual(getSafeRedirectUrl('   '), '/', 'Should fallback on whitespace');

  // Custom fallback
  assert.strictEqual(getSafeRedirectUrl('https://evil.com', '/home'), '/home');
  console.log('  ✅ Redirect validation tests passed!\n');

  // ----------------------------------------------------
  // Test 2: Form Validation Rules (Client-side contract alignment)
  // ----------------------------------------------------
  console.log('👉 [2/5] Testing Form Validation Rules & Constraints...');

  const emailRegex = /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i;
  assert.strictEqual(emailRegex.test('user@example.com'), true);
  assert.strictEqual(emailRegex.test('admin@auction.vn'), true);
  assert.strictEqual(emailRegex.test('invalid-email'), false);
  assert.strictEqual(emailRegex.test('missing-domain@'), false);
  assert.strictEqual(emailRegex.test('@missing-user.com'), false);

  // Name length validation (1-100 after trim)
  const validateName = (name) => {
    const trimmed = (name || '').trim();
    if (!trimmed) return 'Họ và tên không được để trống';
    if (trimmed.length > 100) return 'Họ và tên tối đa 100 ký tự';
    return true;
  };
  assert.strictEqual(validateName('Nguyen Van A'), true);
  assert.strictEqual(validateName('   '), 'Họ và tên không được để trống');
  assert.strictEqual(validateName(''), 'Họ và tên không được để trống');
  assert.strictEqual(validateName('A'.repeat(101)), 'Họ và tên tối đa 100 ký tự');
  assert.strictEqual(validateName('A'.repeat(100)), true);

  // Password constraints (Register: 8-72 chars, Login: 1-72 chars)
  const validateRegisterPassword = (pw) => {
    if (!pw || pw.length < 8) return 'Tối thiểu 8 ký tự';
    if (pw.length > 72) return 'Tối đa 72 ký tự';
    return true;
  };
  assert.strictEqual(validateRegisterPassword('pass1234'), true);
  assert.strictEqual(validateRegisterPassword('1234567'), 'Tối thiểu 8 ký tự');
  assert.strictEqual(validateRegisterPassword('a'.repeat(73)), 'Tối đa 72 ký tự');

  // Avatar URL constraints (null, empty string, or http/https <= 2048)
  const validateAvatarUrl = (url) => {
    if (!url || !url.trim()) return true; // optional/cleared
    const trimmed = url.trim();
    if (trimmed.length > 2048) return 'Độ dài URL tối đa 2048 ký tự';
    if (!/^https?:\/\/.+/i.test(trimmed)) return 'URL phải bắt đầu bằng http:// hoặc https://';
    return true;
  };
  assert.strictEqual(validateAvatarUrl(''), true);
  assert.strictEqual(validateAvatarUrl(null), true);
  assert.strictEqual(validateAvatarUrl('https://example.com/avatar.jpg'), true);
  assert.strictEqual(validateAvatarUrl('http://cdn.site.com/u/1.png'), true);
  assert.strictEqual(validateAvatarUrl('ftp://example.com/avatar.jpg'), 'URL phải bắt đầu bằng http:// hoặc https://');
  assert.strictEqual(validateAvatarUrl('https://' + 'a'.repeat(2050)), 'Độ dài URL tối đa 2048 ký tự');
  console.log('  ✅ Form validation constraints passed!\n');

  // ----------------------------------------------------
  // Test 3: Profile Dirty/Changed Guard (Prevents Empty 400 Requests)
  // ----------------------------------------------------
  console.log('👉 [3/5] Testing Profile Unchanged Guard (Lock Save Button)...');

  const checkIsSaveDisabled = (user, watchedName, watchedAvatarUrl, isSubmitting = false) => {
    const trimmedName = (watchedName || '').trim();
    const normalizedAvatar = (watchedAvatarUrl || '').trim() || null;
    const originalAvatar = user?.avatarUrl || null;

    const isNameChanged = trimmedName !== (user?.name ?? '');
    const isAvatarChanged = normalizedAvatar !== originalAvatar;
    const isFormChanged = isNameChanged || isAvatarChanged;

    const isValidAvatarUrl =
      !normalizedAvatar ||
      (/^https?:\/\/.+/i.test(normalizedAvatar) && normalizedAvatar.length <= 2048);
    const isValidName = trimmedName.length >= 1 && trimmedName.length <= 100;
    const isFormValid = isValidName && isValidAvatarUrl;

    return !isFormChanged || !isFormValid || isSubmitting;
  };

  const initialUser = {
    id: 'user-1',
    name: 'Phạm Minh Tuấn',
    email: 'tuan@example.com',
    role: 'USER',
    avatarUrl: 'https://example.com/tuan.jpg',
    isActive: true,
  };

  // Case 1: Exactly matches existing profile -> Save button MUST be disabled
  assert.strictEqual(
    checkIsSaveDisabled(initialUser, 'Phạm Minh Tuấn', 'https://example.com/tuan.jpg'),
    true,
    'Save button must be disabled when form is unchanged'
  );

  // Case 2: Matching with whitespace padding -> Unchanged -> Disabled
  assert.strictEqual(
    checkIsSaveDisabled(initialUser, '  Phạm Minh Tuấn  ', '  https://example.com/tuan.jpg  '),
    true,
    'Save button must remain disabled when differences are only whitespace'
  );

  // Case 3: Name changed -> Save enabled
  assert.strictEqual(
    checkIsSaveDisabled(initialUser, 'Phạm Minh Tuấn (Updated)', 'https://example.com/tuan.jpg'),
    false,
    'Save button must be enabled when name changes'
  );

  // Case 4: Avatar changed -> Save enabled
  assert.strictEqual(
    checkIsSaveDisabled(initialUser, 'Phạm Minh Tuấn', 'https://example.com/new-avatar.jpg'),
    false,
    'Save button must be enabled when avatar URL changes'
  );

  // Case 5: User clears avatar (sets to empty) -> Save enabled
  assert.strictEqual(
    checkIsSaveDisabled(initialUser, 'Phạm Minh Tuấn', ''),
    false,
    'Save button must be enabled when clearing avatar URL'
  );

  // Case 6: Form changed but invalid URL -> Disabled
  assert.strictEqual(
    checkIsSaveDisabled(initialUser, 'Phạm Minh Tuấn', 'not-a-valid-url'),
    true,
    'Save button must be disabled if avatar URL is invalid'
  );

  // Case 7: Form changed but empty name -> Disabled
  assert.strictEqual(
    checkIsSaveDisabled(initialUser, '   ', 'https://example.com/tuan.jpg'),
    true,
    'Save button must be disabled if name is whitespace'
  );

  console.log('  ✅ Profile save button lock tests passed!\n');

  // ----------------------------------------------------
  // Test 4: Clean Logout (Sends { refreshToken } & Clears Cache/Sockets/Storage)
  // ----------------------------------------------------
  console.log('👉 [4/5] Testing Clean Logout with API call and storage/cache clearing...');

  let logoutReceivedBody = null;
  let logoutCalls = 0;

  const mockAuthServer = http.createServer((req, res) => {
    let body = '';
    req.on('data', (c) => { body += c; });
    req.on('end', () => {
      res.setHeader('Content-Type', 'application/json');

      if (req.url === '/api/auth/logout' && req.method === 'POST') {
        logoutCalls++;
        logoutReceivedBody = JSON.parse(body || '{}');
        res.writeHead(200);
        res.end(JSON.stringify({ revoked: true }));
        return;
      }

      res.writeHead(404);
      res.end(JSON.stringify({ code: 'NOT_FOUND' }));
    });
  });

  await new Promise((resolve) => mockAuthServer.listen(9878, resolve));

  try {
    const { apiClient } = await import('../src/api/client.ts');
    const { tokenStorage } = await import('../src/lib/tokenStorage.ts');
    const { store } = await import('../src/store/index.ts');
    const { setCredentials } = await import('../src/store/authSlice.ts');
    const { queryClient } = await import('../src/lib/queryClient.ts');
    const { performLogout } = await import('../src/features/auth/services/performLogout.ts');

    apiClient.defaults.baseURL = 'http://127.0.0.1:9878';

    // Seed state
    tokenStorage.setTokens({
      accessToken: 'sample-access-token-123',
      refreshToken: 'sample-refresh-token-456',
    });
    tokenStorage.setUser(initialUser);

    store.dispatch(
      setCredentials({
        user: initialUser,
        accessToken: 'sample-access-token-123',
        refreshToken: 'sample-refresh-token-456',
      })
    );

    queryClient.setQueryData(['auth', 'me'], initialUser);

    assert.strictEqual(store.getState().auth.isAuthenticated, true);
    assert.strictEqual(queryClient.getQueryData(['auth', 'me'])?.name, 'Phạm Minh Tuấn');

    // Trigger logout
    await performLogout({ callApi: true, redirect: false });

    // Verify backend received exact schema { refreshToken }
    assert.strictEqual(logoutCalls, 1, 'Logout API should have been called once');
    assert.deepStrictEqual(
      logoutReceivedBody,
      { refreshToken: 'sample-refresh-token-456' },
      'Logout body must strictly contain { refreshToken }'
    );

    // Verify storage cleared
    assert.strictEqual(tokenStorage.getAccessToken(), null, 'Access token must be cleared');
    assert.strictEqual(tokenStorage.getRefreshToken(), null, 'Refresh token must be cleared');
    assert.strictEqual(tokenStorage.getUser(), null, 'User data must be cleared from storage');

    // Verify Redux state cleared
    assert.strictEqual(store.getState().auth.isAuthenticated, false, 'Redux must reflect unauthenticated');
    assert.strictEqual(store.getState().auth.user, null, 'Redux user must be null');
    assert.strictEqual(store.getState().auth.accessToken, null, 'Redux accessToken must be null');

    // Verify QueryClient cache cleared
    assert.strictEqual(queryClient.getQueryData(['auth', 'me']), undefined, 'TanStack Query cache must be cleared');

    console.log('  ✅ Clean logout tests passed!\n');
  } finally {
    mockAuthServer.close();
  }

  // ----------------------------------------------------
  // Test 5: Locked Account Handling (isActive=false & 401 detection)
  // ----------------------------------------------------
  console.log('👉 [5/5] Testing Locked Account Handling (isActive=false -> Clean Logout)...');

  let lockedServerCalls = 0;
  const mockLockedServer = http.createServer((req, res) => {
    let body = '';
    req.on('data', (c) => { body += c; });
    req.on('end', () => {
      res.setHeader('Content-Type', 'application/json');

      if (req.url === '/api/auth/me' && req.method === 'GET') {
        lockedServerCalls++;
        // Simulate inactive user rejection from backend
        res.writeHead(401);
        res.end(
          JSON.stringify({
            code: 'ACCOUNT_LOCKED',
            message: 'User account is inactive or not found',
            requestId: 'req-locked-001',
          })
        );
        return;
      }

      res.writeHead(404);
      res.end(JSON.stringify({ code: 'NOT_FOUND' }));
    });
  });

  await new Promise((resolve) => mockLockedServer.listen(9879, resolve));

  try {
    const { apiClient, setAuthCallbacks } = await import('../src/api/client.ts');
    const { tokenStorage } = await import('../src/lib/tokenStorage.ts');
    const { store } = await import('../src/store/index.ts');
    const { setCredentials } = await import('../src/store/authSlice.ts');
    const { performLogout } = await import('../src/features/auth/services/performLogout.ts');

    apiClient.defaults.baseURL = 'http://127.0.0.1:9879';

    let failureReason = '';
    setAuthCallbacks({
      onAuthFailure: (reason) => {
        failureReason = reason || '';
        performLogout({ callApi: false, redirect: false, reason });
      },
    });

    tokenStorage.setTokens({
      accessToken: 'locked-access-token',
      refreshToken: 'locked-refresh-token',
    });
    store.dispatch(
      setCredentials({
        user: { ...initialUser, isActive: false },
        accessToken: 'locked-access-token',
        refreshToken: 'locked-refresh-token',
      })
    );

    let errorThrown = null;
    try {
      await apiClient.get('/api/auth/me');
    } catch (err) {
      errorThrown = err;
    }

    assert.ok(errorThrown, 'Call should fail with 401');
    assert.strictEqual(tokenStorage.getAccessToken(), null, 'Tokens should be wiped on locked account');
    assert.strictEqual(store.getState().auth.isAuthenticated, false, 'Redux auth state should be reset');
    assert.ok(
      failureReason.includes('khóa') || failureReason.includes('inactive'),
      `Failure reason should mention account locked: "${failureReason}"`
    );

    console.log('  ✅ Locked account handling tests passed!\n');
  } finally {
    mockLockedServer.close();
  }

  console.log('====================================================');
  console.log('🎉 ALL AUTH & PROFILE TESTS PASSED SUCCESSFULLY!');
  console.log('====================================================');
}

testAuth().catch((err) => {
  console.error('❌ Auth Verification failed:', err);
  process.exit(1);
});

