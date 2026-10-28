import { z } from 'zod/v4';

export const dedupeKey = z
  .string()
  .min(1)
  .max(200)
  .optional()
  .describe(
    'A key derived from the event this call reports, such as "order-1234-shipped" or "daily-revenue-2026-10-29". Calling again with the same key and the same input returns the first answer instead of sending twice. The same key with different input is refused with idempotency_key_reused, so keep changing values such as the time out of a deduplicated message. A refusal (for example insufficient_credits or a bad number) is remembered under the key too: after fixing it, retry with a new key. Keys are remembered for about 24 hours.'
  );

export function idempotencyKey(tool: string, key: string | undefined): string | undefined {
  return key === undefined ? undefined : `mcp:${tool}:${key}`;
}
