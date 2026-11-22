import test from 'node:test';
import assert from 'node:assert/strict';
import crypto, { randomUUID } from 'node:crypto';
import http from 'node:http';
import type { AddressInfo } from 'node:net';
import mongoose from 'mongoose';
import { UserModel } from '../models/user.model';
import { createApiApp } from '../app';
import { AppError, RefreshGraceError } from '../errors';
import { LocalAuthRepository, MongoAuthRepository } from '../repositories/auth';
import { LocalLibraryRepository } from '../repositories/library';
import { normalizeClientIp } from '../utils/http/client-ip';
import { AuthService } from '../services/auth';
import { LibraryService } from '../services/library.service';
import {
  getJwtSecret,
  hashPassword,
  hashRefreshToken,
  signAccessToken,
  timingSafeStringEqual,
  verifyAccessToken,
  verifyPassword,
} from '../utils/crypto';
function createTestAuthService() {
  const repo = new LocalAuthRepository({ inMemoryOnly: true });
  return new AuthService(repo);
}

test('hashPassword & verifyPassword use unique scrypt salts and reject wrong secrets', async () => {
  const hashA = await hashPassword('LibraryPass!2026');
  const hashB = await hashPassword('LibraryPass!2026');

  assert.notEqual(hashA, hashB, 'Same password must produce distinct salted hashes');
  assert.ok(hashA.startsWith('scrypt$'));
  assert.equal(await verifyPassword('LibraryPass!2026', hashA), true);
  assert.equal(await verifyPassword('WrongPassword!2026', hashA), false);
  assert.equal(await verifyPassword('LibraryPass!2026', 'malformed-hash'), false);
});

test('signAccessToken & verifyAccessToken enforce HS256 and reject tampered or alg:none tokens', () => {
  const { token, expiresInSeconds } = signAccessToken({
    sub: 'librarian-1',
    email: 'mei@communitylibrary.org',
    name: 'Mei Lin',
    role: 'admin',
  });

  assert.equal(expiresInSeconds, 900);
  const payload = verifyAccessToken(token);
  assert.ok(payload);
  assert.equal(payload.sub, 'librarian-1');
  assert.equal(payload.role, 'admin');

  // Tampered payload must fail
  const [header, encodedPayload, sig] = token.split('.');
  const tamperedPayload = Buffer.from(
    JSON.stringify({
      sub: 'attacker',
      email: 'evil@example.com',
      name: 'Evil',
      role: 'admin',
      jti: '123',
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 900,
    })
  ).toString('base64url');
  assert.equal(verifyAccessToken(`${header}.${tamperedPayload}.${sig}`), null);

  // alg:none token must be rejected
  const noneHeader = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString(
    'base64url'
  );
  assert.equal(verifyAccessToken(`${noneHeader}.${encodedPayload}.`), null);
  assert.equal(verifyAccessToken(`${noneHeader}.${encodedPayload}.${sig}`), null);

  // Invalid signature must be rejected
  assert.equal(verifyAccessToken(`${header}.${encodedPayload}.invalid-sig`), null);
});

test('AuthService setupInitialAccount locks permanently after first librarian claims account', async () => {
  const authService = createTestAuthService();

  const beforeStatus = await authService.getStatus();
  assert.equal(beforeStatus.needsSetup, true);

  const session = await authService.setupInitialAccount({
    name: 'Mei Lin',
    email: 'mei@communitylibrary.org',
    password: 'StrongPassword#2026',
  });
  assert.equal(session.user.email, 'mei@communitylibrary.org');
  assert.equal(session.user.role, 'admin');
  assert.ok(session.accessToken.split('.').length === 3);
  assert.ok(session.refreshToken.length > 20);

  const afterStatus = await authService.getStatus();
  assert.equal(afterStatus.needsSetup, false);

  await assert.rejects(
    () =>
      authService.setupInitialAccount({
        name: 'Second Admin',
        email: 'other@communitylibrary.org',
        password: 'AnotherPassword#2026',
      }),
    (err: unknown) => err instanceof AppError && err.statusCode === 409
  );
});

test('AuthService login enforces brute-force rate limiting and refresh rotates tokens safely', async () => {
  const authService = createTestAuthService();
  const initial = await authService.setupInitialAccount({
    name: 'Mei Lin',
    email: 'mei@communitylibrary.org',
    password: 'CorrectPassword#2026',
  });

  // Refresh rotates old token -> reusing old token must fail
  const rotated = await authService.refresh(initial.refreshToken);
  assert.notEqual(rotated.refreshToken, initial.refreshToken);
  assert.ok(verifyAccessToken(rotated.accessToken));

  await assert.rejects(
    () => authService.refresh(initial.refreshToken),
    (err: unknown) => err instanceof AppError && err.statusCode === 401
  );

  // Logout revokes current refresh token
  await authService.logout(rotated.refreshToken);
  await assert.rejects(
    () => authService.refresh(rotated.refreshToken),
    (err: unknown) => err instanceof AppError && err.statusCode === 401
  );

  // Brute-force protection locks IP after 10 failures
  for (let i = 0; i < 10; i++) {
    await assert.rejects(
      () =>
        authService.login(
          { email: 'mei@communitylibrary.org', password: 'WrongPassword!' },
          '198.51.100.10'
        ),
      (err: unknown) => err instanceof AppError && err.statusCode === 401
    );
  }

  await assert.rejects(
    () =>
      authService.login(
        { email: 'mei@communitylibrary.org', password: 'CorrectPassword#2026' },
        '198.51.100.10'
      ),
    (err: unknown) => err instanceof AppError && err.statusCode === 429
  );

  // Different IP can still log in cleanly
  const cleanLogin = await authService.login(
    { email: 'mei@communitylibrary.org', password: 'CorrectPassword#2026' },
    '198.51.100.20'
  );
  assert.equal(cleanLogin.user.email, 'mei@communitylibrary.org');
});

