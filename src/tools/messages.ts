import { SendKuyError, type SendMessageBatchParams, type SendMessageParams } from 'sendkuy';
import { z } from 'zod/v4';
import { dedupeKey, idempotencyKey } from './dedupe';
import {
  apiFailure,
  channel,
  cursor,
  gatewayId,
  inBatches,
  limit,
  media,
  messageSummary,
  scheduleAt,
  summarizeMessage,
} from './shapes';
import { defineTool, READ_ONLY, WRITES, WRITES_IDEMPOTENT } from './types';

const SHOWN = 20;

function countBy(values: readonly string[]): Record<string, number> {
  const counts: Record<string, number> = {};

  for (const value of values) counts[value] = (counts[value] ?? 0) + 1;

  return counts;
}

const CHARGES =
  'This really sends and spends SendKuy credit. A recipient on the suppression list or who unsubscribed still gets a message id and fails later; read the final status with sendkuy_get_messages.';

export const sendMessage = defineTool({
  name: 'sendkuy_send_message',
  title: 'Send a message',
  description: `Send one message body to 1 to 100 recipients on one channel: WhatsApp, SMS or email. Use it for an alert, a summary or a one-off notification where everyone gets the same text. To reach a saved contact group, put its grp_ id in to. When each recipient needs different content (a summary per branch, a notification per order) use sendkuy_send_batch. A campaign prepared in the SendKuy dashboard is started with sendkuy_start_campaign and can be paused or cancelled midway. Phone numbers must be E.164 with the leading + (for example +6281234567890). ${CHARGES} One recipient is sent while you wait; several are queued and sent in the background, paced per number. Pass dedupe_key so a retried step does not send twice. The answer counts every message per status and lists the first ${SHOWN}; read the rest with sendkuy_list_messages.`,
  scopes: ['messages:write'],
  operations: ['sendMessage'],
  annotations: WRITES,
  inputSchema: z.object({
    channel,
    to: z
      .array(z.string())
      .min(1)
      .max(100)
      .describe(
        'Recipients: E.164 phone numbers (or email addresses on email), contact ids (con_...) from sendkuy_find_contacts, or group ids (grp_...) from sendkuy_list_groups. A group sends to every member.'
      ),
    body: z.string().min(1).describe('The text. HTML is allowed on email.'),
    subject: z
      .string()
      .max(255)
      .optional()
      .describe('Required on email, refused on other channels.'),
    template_id: z
      .string()
      .optional()
      .describe('WhatsApp only. A template id from sendkuy_list_templates.'),
    template_parameters: z
      .record(z.string(), z.unknown())
      .optional()
      .describe('WhatsApp only. Values for the template variables.'),
    media: media.optional(),
    attachments: z
      .array(z.object({ url: z.url(), filename: z.string().max(255).optional() }))
      .max(10)
      .optional()
      .describe('Email only, at most ten files fetched from URLs you host.'),
    gateway_id: gatewayId,
    schedule_at: scheduleAt,
    dedupe_key: dedupeKey,
  }),
  outputSchema: z.object({
    count: z.number(),
    by_status: z.record(z.string(), z.number()),
    messages: z.array(messageSummary),
    truncated: z.boolean(),
  }),
  async run(client, { dedupe_key, ...params }) {
    const messages = await client.messages.send(params as unknown as SendMessageParams, {
      idempotencyKey: idempotencyKey('sendkuy_send_message', dedupe_key),
    });

    return {
      count: messages.length,
      by_status: countBy(messages.map((message) => message.status)),
      messages: messages.slice(0, SHOWN).map(summarizeMessage),
      truncated: messages.length > SHOWN,
    };
  },
});

