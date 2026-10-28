import {
  AuthenticationError,
  AuthorizationError,
  SendKuy,
  SendKuyError,
  type ClientOptions,
} from 'sendkuy';
import { API_KEY_PAGE } from './tools/result';

export type Access = { mode: 'keyless' } | { mode: 'key'; client: SendKuy; scopes: string[] };

export class StartupError extends Error {}

function reason(error: unknown): string {
  if (error instanceof AuthenticationError) {
    return `SendKuy API key is invalid or revoked. Create one at ${API_KEY_PAGE}`;
  }

  if (error instanceof AuthorizationError && error.code === 'insufficient_scope') {
    return `This key needs the account:read scope. Edit it at ${API_KEY_PAGE}`;
  }

  const message = error instanceof Error ? error.message : String(error);
  const requestId =
    error instanceof SendKuyError && error.requestId ? ` (request ${error.requestId})` : '';

  const refused = error instanceof SendKuyError && error.status >= 400 && error.status < 500;

  return `${refused ? 'SendKuy refused the key' : 'Could not reach SendKuy'}: ${message}${requestId}`;
}

export async function resolveAccess(
  env: NodeJS.ProcessEnv,
  options: ClientOptions = {}
): Promise<Access> {
  const key = env.SENDKUY_API_KEY?.trim();

  if (!key) return { mode: 'keyless' };

  const baseUrl = env.SENDKUY_BASE_URL?.trim();
  const client = new SendKuy(key, { ...(baseUrl ? { baseUrl } : {}), ...options });

  try {
    const account = await client.account.get();

    return { mode: 'key', client, scopes: [...account.scopes] };
  } catch (error) {
    throw new StartupError(reason(error));
  }
}
