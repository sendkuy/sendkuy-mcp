import type { Message } from 'sendkuy';
import { z } from 'zod/v4';

export const channel = z.enum(['whatsapp', 'sms', 'email']);

export const limit = z
  .number()
  .int()
  .min(1)
  .max(100)
  .default(20)
  .describe('How many to return, 1 to 100.');

export const cursor = z
  .string()
  .optional()
  .describe('next_cursor from the previous page, to read the next one.');

export const media = z
  .object({
    url: z.url(),
    type: z.enum(['image', 'video', 'audio', 'document']),
    filename: z.string().max(255).optional(),
  })
  .describe('WhatsApp only. One attachment, fetched from a URL you host.');

export const scheduleAt = z
  .string()
  .optional()
  .describe(
    'Send later instead of now, as ISO 8601 with a time zone offset, for example 2026-11-01T09:00:00+07:00.'
  );

export const gatewayId = z
  .string()
  .optional()
  .describe(
    'Optional sender. Leave it out and SendKuy picks a live sender on the channel and moves to the next one if it fails.'
  );

export const messageSummary = z.object({
  id: z.string(),
  channel: z.string(),
  status: z.string(),
  to: z.string().nullable(),
  subject: z.string().nullable(),
  campaign_id: z.string().nullable(),
  error: z.string().nullable(),
  scheduled_at: z.string().nullable(),
  sent_at: z.string().nullable(),
  delivered_at: z.string().nullable(),
  read_at: z.string().nullable(),
  created_at: z.string(),
});

export function summarizeMessage(message: Message): z.infer<typeof messageSummary> {
  return {
    id: message.id,
    channel: message.channel,
    status: message.status,
    to: message.to,
    subject: message.subject,
    campaign_id: message.campaign_id,
    error: message.error,
    scheduled_at: message.scheduled_at,
    sent_at: message.sent_at,
    delivered_at: message.delivered_at,
    read_at: message.read_at,
    created_at: message.created_at,
  };
}

export const apiFailure = z.object({
  code: z.string(),
  message: z.string(),
  param: z.string().nullable().optional(),
});

export async function inBatches<T, R>(
  items: readonly T[],
  size: number,
  work: (item: T) => Promise<R>
): Promise<R[]> {
  const results: R[] = [];

  for (let start = 0; start < items.length; start += size) {
    results.push(...(await Promise.all(items.slice(start, start + size).map(work))));
  }

  return results;
}