test('HTTP API protects /api/books with JWT, enforces CSRF on auth mutations, and sets HttpOnly cookie', async () => {
  const libRepo = new LocalLibraryRepository({ inMemoryOnly: true });
  await libRepo.seedInitialData();
  const libraryService = new LibraryService(libRepo);
  const authService = createTestAuthService();
  const app = createApiApp(libraryService, authService);

  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address() as AddressInfo;
  const baseUrl = `http://127.0.0.1:${port}`;

  try {
    // 1. Public health and auth status return 200
    const healthRes = await fetch(`${baseUrl}/api/health`);
    assert.equal(healthRes.status, 200);

    const malformed = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{',
    });
    assert.equal(malformed.status, 400);
    const oversized = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ value: 'x'.repeat(1024 * 1024) }),
    });
    assert.equal(oversized.status, 413);
    const unsupportedEncoding = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Encoding': 'unsupported' },
      body: '{}',
    });
    assert.equal(unsupportedEncoding.status, 415);
    const unsupportedCharset = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=iso-8859-1' },
      body: '{}',
    });
    assert.equal(unsupportedCharset.status, 415);

    const statusRes = await fetch(`${baseUrl}/api/auth/status`);
    assert.equal(statusRes.status, 200);
    const statusJson = (await statusRes.json()) as {
      databaseConnected: boolean;
      needsSetup: boolean;
    };
    assert.equal(statusJson.databaseConnected, true);
    assert.equal(statusJson.needsSetup, true);

    // 2. Protected /api/books rejects unauthenticated calls with 401
    const unauthBooksRes = await fetch(`${baseUrl}/api/books`);
    assert.equal(unauthBooksRes.status, 401);

    // 3. Setup without X-Requested-With header is blocked by CSRF check (403)
    const csrfBlockedRes = await fetch(`${baseUrl}/api/auth/setup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Mei Lin',
        email: 'mei@communitylibrary.org',
        password: 'LibrarySecret#2026',
      }),
    });
    assert.equal(csrfBlockedRes.status, 403);

    // 4. Setup with CSRF header succeeds, returns JWT, and sets HttpOnly refresh cookie
    const setupRes = await fetch(`${baseUrl}/api/auth/setup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
        Origin: baseUrl,
      },
      body: JSON.stringify({
        name: 'Mei Lin',
        email: 'mei@communitylibrary.org',
        password: 'LibrarySecret#2026',
      }),
    });
    assert.equal(setupRes.status, 201);
    const setCookie = setupRes.headers.get('set-cookie') ?? '';
    assert.ok(setCookie.includes('mcl_refresh='));
    assert.ok(setCookie.includes('HttpOnly'));
    const cookiePair = setCookie.split(';')[0];

    const setupBody = (await setupRes.json()) as { accessToken: string };
    assert.ok(setupBody.accessToken);

    // 5. Authenticated /api/books succeeds with Bearer JWT
    const booksRes = await fetch(`${baseUrl}/api/books`, {
      headers: { Authorization: `Bearer ${setupBody.accessToken}` },
    });
    assert.equal(booksRes.status, 200);
    const booksJson = (await booksRes.json()) as { books: unknown[] };
    assert.equal(booksJson.books.length, 12);

    // 6. Refresh rotates cookie and returns new access token
    const refreshRes = await fetch(`${baseUrl}/api/auth/refresh`, {
      method: 'POST',
      headers: {
        'X-Requested-With': 'XMLHttpRequest',
        Origin: baseUrl,
        Cookie: cookiePair,
      },
    });
    assert.equal(refreshRes.status, 200);
    const nextCookie = (refreshRes.headers.get('set-cookie') ?? '').split(';')[0];
    assert.ok(nextCookie.startsWith('mcl_refresh='));
    assert.notEqual(nextCookie, cookiePair);

    // 7. Logout clears session cookie
    const logoutRes = await fetch(`${baseUrl}/api/auth/logout`, {
      method: 'POST',
      headers: {
        'X-Requested-With': 'XMLHttpRequest',
        Origin: baseUrl,
        Cookie: nextCookie,
      },
    });
    assert.equal(logoutRes.status, 200);

    // 8. Revoked cookie can no longer refresh
    const revokedRefreshRes = await fetch(`${baseUrl}/api/auth/refresh`, {
      method: 'POST',
      headers: {
        'X-Requested-With': 'XMLHttpRequest',
        Origin: baseUrl,
        Cookie: nextCookie,
      },
    });
    assert.equal(revokedRefreshRes.status, 401);
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
});