export const sendBatch = defineTool({
  name: 'sendkuy_send_batch',
  title: 'Send a batch of messages',
  description: `Send up to 500 independent messages in one call, each with its own channel, recipient and body. Use it when the content differs per recipient: a revenue summary per branch, a notification per order, a reminder per invoice. Every row is answered on its own: one bad number or a channel out of credit fails that row only, and the rest still go out. The answer lists the message id of every row in input order (null where the row failed) and each failed row with its error. Messages are queued and sent in the background, paced per number. ${CHARGES} Pass dedupe_key so a retried step does not send the batch twice.`,
  scopes: ['messages:write'],
  operations: ['sendMessageBatch'],
  annotations: WRITES,
  inputSchema: z.object({
    messages: z
      .array(
        z.object({
          channel,
          to: z
            .string()
            .describe('One recipient: an E.164 phone number, or an email address on email.'),
          body: z.string().min(1),
          subject: z.string().max(255).optional().describe('Required on email.'),
          gateway_id: gatewayId,
          schedule_at: scheduleAt,
          media: media.optional(),
        })
      )
      .min(1)
      .max(500),
    dedupe_key: dedupeKey,
  }),
  outputSchema: z.object({
    accepted: z.number(),
    failed: z.number(),
    ids: z.array(z.string().nullable()),
    failures: z.array(z.object({ index: z.number(), error: apiFailure })),
  }),
  async run(client, { dedupe_key, ...params }) {
    const rows = await client.messages.sendBatch(params as unknown as SendMessageBatchParams, {
      idempotencyKey: idempotencyKey('sendkuy_send_batch', dedupe_key),
    });
    const failures = rows.flatMap((row) =>
      row.error
        ? [
            {
              index: row.index,
              error: { code: row.error.code, message: row.error.message, param: row.error.param },
            },
          ]
        : []
    );

    return {
      accepted: rows.length - failures.length,
      failed: failures.length,
      ids: rows.map((row) => row.id),
      failures,
    };
  },
});

export const getMessages = defineTool({
  name: 'sendkuy_get_messages',
  title: 'Get message status',
  description:
    'Read the current status of 1 to 20 messages by id (msg_...): queued, scheduled, sending, sent, delivered, read, failed, cancelled and so on, with the error when one failed. Use it after a send to confirm delivery, or to find out why a message failed.',
  scopes: ['messages:read'],
  operations: ['getMessage'],
  annotations: READ_ONLY,
  inputSchema: z.object({ ids: z.array(z.string()).min(1).max(20) }),
  outputSchema: z.object({
    messages: z.array(
      z.object({ id: z.string(), message: messageSummary.nullable(), error: apiFailure.nullable() })
    ),
  }),
  async run(client, { ids }) {
    const messages = await inBatches(ids, 5, async (id) => {
      try {
        return { id, message: summarizeMessage(await client.messages.get(id)), error: null };
      } catch (error) {
        if (!(error instanceof SendKuyError) || error.status !== 404) throw error;

        return {
          id,
          message: null,
          error: { code: error.code ?? 'resource_not_found', message: error.message },
        };
      }
    });

    return { messages };
  },
});

export const listMessages = defineTool({
  name: 'sendkuy_list_messages',
  title: 'List recent messages',
  description:
    'List recent messages, newest first, filtered by channel, status and creation time. Use it to answer "which WhatsApp messages failed in the last hour?" while debugging an integration. To check specific messages, use sendkuy_get_messages.',
  scopes: ['messages:read'],
  operations: ['listMessages'],
  annotations: READ_ONLY,
  inputSchema: z.object({
    channel: channel.optional(),
    status: z
      .enum([
        'queued',
        'scheduled',
        'sending',
        'sent',
        'delivered',
        'read',
        'opened',
        'clicked',
        'replied',
        'bounced',
        'failed',
        'cancelled',
      ])
      .optional(),
    created_after: z.string().optional().describe('ISO 8601 time with offset.'),
    created_before: z.string().optional().describe('ISO 8601 time with offset.'),
    limit,
    cursor,
  }),
  outputSchema: z.object({
    messages: z.array(messageSummary),
    has_more: z.boolean(),
    next_cursor: z.string().nullable(),
  }),
  async run(client, { cursor: startingAfter, ...filters }) {
    const page = await client.messages.list({
      ...filters,
      ...(startingAfter ? { starting_after: startingAfter } : {}),
    });

    return {
      messages: page.data.map(summarizeMessage),
      has_more: page.hasMore,
      next_cursor: page.nextCursor,
    };
  },
});

export const cancelMessage = defineTool({
  name: 'sendkuy_cancel_message',
  title: 'Cancel a message',
  description:
    'Cancel a message that has not been sent yet, such as a scheduled one or one still queued in a batch. A message already handed to the provider cannot be called back.',
  scopes: ['messages:write'],
  operations: ['cancelMessage'],
  annotations: WRITES_IDEMPOTENT,
  inputSchema: z.object({ id: z.string().describe('The message id, msg_...') }),
  outputSchema: z.object({ message: messageSummary }),
  async run(client, { id }) {
    return { message: summarizeMessage(await client.messages.cancel(id)) };
  },
});
