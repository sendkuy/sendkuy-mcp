import { z } from 'zod/v4';
import { cursor, limit } from './shapes';
import { defineTool, READ_ONLY } from './types';

export const listTemplates = defineTool({
  name: 'sendkuy_list_templates',
  title: 'List message templates',
  description:
    'List the message templates saved in SendKuy, with their channel, subject and body. Variables in a body are written as placeholders the template fills in. Pass a WhatsApp template id as template_id to sendkuy_send_message.',
  scopes: ['templates:read'],
  operations: ['listTemplates'],
  annotations: READ_ONLY,
  inputSchema: z.object({ limit, cursor }),
  outputSchema: z.object({
    templates: z.array(
      z.object({
        id: z.string(),
        channel: z.string(),
        name: z.string(),
        subject: z.string().nullable(),
        body: z.string().nullable(),
        status: z.string().nullable(),
      })
    ),
    has_more: z.boolean(),
    next_cursor: z.string().nullable(),
  }),
  async run(client, { limit: size, cursor: startingAfter }) {
    const page = await client.templates.list({
      limit: size,
      ...(startingAfter ? { starting_after: startingAfter } : {}),
    });

    return {
      templates: page.data.map((template) => ({
        id: template.id,
        channel: template.channel,
        name: template.name,
        subject: template.subject,
        body: template.body,
        status: template.status,
      })),
      has_more: page.hasMore,
      next_cursor: page.nextCursor,
    };
  },
});