test('login uses the socket IP unless an explicitly trusted proxy supplies the client IP', async () => {
  const previousProxy = process.env.TRUST_PROXY;
  const previousNodeEnv = process.env.NODE_ENV;
  const previousJwt = process.env.JWT_SECRET;
  const previousLibrarian = process.env.LIBRARIAN_PASSWORD;
  process.env.NODE_ENV = 'test';
  delete process.env.TRUST_PROXY;
  delete process.env.LIBRARIAN_PASSWORD;

  const repository = new LocalAuthRepository({ inMemoryOnly: true });
  const authService = new AuthService(repository);
  const libraryService = new LibraryService(
    new LocalLibraryRepository({ inMemoryOnly: true })
  );
  const servers: http.Server[] = [];
  try {
    const app = createApiApp(libraryService, authService);
    const server = http.createServer(app);
    servers.push(server);
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    const baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;

    const forgedOrigin = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
        'X-Forwarded-Host': 'attacker.example',
        Origin: 'https://attacker.example',
      },
      body: JSON.stringify({ email: 'nobody@example.com', password: 'wrong' }),
    });
    assert.equal(forgedOrigin.status, 403);

    for (let i = 0; i < 11; i++) {
      const response = await fetch(`${baseUrl}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
          'X-Forwarded-For': `198.51.100.${i + 1}`,
        },
        body: JSON.stringify({ email: 'nobody@example.com', password: 'wrong' }),
      });
      assert.equal(response.status, i < 10 ? 401 : 429);
    }

    process.env.TRUST_PROXY = '127.0.0.1/32';
    const trustedApp = createApiApp(libraryService, authService);
    const trustedServer = http.createServer(trustedApp);
    servers.push(trustedServer);
    await new Promise<void>((resolve) => trustedServer.listen(0, '127.0.0.1', resolve));
    const trustedUrl = `http://127.0.0.1:${(trustedServer.address() as AddressInfo).port}`;
    for (let i = 0; i < 11; i++) {
      const response = await fetch(`${trustedUrl}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
          'X-Forwarded-For': '198.51.100.42',
        },
        body: JSON.stringify({ email: 'nobody@example.com', password: 'wrong' }),
      });
      assert.equal(response.status, i < 10 ? 401 : 429);
    }
    const anotherClient = await fetch(`${trustedUrl}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
        'X-Forwarded-For': '198.51.100.43',
      },
      body: JSON.stringify({ email: 'nobody@example.com', password: 'wrong' }),
    });
    assert.equal(anotherClient.status, 401);

    process.env.TRUST_PROXY = '0.0.0.0/0';
    assert.throws(() => createApiApp(libraryService, authService), /TRUST_PROXY/);
    process.env.TRUST_PROXY = 'true';
    assert.throws(() => createApiApp(libraryService, authService), /TRUST_PROXY/);
  } finally {
    await Promise.all(
      servers.map(
        (server) => new Promise<void>((resolve) => server.close(() => resolve()))
      )
    );
    for (const [key, value] of Object.entries({
      TRUST_PROXY: previousProxy,
      NODE_ENV: previousNodeEnv,
      JWT_SECRET: previousJwt,
      LIBRARIAN_PASSWORD: previousLibrarian,
    })) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
});

