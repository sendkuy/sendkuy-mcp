import { z } from 'zod/v4';
import { gatewayId } from './shapes';
import { defineTool, READ_ONLY } from './types';

export const checkWhatsappNumbers = defineTool({
  name: 'sendkuy_check_whatsapp_numbers',
  title: 'Check WhatsApp numbers',
  description:
    'Check whether up to 50 phone numbers are registered on WhatsApp before you send to them. Numbers must be E.164 with the leading +; a local number without the country code comes back registered: null. Limited to 10 calls a minute per key.',
  scopes: ['numbers:read'],
  operations: ['checkWhatsappNumbers'],
  annotations: READ_ONLY,
  inputSchema: z.object({
    numbers: z.array(z.string().max(32)).min(1).max(50),
    gateway_id: gatewayId,
  }),
  outputSchema: z.object({
    numbers: z.array(
      z.object({
        number: z.string(),
        registered: z.boolean().nullable(),
        checked_at: z.string().nullable(),
      })
    ),
  }),
  async run(client, params) {
    const checks = await client.numbers.check(params);

    return {
      numbers: checks.map((check) => ({
        number: check.number,
        registered: check.registered,
        checked_at: check.checked_at,
      })),
    };
  },
});
