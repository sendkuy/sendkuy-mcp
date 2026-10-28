import type { Webhook } from 'sendkuy';
import { z } from 'zod/v4';
import { defineTool, READ_ONLY } from './types';

const MAX_WEBHOOKS = 5;

const delivery = z.object({
  id: z.string(),
  event: z.string(),
  attempt: z.number(),
  status_code: z.number().nullable(),
  error: z.string().nullable(),
  response_excerpt: z.string().nullable(),
  delivered_at: z.string().nullable(),
  next_retry_at: z.string().nullable(),
  created_at: z.string(),
});

export const listWebhookDeliveries = defineTool({
  name: 'sendkuy_list_webhook_deliveries',
  title: 'List webhook deliveries',
  description:
    'Show the webhooks on this account and their latest delivery attempts: the HTTP status your endpoint answered, the error, an excerpt of the response, and when the next retry is due. Use it to answer "why is my webhook failing?". Without webhook_id it reads the first five webhooks.',
  scopes: ['webhooks:read'],
  operations: ['listWebhooks', 'getWebhook', 'listWebhookDeliveries'],
  annotations: READ_ONLY,
  inputSchema: z.object({
    webhook_id: z
      .string()
      .optional()
      .describe('A webhook id, wh_... Leave it out to read the first five webhooks.'),
    limit: z
      .number()
      .int()
      .min(1)
      .max(100)
      .default(10)
      .describe('Deliveries per webhook, 1 to 100.'),
  }),
  outputSchema: z.object({
    webhooks: z.array(
      z.object({
        id: z.string(),
        url: z.string(),
        status: z.string(),
        events: z.array(z.string()),
        consecutive_failures: z.number(),
        last_failure_at: z.string().nullable(),
        disabled_at: z.string().nullable(),
        deliveries: z.array(delivery),
      })
    ),
  }),
  async run(client, { webhook_id, limit }) {
    const webhooks: Webhook[] =
      webhook_id !== undefined
        ? [await client.webhooks.get(webhook_id)]
        : (await client.webhooks.list({ limit: MAX_WEBHOOKS })).data;

    return {
      webhooks: await Promise.all(
        webhooks.map(async (webhook) => {
          const page = await client.webhooks.listDeliveries(webhook.id, { limit });

          return {
            id: webhook.id,
            url: webhook.url,
            status: webhook.status,
            events: webhook.events,
            consecutive_failures: webhook.consecutive_failures,
            last_failure_at: webhook.last_failure_at,
            disabled_at: webhook.disabled_at,
            deliveries: page.data.map((item) => ({
              id: item.id,
              event: item.event,
              attempt: item.attempt,
              status_code: item.status_code,
              error: item.error,
              response_excerpt: item.response_excerpt,
              delivered_at: item.delivered_at,
              next_retry_at: item.next_retry_at,
              created_at: item.created_at,
            })),
          };
        })
      ),
    };
  },
});
