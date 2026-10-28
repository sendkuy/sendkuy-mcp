import { SendKuyError, type Contact } from 'sendkuy';
import { z } from 'zod/v4';
import { defineTool, READ_ONLY } from './types';

const contactSummary = z.object({
  id: z.string(),
  external_id: z.string().nullable(),
  first_name: z.string().nullable(),
  last_name: z.string().nullable(),
  whatsapp: z.string().nullable(),
  sms: z.string().nullable(),
  email: z.string().nullable(),
  group_ids: z.array(z.string()),
  status: z.string(),
  attributes: z.record(z.string(), z.unknown()),
});

function summarize(contact: Contact): z.infer<typeof contactSummary> {
  return {
    id: contact.id,
    external_id: contact.external_id,
    first_name: contact.first_name,
    last_name: contact.last_name,
    whatsapp: contact.whatsapp,
    sms: contact.sms,
    email: contact.email,
    group_ids: contact.group_ids,
    status: contact.status,
    attributes: contact.attributes as Record<string, unknown>,
  };
}

export const findContacts = defineTool({
  name: 'sendkuy_find_contacts',
  title: 'Find a contact',
  description:
    'Find one saved contact by phone number (E.164) or by external_id, the id your own system gave the customer. Returns contact: null when nobody matches. Use the contact id (con_...) as a recipient in sendkuy_send_message.',
  scopes: ['contacts:read'],
  operations: ['lookupContact'],
  annotations: READ_ONLY,
  inputSchema: z.object({
    phone: z.string().optional().describe('E.164 phone number with the leading +.'),
    external_id: z.string().optional(),
  }),
  outputSchema: z.object({ contact: contactSummary.nullable() }),
  async run(client, { phone, external_id }) {
    if ((phone === undefined) === (external_id === undefined)) {
      throw new Error('Pass exactly one of phone or external_id.');
    }

    try {
      const contact = await client.contacts.lookup(
        phone !== undefined ? { phone } : { external_id: external_id! }
      );

      return { contact: summarize(contact) };
    } catch (error) {
      if (error instanceof SendKuyError && error.status === 404) return { contact: null };

      throw error;
    }
  },
});