test('production requires a stable JWT secret and authorized bootstrap, and migrates legacy cookies', async () => {
  const previous = {
    NODE_ENV: process.env.NODE_ENV,
    JWT_SECRET: process.env.JWT_SECRET,
    SETUP_TOKEN: process.env.SETUP_TOKEN,
    TRUST_PROXY: process.env.TRUST_PROXY,
    LIBRARIAN_PASSWORD: process.env.LIBRARIAN_PASSWORD,
  };
  process.env.NODE_ENV = 'production';
  delete process.env.JWT_SECRET;
  delete process.env.SETUP_TOKEN;
  delete process.env.TRUST_PROXY;
  delete process.env.LIBRARIAN_PASSWORD;
  const authService = createTestAuthService();
  const libraryService = new LibraryService(
    new LocalLibraryRepository({ inMemoryOnly: true })
  );
  let server: http.Server | undefined;
  try {
    assert.throws(() => createApiApp(libraryService, authService), /JWT_SECRET/);
    process.env.JWT_SECRET = 'too-short';
    assert.throws(() => createApiApp(libraryService, authService), /JWT_SECRET/);
    process.env.JWT_SECRET = 'test-jwt-secret-with-at-least-16-characters';
    const app = createApiApp(libraryService, authService);
    server = http.createServer(app);
    await new Promise<void>((resolve) => server!.listen(0, '127.0.0.1', resolve));
    const baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
    const body = JSON.stringify({
      name: 'Mei Lin',
      email: 'mei@example.com',
      password: 'Password#2026',
    });
    const headers = {
      'Content-Type': 'application/json',
      'X-Requested-With': 'XMLHttpRequest',
    };

    assert.equal(
      (await fetch(`${baseUrl}/api/auth/setup`, { method: 'POST', headers, body }))
        .status,
      403
    );
    process.env.SETUP_TOKEN = 'short';
    assert.equal(
      (
        await fetch(`${baseUrl}/api/auth/setup`, {
          method: 'POST',
          headers: { ...headers, 'X-Setup-Token': 'short' },
          body,
        })
      ).status,
      403
    );
    process.env.SETUP_TOKEN = 'test-setup-token-with-at-least-32-characters';
    assert.equal(
      (
        await fetch(`${baseUrl}/api/auth/setup`, {
          method: 'POST',
          headers: { ...headers, 'X-Setup-Token': 'wrong' },
          body,
        })
      ).status,
      403
    );
    const setup = await fetch(`${baseUrl}/api/auth/setup`, {
      method: 'POST',
      headers: { ...headers, 'X-Setup-Token': process.env.SETUP_TOKEN },
      body,
    });
    assert.equal(setup.status, 201);
    const setupBody = (await setup.json()) as { accessToken: string };
    assert.ok(verifyAccessToken(setupBody.accessToken));
    const setCookie = setup.headers.get('set-cookie') ?? '';
    assert.match(setCookie, /HttpOnly; SameSite=Lax; Secure/);
    const cookie = setCookie.match(/mcl_refresh=([^;,\s]+)/)?.[0];
    assert.ok(cookie);

    delete process.env.SETUP_TOKEN;
    assert.equal(
      (await fetch(`${baseUrl}/api/auth/setup`, { method: 'POST', headers, body }))
        .status,
      403
    );
    const refresh = await fetch(`${baseUrl}/api/auth/refresh`, {
      method: 'POST',
      headers: {
        ...headers,
        Cookie: `mcl_refresh=stale; ${cookie}`,
        'X-Forwarded-Proto': 'http',
      },
    });
    assert.equal(refresh.status, 200);
    const refreshedCookie = refresh.headers.get('set-cookie') ?? '';
    assert.doesNotMatch(refreshedCookie, /mcl_refresh=; Path=\/api\/auth; Max-Age=0/);
    assert.match(refreshedCookie, /HttpOnly; SameSite=Lax; Secure/);
    assert.equal(
      (
        await fetch(`${baseUrl}/api/auth/refresh`, {
          method: 'POST',
          headers: { ...headers, Cookie: cookie },
        })
      ).status,
      401
    );
  } finally {
    if (server) await new Promise<void>((resolve) => server!.close(() => resolve()));
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
});

test('logout revokes active access token jti immediately and changePassword rotates credentials and sessions', async () => {
  const previousNodeEnv = process.env.NODE_ENV;
  const previousLibrarianPassword = process.env.LIBRARIAN_PASSWORD;
  process.env.NODE_ENV = 'test';
  delete process.env.LIBRARIAN_PASSWORD;

  const repository = new LocalAuthRepository({ inMemoryOnly: true });
  const authService = new AuthService(repository);
  const libraryService = new LibraryService(
    new LocalLibraryRepository({ inMemoryOnly: true })
  );
  const app = createApiApp(libraryService, authService);
  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;

  try {
    const setupRes = await fetch(`${baseUrl}/api/auth/setup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
        Origin: baseUrl,
      },
      body: JSON.stringify({
        name: 'Mei',
        email: 'mei@library.local',
        password: 'InitialPassword1!',
      }),
    });
    assert.equal(setupRes.status, 201);
    const setupData = (await setupRes.json()) as {
      accessToken: string;
      user: { canChangePassword: boolean };
    };
    assert.equal(setupData.user.canChangePassword, true);
    const cookie1 = (setupRes.headers.get('set-cookie') ?? '').split(';')[0];

    // Change password rejects wrong current password
    const wrongCurrent = await fetch(`${baseUrl}/api/auth/password`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
        Origin: baseUrl,
        Authorization: `Bearer ${setupData.accessToken}`,
      },
      body: JSON.stringify({
        currentPassword: 'WrongPassword1!',
        newPassword: 'UpdatedPassword2!',
      }),
    });
    assert.equal(wrongCurrent.status, 400);

    // Change password rejects identical password
    const samePassword = await fetch(`${baseUrl}/api/auth/password`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
        Origin: baseUrl,
        Authorization: `Bearer ${setupData.accessToken}`,
      },
      body: JSON.stringify({
        currentPassword: 'InitialPassword1!',
        newPassword: 'InitialPassword1!',
      }),
    });
    assert.equal(samePassword.status, 400);

    // Change password succeeds, revokes prior access token + refresh cookie, and issues new ones
    const changeRes = await fetch(`${baseUrl}/api/auth/password`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
        Origin: baseUrl,
        Authorization: `Bearer ${setupData.accessToken}`,
        Cookie: cookie1,
      },
      body: JSON.stringify({
        currentPassword: 'InitialPassword1!',
        newPassword: 'UpdatedPassword2!',
      }),
    });
    assert.equal(changeRes.status, 200);
    const changedData = (await changeRes.json()) as { accessToken: string };
    const cookie2 = (changeRes.headers.get('set-cookie') ?? '').split(';')[0];
    assert.ok(
      changedData.accessToken && changedData.accessToken !== setupData.accessToken
    );
    assert.ok(cookie2.startsWith('mcl_refresh=') && cookie2 !== cookie1);

    // Old access token and old refresh cookie are rejected immediately
    const oldTokenRes = await fetch(`${baseUrl}/api/books`, {
      headers: { Authorization: `Bearer ${setupData.accessToken}` },
    });
    assert.equal(oldTokenRes.status, 401);
    const oldCookieRes = await fetch(`${baseUrl}/api/auth/refresh`, {
      method: 'POST',
      headers: {
        'X-Requested-With': 'XMLHttpRequest',
        Origin: baseUrl,
        Cookie: cookie1,
      },
    });
    assert.equal(oldCookieRes.status, 401);

    // New access token works
    const newTokenRes = await fetch(`${baseUrl}/api/books`, {
      headers: { Authorization: `Bearer ${changedData.accessToken}` },
    });
    assert.equal(newTokenRes.status, 200);

    // Logout revokes the new access token immediately via jti blacklist
    const logoutRes = await fetch(`${baseUrl}/api/auth/logout`, {
      method: 'POST',
      headers: {
        'X-Requested-With': 'XMLHttpRequest',
        Origin: baseUrl,
        Authorization: `Bearer ${changedData.accessToken}`,
        Cookie: cookie2,
      },
    });
    assert.equal(logoutRes.status, 200);

    const revokedTokenRes = await fetch(`${baseUrl}/api/books`, {
      headers: { Authorization: `Bearer ${changedData.accessToken}` },
    });
    assert.equal(revokedTokenRes.status, 401);

    // Old password fails login, new password succeeds
    const oldLoginRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
        Origin: baseUrl,
      },
      body: JSON.stringify({
        email: 'mei@library.local',
        password: 'InitialPassword1!',
      }),
    });
    assert.equal(oldLoginRes.status, 401);

    const newLoginRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
        Origin: baseUrl,
      },
      body: JSON.stringify({
        email: 'mei@library.local',
        password: 'UpdatedPassword2!',
      }),
    });
    assert.equal(newLoginRes.status, 200);
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
    if (previousNodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = previousNodeEnv;
    if (previousLibrarianPassword === undefined) delete process.env.LIBRARIAN_PASSWORD;
    else process.env.LIBRARIAN_PASSWORD = previousLibrarianPassword;
  }
});

test('env-managed admin cannot change password via API', async () => {
  const previousEmail = process.env.LIBRARIAN_EMAIL;
  const previousPassword = process.env.LIBRARIAN_PASSWORD;
  process.env.LIBRARIAN_EMAIL = 'env-admin@library.local';
  process.env.LIBRARIAN_PASSWORD = 'EnvAdminPassword1!';

  const repository = new LocalAuthRepository({ inMemoryOnly: true });
  const authService = new AuthService(repository);
  try {
    const login = await authService.login(
      { email: 'env-admin@library.local', password: 'EnvAdminPassword1!' },
      '127.0.0.1'
    );
    assert.equal(login.user.canChangePassword, false);
    await assert.rejects(
      () =>
        authService.changePassword(login.user.id, {
          currentPassword: 'EnvAdminPassword1!',
          newPassword: 'AnotherPassword2!',
        }),
      (err: unknown) => err instanceof AppError && err.statusCode === 403
    );
  } finally {
    if (previousEmail === undefined) delete process.env.LIBRARIAN_EMAIL;
    else process.env.LIBRARIAN_EMAIL = previousEmail;
    if (previousPassword === undefined) delete process.env.LIBRARIAN_PASSWORD;
    else process.env.LIBRARIAN_PASSWORD = previousPassword;
  }
});

test(
  'MongoDB bootstrap and login limits are atomic across repository instances',
  {
    skip: !process.env.AUTH_TEST_MONGODB_URI,
  },
  async () => {
    const databaseName = `auth_test_${randomUUID().replaceAll('-', '')}`;
    await mongoose.connect(process.env.AUTH_TEST_MONGODB_URI!, { dbName: databaseName });
    try {
      const first = new MongoAuthRepository();
      const second = new MongoAuthRepository();
      const [userA, userB] = await Promise.all([
        first.createFirstUserAtomic({
          name: 'First User',
          email: 'first@example.com',
          passwordHash: 'hash',
        }),
        second.createFirstUserAtomic({
          name: 'Second User',
          email: 'second@example.com',
          passwordHash: 'hash',
        }),
      ]);
      assert.equal([userA, userB].filter(Boolean).length, 1);
      assert.equal(await first.countUsers(), 1);

      const counts = await Promise.all(
        Array.from({ length: 20 }, (_, index) =>
          (index % 2 ? first : second).consumeLoginAttempt('198.51.100.10', 60_000)
        )
      );
      assert.deepEqual(
        counts.sort((a, b) => a - b),
        Array.from({ length: 20 }, (_, index) => index + 1)
      );
      await second.clearLoginAttempts('198.51.100.10');
      assert.equal(await first.consumeLoginAttempt('198.51.100.10', 60_000), 1);
      assert.equal(await first.consumeLoginAttempt('198.51.100.11', -1), 1);
      assert.equal(await second.consumeLoginAttempt('198.51.100.11', 60_000), 1);

      await mongoose.connection.dropDatabase();
      const existing = await UserModel.create({
        name: 'Existing User',
        email: 'existing@example.com',
        role: 'admin',
        passwordHash: 'hash',
        refreshTokens: [
          {
            tokenHash: hashRefreshToken('legacy-refresh-token'),
            expiresAt: new Date(Date.now() + 60_000),
          },
        ],
      });
      assert.equal(
        await second.createFirstUserAtomic({
          name: 'Another User',
          email: 'other@example.com',
          passwordHash: 'hash',
        }),
        null
      );
      assert.ok(await first.findUserById(String(existing._id)));
      const legacySession = await new AuthService(first).refresh('legacy-refresh-token');
      assert.equal(legacySession.user.id, String(existing._id));
      await UserModel.collection.updateOne(
        { _id: existing._id },
        { $unset: { tokenVersion: '' } }
      );
      const addedLegacy = await first.addRefreshToken(String(existing._id), 0, {
        tokenHash: hashRefreshToken('legacy-login-token'),
        expiresAt: new Date(Date.now() + 60_000).toISOString(),
      });
      assert.equal(addedLegacy, true);
      assert.equal(await first.incrementTokenVersion(String(existing._id), 0), true);
    } finally {
      await mongoose.connection.dropDatabase();
      await mongoose.disconnect();
    }
  }
);

test('authCrypto rejects non-hex password hashes, null JWT JSON, and <32-byte prod JWT_SECRET', async () => {
  assert.equal(await verifyPassword('anything', 'scrypt$0011223344556677$zzzz'), false);
  assert.equal(await verifyPassword('anything', 'scrypt$0011223344556677$abcd'), false);
  assert.equal(await verifyPassword('anything', 'scrypt$$'), false);

  assert.equal(timingSafeStringEqual('secret', 'secret'), true);
  assert.equal(timingSafeStringEqual('secret', 'different-length-secret'), false);

  // null header or null payload must return null without throwing TypeError
  const b64Null = Buffer.from('null').toString('base64url');
  assert.equal(verifyAccessToken(`${b64Null}.${b64Null}.sig`), null);

  const validHeader = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString(
    'base64url'
  );
  const signingInput = `${validHeader}.${b64Null}`;
  const validSig = crypto
    .createHmac('sha256', getJwtSecret())
    .update(signingInput)
    .digest('base64url');
  assert.equal(verifyAccessToken(`${signingInput}.${validSig}`), null);

  const prevEnv = process.env.NODE_ENV;
  const prevSecret = process.env.JWT_SECRET;
  try {
    process.env.NODE_ENV = 'production';
    process.env.JWT_SECRET = 'a'.repeat(31);
    assert.throws(() => getJwtSecret(), /32 bytes/);
    process.env.JWT_SECRET = 'a'.repeat(32);
    assert.equal(getJwtSecret(), 'a'.repeat(32));
  } finally {
    if (prevEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = prevEnv;
    if (prevSecret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = prevSecret;
  }
});

test('revoked access token replay on logout cannot DoS-bump tokenVersion and refresh uses post-update tokenVersion', async () => {
  const repo = new LocalAuthRepository({ inMemoryOnly: true });
  const authService = new AuthService(repo);
  const s1 = await authService.setupInitialAccount({
    name: 'Mei Lin',
    email: 'mei@communitylibrary.org',
    password: 'StrongPassword#2026',
  });

  // Log out s1 -> tokenVersion bumps 0 -> 1
  await authService.logout(s1.refreshToken, s1.accessToken);
  assert.equal(await authService.verifyBearerToken(s1.accessToken), null);

  // Fresh login gets tokenVersion = 1
  const s2 = await authService.login(
    { email: 'mei@communitylibrary.org', password: 'StrongPassword#2026' },
    '198.51.100.1'
  );
  assert.ok(await authService.verifyBearerToken(s2.accessToken));

  // Replaying revoked s1 accessToken to logout must NOT bump tokenVersion to 2
  await authService.logout(undefined, s1.accessToken);
  assert.ok(await authService.verifyBearerToken(s2.accessToken));

  // Simulate another device bumping tokenVersion while s2 refreshes: rotated JWT must carry latest tv
  const originalRotate = repo.rotateRefreshToken.bind(repo);
  repo.rotateRefreshToken = async (userId, oldHash, newToken, familyId) => {
    await repo.incrementTokenVersion(userId, 1);
    return originalRotate(userId, oldHash, newToken, familyId);
  };
  const refreshed = await authService.refresh(s2.refreshToken);
  assert.ok(await authService.verifyBearerToken(refreshed.accessToken));
});

test('env-managed admin isolates MongoDB users and binds tokens to boot + credential epoch', async () => {
  const prevEmail = process.env.LIBRARIAN_EMAIL;
  const prevPassword = process.env.LIBRARIAN_PASSWORD;
  delete process.env.LIBRARIAN_EMAIL;
  delete process.env.LIBRARIAN_PASSWORD;

  const repo = new LocalAuthRepository({ inMemoryOnly: true });
  const authService = new AuthService(repo);
  const dbSession = await authService.setupInitialAccount({
    name: 'DB Admin',
    email: 'db@library.local',
    password: 'DbPassword#2026',
  });

  try {
    process.env.LIBRARIAN_EMAIL = 'env@library.local';
    process.env.LIBRARIAN_PASSWORD = 'EnvPassword#2026';

    // DB user credentials, refresh token, and bearer token must NOT work when envAdmin is active
    await assert.rejects(
      () =>
        authService.login(
          { email: 'db@library.local', password: 'DbPassword#2026' },
          '198.51.100.2'
        ),
      (err: unknown) => err instanceof AppError && err.statusCode === 401
    );
    await assert.rejects(
      () => authService.refresh(dbSession.refreshToken),
      (err: unknown) => err instanceof AppError && err.statusCode === 401
    );
    assert.equal(await authService.verifyBearerToken(dbSession.accessToken), null);

    const envSession = await authService.login(
      { email: 'env@library.local', password: 'EnvPassword#2026' },
      '198.51.100.2'
    );
    assert.equal(envSession.user.id, 'env-librarian');
    const decoded = verifyAccessToken(envSession.accessToken);
    assert.ok(decoded && decoded.sub.startsWith('env-librarian:'));
    assert.equal(
      (await authService.verifyBearerToken(envSession.accessToken))?.id,
      'env-librarian'
    );

    // Simulated server restart (new AuthService instance with new bootNonce) invalidates token immediately
    const restarted = new AuthService(repo);
    assert.equal(await restarted.verifyBearerToken(envSession.accessToken), null);

    // Rotating LIBRARIAN_PASSWORD immediately invalidates prior env access and refresh tokens
    process.env.LIBRARIAN_PASSWORD = 'RotatedEnvPassword#2026';
    assert.equal(await authService.verifyBearerToken(envSession.accessToken), null);
    await assert.rejects(
      () => authService.refresh(envSession.refreshToken),
      (err: unknown) => err instanceof AppError && err.statusCode === 401
    );
  } finally {
    if (prevEmail === undefined) delete process.env.LIBRARIAN_EMAIL;
    else process.env.LIBRARIAN_EMAIL = prevEmail;
    if (prevPassword === undefined) delete process.env.LIBRARIAN_PASSWORD;
    else process.env.LIBRARIAN_PASSWORD = prevPassword;
  }
});

test('whitespace passwords rejected, invalid changePassword does not burn rate limit, and CAS races fail safely', async () => {
  const repo = new LocalAuthRepository({ inMemoryOnly: true });
  const authService = new AuthService(repo);

  await assert.rejects(
    () =>
      authService.setupInitialAccount({
        name: 'Mei Lin',
        email: 'mei@communitylibrary.org',
        password: '        ',
      }),
    (err: unknown) =>
      err instanceof AppError &&
      err.statusCode === 400 &&
      Boolean(err.fieldErrors?.password)
  );

  const session = await authService.setupInitialAccount({
    name: 'Mei Lin',
    email: 'mei@communitylibrary.org',
    password: 'StrongPassword#2026',
  });

  // 12 invalid password change inputs (whitespace / mismatch) must NOT consume rate-limit budget
  for (let i = 0; i < 12; i++) {
    await assert.rejects(
      () =>
        authService.changePassword(session.user.id, {
          currentPassword: 'StrongPassword#2026',
          newPassword: i % 2 === 0 ? '        ' : 'AnotherValid#2026',
          confirmPassword: 'DoesNotMatch#2026',
        }),
      (err: unknown) => err instanceof AppError && err.statusCode === 400
    );
  }

  // Valid change still succeeds (not 429)
  const changed = await authService.changePassword(session.user.id, {
    currentPassword: 'StrongPassword#2026',
    newPassword: 'UpdatedPassword#2026',
    confirmPassword: 'UpdatedPassword#2026',
  });
  assert.ok(changed.accessToken);

  // Concurrent login failing CAS addRefreshToken throws 401
  const origAdd = repo.addRefreshToken.bind(repo);
  repo.addRefreshToken = async () => false;
  await assert.rejects(
    () =>
      authService.login(
        { email: 'mei@communitylibrary.org', password: 'UpdatedPassword#2026' },
        '198.51.100.5'
      ),
    (err: unknown) => err instanceof AppError && err.statusCode === 401
  );
  repo.addRefreshToken = origAdd;

  // Concurrent changePassword failing CAS updatePasswordAndReplaceSessions throws 409
  repo.updatePasswordAndReplaceSessions = async () => null;
  await assert.rejects(
    () =>
      authService.changePassword(session.user.id, {
        currentPassword: 'UpdatedPassword#2026',
        newPassword: 'ThirdPassword#2026',
      }),
    (err: unknown) => err instanceof AppError && err.statusCode === 409
  );
});

test('refresh enforces 30-day session cap, 5s multi-tab grace preserving cookie, and stolen token family revocation', async (t) => {
  const repo = new LocalAuthRepository({ inMemoryOnly: true });
  const authService = new AuthService(repo);
  const libraryService = new LibraryService(
    new LocalLibraryRepository({ inMemoryOnly: true })
  );
  const app = createApiApp(libraryService, authService);
  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;

  try {
    let fakeNow = Date.now();
    t.mock.method(Date, 'now', () => fakeNow);

    const s1 = await authService.setupInitialAccount({
      name: 'Mei Lin',
      email: 'mei@communitylibrary.org',
      password: 'StrongPassword#2026',
    });
    // Separate device session in its own family
    const device2 = await authService.login(
      { email: 'mei@communitylibrary.org', password: 'StrongPassword#2026' },
      '198.51.100.99'
    );

    // Tab 1 refreshes s1 -> gets s1Next
    const s1Next = await authService.refresh(s1.refreshToken);

    // Tab 2 submits old s1 token 1s later (within 5s grace): returns 401 WITHOUT clearing cookie and keeps s1Next alive
    fakeNow += 1_000;
    const graceRes = await fetch(`${baseUrl}/api/auth/refresh`, {
      method: 'POST',
      headers: {
        'X-Requested-With': 'XMLHttpRequest',
        Origin: baseUrl,
        Cookie: `mcl_refresh=${encodeURIComponent(s1.refreshToken)}`,
      },
    });
    assert.equal(graceRes.status, 401);
    assert.equal(graceRes.headers.get('set-cookie'), null);

    await assert.rejects(
      () => authService.refresh(s1.refreshToken),
      (err: unknown) => err instanceof RefreshGraceError && err.clearCookie === false
    );

    // Tab 1's rotated token is still valid and rotates to s1Next2
    const s1Next2 = await authService.refresh(s1Next.refreshToken);
    assert.ok(await authService.verifyBearerToken(s1Next2.accessToken));

    // Attacker replays consumed s1 token 10s later (> 5s grace): clears cookie, revokes s1 family, bumps tokenVersion
    fakeNow += 10_000;
    const reuseRes = await fetch(`${baseUrl}/api/auth/refresh`, {
      method: 'POST',
      headers: {
        'X-Requested-With': 'XMLHttpRequest',
        Origin: baseUrl,
        Cookie: `mcl_refresh=${encodeURIComponent(s1.refreshToken)}`,
      },
    });
    assert.equal(reuseRes.status, 401);
    assert.match(reuseRes.headers.get('set-cookie') ?? '', /Max-Age=0/);

    // s1Next2 (same family) is revoked, and its JWT is invalidated
    assert.equal(await authService.verifyBearerToken(s1Next2.accessToken), null);
    await assert.rejects(
      () => authService.refresh(s1Next2.refreshToken),
      (err: unknown) => err instanceof AppError && err.statusCode === 401
    );

    // Device 2 (different family) can still refresh and get a fresh JWT with new tokenVersion
    const d2Refreshed = await authService.refresh(device2.refreshToken);
    assert.ok(await authService.verifyBearerToken(d2Refreshed.accessToken));

    // 28 days later: refresh is capped to remaining ~2 days instead of full 7 days
    fakeNow += 28 * 24 * 60 * 60 * 1000;
    // First refresh within 7-day rolling window isn't expired if we step in 5-day hops:
    fakeNow -= 28 * 24 * 60 * 60 * 1000;
    let rolling = d2Refreshed;
    for (let day = 0; day < 28; day += 4) {
      fakeNow += 4 * 24 * 60 * 60 * 1000;
      rolling = await authService.refresh(rolling.refreshToken);
    }
    // 28 days elapsed -> max remaining session lifetime is ~2 days (< 3 days)
    assert.ok(rolling.refreshMaxAgeSeconds <= 3 * 24 * 60 * 60);

    // Past 30-day absolute cap -> session expires even within rolling window
    fakeNow += 3 * 24 * 60 * 60 * 1000;
    await assert.rejects(
      () => authService.refresh(rolling.refreshToken),
      (err: unknown) => err instanceof AppError && err.statusCode === 401
    );
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
});

test('IPv6 /64 normalization, per-(ip,email) lockout isolation, setup rate limit, CSRF headers, and health 503', async () => {
  assert.equal(normalizeClientIp('::ffff:192.0.2.1'), '192.0.2.1');
  assert.equal(normalizeClientIp('::ffff:c000:0201'), '192.0.2.1');
  assert.equal(
    normalizeClientIp('2001:db8:1:2::1'),
    normalizeClientIp('2001:0db8:0001:0002:abcd::99')
  );
  assert.equal(normalizeClientIp('2001:db8:1:2::1'), '2001:0db8:0001:0002::/64');

  const repo = new LocalAuthRepository({ inMemoryOnly: true });
  const authService = new AuthService(repo);
  const libraryService = new LibraryService(
    new LocalLibraryRepository({ inMemoryOnly: true })
  );

  // Pruning expired loginAttempts works cleanly
  assert.equal(await repo.consumeLoginAttempt('expired-key', -10), 1);
  assert.equal(await repo.consumeLoginAttempt('expired-key', 60_000), 1);

  await authService.setupInitialAccount({
    name: 'Mei Lin',
    email: 'mei@communitylibrary.org',
    password: 'StrongPassword#2026',
  });

  // Distributed attacker failing from 30 distinct IPs cannot globally lock out admin email
  for (let i = 0; i < 30; i++) {
    await assert.rejects(
      () =>
        authService.login(
          { email: 'mei@communitylibrary.org', password: 'WrongPassword!' },
          `203.0.113.${i + 1}`
        ),
      (err: unknown) => err instanceof AppError && err.statusCode === 401
    );
  }
  const adminLogin = await authService.login(
    { email: 'mei@communitylibrary.org', password: 'StrongPassword#2026' },
    '198.51.100.77'
  );
  assert.equal(adminLogin.user.email, 'mei@communitylibrary.org');

  // Single IP spraying 15 distinct emails gets blocked on 16th attempt
  for (let i = 0; i < 15; i++) {
    await assert.rejects(
      () =>
        authService.login(
          { email: `user${i}@example.com`, password: 'WrongPassword!' },
          '198.51.100.88'
        ),
      (err: unknown) => err instanceof AppError && err.statusCode === 401
    );
  }
  await assert.rejects(
    () =>
      authService.login(
        { email: 'user15@example.com', password: 'WrongPassword!' },
        '198.51.100.88'
      ),
    (err: unknown) => err instanceof AppError && err.statusCode === 429
  );

  // HTTP checks: CSRF Sec-Fetch-Site/empty Origin/Referer, setup rate limit, health 503, prod DB error masking
  const prevEnv = process.env.NODE_ENV;
  const prevJwt = process.env.JWT_SECRET;
  let dbConnected = true;
  const freshAuth = new AuthService(new LocalAuthRepository({ inMemoryOnly: true }));
  const app = createApiApp(libraryService, freshAuth, {
    ensureDatabase: async () => ({
      connected: dbConnected,
      databaseName: dbConnected ? 'testdb' : null,
      lastError: dbConnected ? null : 'Detailed internal Atlas URI failure',
    }),
  });
  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;

  try {
    // Sec-Fetch-Site: cross-site rejected with 403
    const crossSite = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
        'Sec-Fetch-Site': 'cross-site',
      },
      body: JSON.stringify({ email: 'a@b.com', password: 'password123' }),
    });
    assert.equal(crossSite.status, 403);

    // Empty Origin rejected with 403
    const emptyOrigin = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
        Origin: '',
      },
      body: JSON.stringify({ email: 'a@b.com', password: 'password123' }),
    });
    assert.equal(emptyOrigin.status, 403);

    // Cross-origin Referer when Origin is absent rejected with 403
    const badReferer = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
        Referer: 'https://evil.example/steal',
      },
      body: JSON.stringify({ email: 'a@b.com', password: 'password123' }),
    });
    assert.equal(badReferer.status, 403);

    // Setup rate-limited after 10 attempts (11th -> 429)
    for (let i = 0; i < 11; i++) {
      const res = await fetch(`${baseUrl}/api/auth/setup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
          Origin: baseUrl,
        },
        body: JSON.stringify({ name: 'A', email: 'bad', password: 'short' }),
      });
      assert.equal(res.status, i < 10 ? 400 : 429);
    }

    // Health returns 503 when disconnected and masks lastError in production
    dbConnected = false;
    process.env.NODE_ENV = 'production';
    const degradedHealth = await fetch(`${baseUrl}/api/health`);
    assert.equal(degradedHealth.status, 503);
    const degradedBody = (await degradedHealth.json()) as { status: string };
    assert.equal(degradedBody.status, 'degraded');

    const maskedDbErr = await fetch(`${baseUrl}/api/books`);
    assert.equal(maskedDbErr.status, 503);
    const maskedBody = (await maskedDbErr.json()) as { error: string };
    assert.equal(maskedBody.error, 'Database service is currently unavailable.');
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
    if (prevEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = prevEnv;
    if (prevJwt === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = prevJwt;
  }
});

