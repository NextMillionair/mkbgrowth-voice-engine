/**
 * Read-only connectivity check for the MKB Growth / LobbyStack voice runtime.
 * This command never creates companies, provisions phone numbers, or incurs call costs.
 * No secrets are printed in output, error messages or logs.
 */
import { pathToFileURL } from 'node:url';

export function validateRuntimeConfig(env = process.env) {
  const rawUrl = String(env.LOBBYSTACK_BASE_URL ?? '').trim();
  const apiKey = String(env.LOBBYSTACK_PLATFORM_KEY ?? '').trim();
  if (!rawUrl || !apiKey) {
    throw new Error('LOBBYSTACK_BASE_URL and LOBBYSTACK_PLATFORM_KEY must be set as server environment variables.');
  }
  let url;
  try { url = new URL(rawUrl); }
  catch { throw new Error('Invalid LOBBYSTACK_BASE_URL.'); }

  if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash) {
    throw new Error('LOBBYSTACK_BASE_URL must use HTTPS and have no credentials, query or fragment.');
  }
  if (!url.hostname.includes('.') || /^(?:localhost|127\.|10\.|192\.168\.|169\.254\.|0\.0\.0\.0|::1)/i.test(url.hostname)) {
    throw new Error('LOBBYSTACK_BASE_URL must point at a public HTTPS hostname.');
  }
  return { origin: url.origin, apiKey };
}

export async function checkRuntime({ origin, apiKey }, fetchImpl = fetch) {
  const url = new URL('/api/v1/me', origin);
  const response = await fetchImpl(url, {
    method: 'GET',
    headers: { Authorization: `Bearer ${apiKey}`, Accept: 'application/json' },
    redirect: 'error',
    signal: AbortSignal.timeout(10000),
  });
  if (!response.ok) throw new Error(`LobbyStack API status ${response.status}; check deployment and platform key permissions.`);
  const payload = await response.json();
  const scopes = payload?.data?.api_key?.scopes;
  return {
    status: 'connected',
    api: '/api/v1/me',
    base_url: origin,
    scopes: Array.isArray(scopes) ? scopes : [],
    read_only: true,
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const config = validateRuntimeConfig();
    const result = await checkRuntime(config);
    process.stdout.write(JSON.stringify(result, null, 2) + '\n');
  } catch (error) {
    const reason = error instanceof Error ? error.message : 'Unknown error';
    process.stderr.write(JSON.stringify({ status: 'not_connected', error: reason }) + '\n');
    process.exitCode = 1;
  }
}
