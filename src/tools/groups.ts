import { z } from 'zod/v4';
import { cursor, limit } from './shapes';
import { defineTool, READ_ONLY } from './types';

export const listGroups = defineTool({
  name: 'sendkuy_list_groups',
  title: 'List contact groups',
  description:
    'List the contact groups in SendKuy with how many contacts each holds. Put a group id (grp_...) in the to field of sendkuy_send_message to send to every member; check contact_count first, because every member is charged.',
  scopes: ['groups:read'],
  operations: ['listGroups'],
  annotations: READ_ONLY,
  inputSchema: z.object({ limit, cursor }),
  outputSchema: z.object({
    groups: z.array(
      z.object({ id: z.string(), name: z.string(), contact_count: z.number(), status: z.string() })
    ),
    has_more: z.boolean(),
    next_cursor: z.string().nullable(),
  }),
  async run(client, { limit: size, cursor: startingAfter }) {
    const page = await client.groups.list({
      limit: size,
      ...(startingAfter ? { starting_after: startingAfter } : {}),
    });

    return {
      groups: page.data.map((group) => ({
        id: group.id,
        name: group.name,
        contact_count: group.contact_count,
        status: group.status,
      })),
      has_more: page.hasMore,
      next_cursor: page.nextCursor,
    };
  },
});