test('MongoAuthRepository matches legacy users missing tokenVersion when expectedTokenVersion is 0', async () => {
  const repo = new MongoAuthRepository();
  const userId = '000000000000000000000001';
  const calls: Array<{ filter: unknown; update: unknown; options: unknown }> = [];
  const origUpdateOne = UserModel.updateOne;
  (UserModel as unknown as Record<string, unknown>).updateOne = async (
    filter: unknown,
    update: unknown,
    options: unknown
  ) => {
    calls.push({ filter, update, options });
    return { modifiedCount: 1 };
  };
  try {
    assert.equal(
      await repo.addRefreshToken(userId, 0, {
        tokenHash: 'hash-1',
        expiresAt: new Date(Date.now() + 60_000).toISOString(),
      }),
      true
    );
    assert.deepEqual(calls[0]?.filter, {
      _id: userId,
      $or: [
        { tokenVersion: 0 },
        { tokenVersion: { $exists: false } },
        { tokenVersion: null },
      ],
    });
    assert.equal(
      await repo.addRefreshToken(userId, 2, {
        tokenHash: 'hash-2',
        expiresAt: new Date(Date.now() + 60_000).toISOString(),
      }),
      true
    );
    assert.deepEqual(calls[1]?.filter, { _id: userId, tokenVersion: 2 });

    assert.equal(await repo.incrementTokenVersion(userId, 0), true);
    assert.deepEqual(calls[2]?.filter, {
      _id: userId,
      $or: [
        { tokenVersion: 0 },
        { tokenVersion: { $exists: false } },
        { tokenVersion: null },
      ],
    });
    assert.equal(await repo.incrementTokenVersion(userId, 3), true);
    assert.deepEqual(calls[3]?.filter, { _id: userId, tokenVersion: 3 });
  } finally {
    (UserModel as unknown as Record<string, unknown>).updateOne = origUpdateOne;
  }
});
