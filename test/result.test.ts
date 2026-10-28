import { SendKuy } from 'sendkuy';
import { describe, expect, test } from 'vitest';
import type { CallToolResult } from '@modelcontextprotocol/server';
import { keylessError, toolError } from '../src/tools/result';
import { apiError, fakeFetch, json, noSleep } from './support';

async function caught(reply: Response): Promise<unknown> {
  const { fetch } = fakeFetch(reply);
  const client = new SendKuy('sk_live_test', { fetch, sleep: noSleep, maxRetries: 0 });

  return client.account.get().then(
    () => {
      throw new Error('expected the call to fail');
    },
    (error: unknown) => error
  );
}

function body(result: CallToolResult): Record<string, unknown> {
  const [first] = result.content;

  return JSON.parse(first?.type === 'text' ? first.text : '{}') as Record<string, unknown>;
}

describe('toolError', () => {
  test('a validation error reaches the agent with its param and doc_url', async () => {
    const result = toolError(
      await caught(
        json(422, apiError(422, 'invalid_request_error', 'validation_failed', 'Bad number.', 'to'))
      )
    );

    expect(result.isError).toBe(true);
    expect(result.structuredContent).toBeUndefined();
    expect(body(result)).toMatchObject({
      code: 'validation_failed',
      param: 'to',
      doc_url: 'https://docs.sendkuy.com/errors#validation_failed',
    });
  });

  test('a rate limit carries retry_after', async () => {
    const result = toolError(
      await caught(
        json(429, apiError(429, 'rate_limit_error', 'rate_limit_exceeded', 'Slow down.'), {
          'retry-after': '42',
        })
      )
    );

    expect(body(result)).toMatchObject({ code: 'rate_limit_exceeded', retry_after: 42 });
  });

  test('running out of credit says to top up', async () => {
    const result = toolError(
      await caught(
        json(402, apiError(402, 'authorization_error', 'insufficient_credits', 'No credit.'))
      )
    );

    expect(String(body(result).message)).toMatch(/top up/i);
  });
});

describe('toolError with a dedupe_key', () => {
  test('a remembered refusal tells the agent to retry under a new dedupe_key', async () => {
    const error = await caught(
      json(402, apiError(402, 'authorization_error', 'insufficient_credits', 'No credit.'))
    );

    expect(String(body(toolError(error, true)).message)).toMatch(/new dedupe_key/);
    expect(String(body(toolError(error, false)).message)).not.toMatch(/dedupe_key/);
  });

  test('a reused key says the first request stands', async () => {
    const error = await caught(
      json(409, apiError(409, 'invalid_request_error', 'idempotency_key_reused', 'Key reused.'))
    );

    const message = String(body(toolError(error, true)).message);

    expect(message).toMatch(/first one stands/);
    expect(message).not.toMatch(/retry with a new dedupe_key/);
  });
});

describe('keylessError', () => {
  test('tells the agent to set SENDKUY_API_KEY and where to get one', () => {
    const result = keylessError();

    expect(result.isError).toBe(true);
    expect(JSON.stringify(result.content)).toContain('SENDKUY_API_KEY');
    expect(JSON.stringify(result.content)).toContain('https://app.sendkuy.com/user/api');
  });
});
