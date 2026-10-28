import { SendKuy } from 'sendkuy';
import { describe, expect, test } from 'vitest';
import { sendBatch, sendMessage } from '../src/tools/messages';
import { sendVerification } from '../src/tools/verifications';
import { fakeFetch, json } from './support';

const message = {
  object: 'message',
  id: 'msg_1',
  channel: 'whatsapp',
  status: 'sent',
  to: '+6281234567890',
  body: 'Order shipped',
  subject: null,
  contact_id: null,
  campaign_id: null,
  scheduled_at: null,
  sent_at: '2026-10-29T10:00:00+07:00',
  delivered_at: null,
  read_at: null,
  error: null,
  created_at: '2026-10-29T10:00:00+07:00',
  updated_at: '2026-10-29T10:00:00+07:00',
};

const verification = {
  object: 'verification',
  id: 'vrf_1',
  to: '+6281234567890',
  email: null,
  channels: ['whatsapp'],
  channel: 'whatsapp',
  status: 'pending',
  attempts: [],
  checks_remaining: 5,
  expires_at: '2026-10-29T10:10:00+07:00',
  approved_at: null,
  created_at: '2026-10-29T10:00:00+07:00',
};

describe('dedupe_key', () => {
  test('the same dedupe_key sends the same Idempotency-Key every time', async () => {
    const { fetch, requests } = fakeFetch(
      json(201, { data: [message] }),
      json(201, { data: [message] }, { 'idempotent-replay': 'true' })
    );
    const client = new SendKuy('sk_live_test', { fetch });
    const input = sendMessage.inputSchema.parse({
      channel: 'whatsapp',
      to: ['+6281234567890'],
      body: 'Order shipped',
      dedupe_key: 'order-1',
    });

    await sendMessage.run(client, input);
    await sendMessage.run(client, input);

    expect(requests.map((request) => request.headers.get('idempotency-key'))).toEqual([
      'mcp:sendkuy_send_message:order-1',
      'mcp:sendkuy_send_message:order-1',
    ]);
  });

  test('the tool name keeps the same dedupe_key apart across tools', async () => {
    const { fetch, requests } = fakeFetch(json(201, { data: verification }));
    const client = new SendKuy('sk_live_test', { fetch });

    await sendVerification.run(
      client,
      sendVerification.inputSchema.parse({ to: '+6281234567890', dedupe_key: 'order-1' })
    );

    expect(requests[0]!.headers.get('idempotency-key')).toBe(
      'mcp:sendkuy_send_verification:order-1'
    );
  });
});

describe('sendkuy_send_batch', () => {
  test('a batch with one row out of credit still returns every row', async () => {
    const { fetch } = fakeFetch(
      json(200, {
        data: [
          { index: 0, id: 'msg_1', error: null },
          {
            index: 1,
            id: null,
            error: {
              type: 'authorization_error',
              code: 'insufficient_credits',
              message: 'Not enough SMS credit.',
              param: null,
            },
          },
        ],
      })
    );
    const client = new SendKuy('sk_live_test', { fetch });

    const result = await sendBatch.run(
      client,
      sendBatch.inputSchema.parse({
        messages: [
          { channel: 'whatsapp', to: '+6281234567890', body: 'Cabang A: Rp1.200.000' },
          { channel: 'sms', to: '+6281234567891', body: 'Cabang B: Rp900.000' },
        ],
      })
    );

    expect(result).toEqual({
      accepted: 1,
      failed: 1,
      ids: ['msg_1', null],
      failures: [
        {
          index: 1,
          error: { code: 'insufficient_credits', message: 'Not enough SMS credit.', param: null },
        },
      ],
    });
  });
});

describe('sendkuy_send_message', () => {
  test('a send to a large group is counted, not listed in full', async () => {
    const many = Array.from({ length: 25 }, (_, n) => ({
      ...message,
      id: `msg_${n}`,
      status: n < 3 ? 'sent' : 'queued',
    }));
    const { fetch } = fakeFetch(json(201, { data: many }));
    const client = new SendKuy('sk_live_test', { fetch });

    const result = await sendMessage.run(
      client,
      sendMessage.inputSchema.parse({ channel: 'whatsapp', to: ['grp_1'], body: 'Promo' })
    );

    expect(result.count).toBe(25);
    expect(result.by_status).toEqual({ sent: 3, queued: 22 });
    expect(result.messages).toHaveLength(20);
    expect(result.truncated).toBe(true);
  });
});
