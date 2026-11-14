import test from 'node:test';
import assert from 'node:assert/strict';
import { checkRuntime, validateRuntimeConfig } from './check-runtime.mjs';

test('validates secure server-side credentials without revealing them', () => {
  const cfg = validateRuntimeConfig({
    LOBBYSTACK_BASE_URL: 'https://voice.example.nl',
    LOBBYSTACK_PLATFORM_KEY: 'example-secret',
  });
  assert.equal(cfg.origin, 'https://voice.example.nl');
  assert.equal(cfg.apiKey, 'example-secret');
});

test('rejects missing and unsafe endpoints', () => {
  assert.throws(() => validateRuntimeConfig({}), /must be set/);
  for (const url of ['http://voice.example.nl', 'https://localhost:3000', 'https://127.0.0.1', 'https://foo:bar@voice.example.nl', 'https://voice.example.nl?token=bad']) {
    assert.throws(() => validateRuntimeConfig({ LOBBYSTACK_BASE_URL: url, LOBBYSTACK_PLATFORM_KEY: 'secret' }));
  }
});

test('performs GET-only connectivity check and returns non-sensitive metadata', async () => {
  let called = false;
  const fetchMock = async (url, opts) => {
    called = true;
    assert.equal(String(url), 'https://voice.example.nl/api/v1/me');
    assert.equal(opts.method, 'GET');
    assert.equal(opts.headers.Authorization, 'Bearer example-secret');
    return { ok: true, json: async () => ({ data: { api_key: { scopes: ['business:read', 'businesses:create'] } } }) };
  };
  const result = await checkRuntime({origin: 'https://voice.example.nl', apiKey: 'example-secret'}, fetchMock);
  assert.equal(called, true);
  assert.equal(result.status, 'connected');
  assert.equal(JSON.stringify(result).includes('example-secret'), false);
  assert.equal(result.read_only, true);
});

test('does not include secret in provider failure', async () => {
  const fetchMock = async () => ({ok:false,status:401});
  await assert.rejects(checkRuntime({origin:'https://voice.example.nl',apiKey:'example-secret'}, fetchMock), err => {
    assert.equal(err.message.includes('example-secret'), false);
    assert.match(err.message, /401/);
    return true;
  });
});
