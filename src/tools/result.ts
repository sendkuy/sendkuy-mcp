import type { CallToolResult } from '@modelcontextprotocol/server';
import { SendKuyError } from 'sendkuy';

export const API_KEY_PAGE = 'https://app.sendkuy.com/user/api';

function text(data: Record<string, unknown>): CallToolResult['content'] {
  return [{ type: 'text', text: JSON.stringify(data) }];
}

export function ok(data: Record<string, unknown>): CallToolResult {
  return { structuredContent: data, content: text(data) };
}

function failure(data: Record<string, unknown>): CallToolResult {
  return { isError: true, content: text(data) };
}

function hint(code: string | null): string {
  if (code === 'insufficient_scope')
    return ' Add the scope to this key and restart the MCP client.';
  if (code === 'insufficient_credits') return ' Top up credits in SendKuy.';
  if (code === 'idempotency_key_reused')
    return ' A request with this dedupe_key already went through with different content, and the first one stands. Do not resend under a new dedupe_key unless you mean to send again.';
  return '';
}

function remembered(error: SendKuyError, deduped: boolean): string {
  if (!deduped || error.code === 'idempotency_key_reused') return '';
  if (error.status < 400 || error.status >= 500 || error.status === 429) return '';

  return ' This refusal is remembered under this dedupe_key for about 24 hours: after fixing the input or topping up, retry with a new dedupe_key.';
}

export function toolError(error: unknown, deduped = false): CallToolResult {
  if (error instanceof SendKuyError) {
    return failure({
      code: error.code ?? 'internal_error',
      message: error.message + hint(error.code) + remembered(error, deduped),
      param: error.param,
      doc_url: error.docUrl,
      request_id: error.requestId,
      ...(error.retryAfter !== null ? { retry_after: error.retryAfter } : {}),
    });
  }

  return failure({
    code: 'tool_error',
    message: error instanceof Error ? error.message : String(error),
  });
}

export function keylessError(): CallToolResult {
  return failure({
    code: 'missing_api_key',
    message: `Set SENDKUY_API_KEY in this MCP server's environment and restart the client. Create a key at ${API_KEY_PAGE}`,
  });
}
