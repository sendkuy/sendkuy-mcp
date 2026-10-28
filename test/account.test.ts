import { SendKuy } from 'sendkuy';
import { expect, test } from 'vitest';
import { getAccount } from '../src/tools/account';
import { account, fakeFetch, json } from './support';

test('an admin key with null plan and credits passes the output schema', async () => {
  const { fetch } = fakeFetch(
    json(200, account(['account:read'], { type: 'admin', plan: null, credits: null })),
    json(200, {
      data: { object: 'account_usage', id: 'usr_1', type: 'admin', period: null, usage: null },
    })
  );
  const client = new SendKuy('sk_live_test', { fetch });

  const result = await getAccount.run(client, {});

  expect(() => getAccount.outputSchema.parse(result)).not.toThrow();
  expect(result).toMatchObject({ type: 'admin', plan: null, credits: null, usage: null });
});

test('fields the API adds later do not leak past the output schema', async () => {
  const { fetch } = fakeFetch(
    json(
      200,
      account(['account:read'], {
        plan: { id: 'pln_1', name: 'Pro', expires_at: null },
        credits: { sms: 1, email: 2, whatsapp: 3, rcs: 4 },
      })
    ),
    json(200, {
      data: {
        object: 'account_usage',
        id: 'usr_1',
        type: 'user',
        period: { start: '2026-10-01T00:00:00+07:00', end: null, days: 31 },
        usage: { sms: 0, email: 0, whatsapp: 5, rcs: 0 },
      },
    })
  );

  const result = await getAccount.run(new SendKuy('sk_live_test', { fetch }), {});

  expect(result.plan).toEqual({ name: 'Pro', expires_at: null });
  expect(result.credits).toEqual({ sms: 1, email: 2, whatsapp: 3 });
  expect(result.usage).toEqual({
    period: { start: '2026-10-01T00:00:00+07:00', end: null },
    sent: { sms: 0, email: 0, whatsapp: 5 },
  });
});
