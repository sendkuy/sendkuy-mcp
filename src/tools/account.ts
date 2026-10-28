import type { SendKuy } from 'sendkuy';
import { z } from 'zod/v4';
import { defineTool, READ_ONLY } from './types';

const counts = z.object({ sms: z.number(), email: z.number(), whatsapp: z.number() });

function pickCounts(value: unknown): z.infer<typeof counts> | null {
  if (value === null || value === undefined) return null;

  const raw = value as Record<string, unknown>;

  return {
    sms: Number(raw.sms ?? 0),
    email: Number(raw.email ?? 0),
    whatsapp: Number(raw.whatsapp ?? 0),
  };
}

export const getAccount = defineTool({
  name: 'sendkuy_get_account',
  title: 'Get SendKuy account',
  description:
    'Read the SendKuy account behind this API key: plan, remaining credits per channel (WhatsApp, SMS, email), messages used this billing period, the rate limit, and the scopes this key holds. Check credits before a large send. plan, credits and usage are null for SendKuy staff keys.',
  scopes: ['account:read'],
  operations: ['getAccount', 'getAccountUsage'],
  annotations: READ_ONLY,
  inputSchema: z.object({}),
  outputSchema: z.object({
    name: z.string(),
    email: z.string(),
    type: z.string(),
    plan: z.object({ name: z.string(), expires_at: z.string().nullable() }).nullable(),
    credits: counts.nullable(),
    rate_limit: z.number(),
    scopes: z.array(z.string()),
    usage: z
      .object({
        period: z.object({ start: z.string().nullable(), end: z.string().nullable() }).nullable(),
        sent: counts,
      })
      .nullable(),
  }),
  async run(client: SendKuy) {
    const [account, usage] = await Promise.all([client.account.get(), client.account.usage()]);
    const rawPlan = account.plan as { name: string; expires_at: string | null } | null;
    const rawPeriod = usage.period as { start: string | null; end: string | null } | null;
    const plan = rawPlan === null ? null : { name: rawPlan.name, expires_at: rawPlan.expires_at };
    const credits = pickCounts(account.credits);
    const period = rawPeriod === null ? null : { start: rawPeriod.start, end: rawPeriod.end };
    const sent = pickCounts(usage.usage);

    return {
      name: account.name,
      email: account.email,
      type: account.type,
      plan,
      credits,
      rate_limit: account.rate_limit,
      scopes: account.scopes,
      usage: sent === null ? null : { period, sent },
    };
  },
});
