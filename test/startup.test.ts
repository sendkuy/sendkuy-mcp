import { describe, expect, test } from 'vitest';
import { resolveAccess, StartupError } from '../src/startup';
import { account, apiError, fakeFetch, json, noSleep } from './support';

const env = { SENDKUY_API_KEY: 'sk_live_test' };

describe('resolveAccess', () => {
  test('without SENDKUY_API_KEY it starts keyless and never calls the API', async () => {
    const { fetch, requests } = fakeFetch();

    await expect(resolveAccess({ SENDKUY_API_KEY: '  ' }, { fetch })).resolves.toEqual({
      mode: 'keyless',
    });
    expect(requests).toHaveLength(0);
  });

  test('a 401 stops start-up with a message about the key', async () => {
    const { fetch } = fakeFetch(
      json(401, apiError(401, 'authentication_error', 'invalid_api_key', 'Invalid key.'))
    );

    const failure = resolveAccess(env, { fetch, sleep: noSleep });

    await expect(failure).rejects.toBeInstanceOf(StartupError);
    await expect(failure).rejects.toThrow(/invalid or revoked/i);
  });

  test('a 403 insufficient_scope stops start-up and names account:read', async () => {
    const { fetch } = fakeFetch(
      json(403, apiError(403, 'authorization_error', 'insufficient_scope', 'Missing scope.'))
    );

    await expect(resolveAccess(env, { fetch, sleep: noSleep })).rejects.toThrow(/account:read/);
  });

  test('a network failure stops start-up', async () => {
    const { fetch } = fakeFetch(
      new TypeError('fetch failed'),
      new TypeError('fetch failed'),
      new TypeError('fetch failed')
    );

    await expect(resolveAccess(env, { fetch, sleep: noSleep })).rejects.toBeInstanceOf(
      StartupError
    );
  });

  test('with a key it reads the scopes', async () => {
    const { fetch, requests } = fakeFetch(json(200, account(['account:read', 'messages:read'])));

    const access = await resolveAccess(env, { fetch });

    expect(access).toMatchObject({ mode: 'key', scopes: ['account:read', 'messages:read'] });
    expect(requests[0]!.headers.get('authorization')).toBe('Bearer sk_live_test');
  });
});
