import type { Campaign } from 'sendkuy';
import { z } from 'zod/v4';
import { cursor, limit } from './shapes';
import { defineTool, READ_ONLY, WRITES_IDEMPOTENT } from './types';

const campaignSummary = z.object({
  id: z.string(),
  name: z.string(),
  status: z.string(),
  type: z.string(),
  channels: z.array(z.string()),
  group_id: z.string().nullable(),
  total_contacts: z.number(),
  processed_contacts: z.number(),
  scheduled_at: z.string().nullable(),
  started_at: z.string().nullable(),
  completed_at: z.string().nullable(),
  next_run_at: z.string().nullable(),
  paused_reason: z.string().nullable(),
});

function summarize(campaign: Campaign): z.infer<typeof campaignSummary> {
  return {
    id: campaign.id,
    name: campaign.name,
    status: campaign.status,
    type: campaign.type,
    channels: campaign.channels,
    group_id: campaign.group_id,
    total_contacts: campaign.total_contacts,
    processed_contacts: campaign.processed_contacts,
    scheduled_at: campaign.scheduled_at,
    started_at: campaign.started_at,
    completed_at: campaign.completed_at,
    next_run_at: campaign.next_run_at,
    paused_reason: campaign.paused_reason,
  };
}

const campaignId = z.string().describe('The campaign id, cmp_...');

export const listCampaigns = defineTool({
  name: 'sendkuy_list_campaigns',
  title: 'List campaigns',
  description:
    'List campaigns, newest first, with their status and audience size (total_contacts). Campaign content is written in the SendKuy dashboard; a draft found here is ready to run with sendkuy_start_campaign.',
  scopes: ['campaigns:read'],
  operations: ['listCampaigns'],
  annotations: READ_ONLY,
  inputSchema: z.object({ limit, cursor }),
  outputSchema: z.object({
    campaigns: z.array(campaignSummary),
    has_more: z.boolean(),
    next_cursor: z.string().nullable(),
  }),
  async run(client, { limit: size, cursor: startingAfter }) {
    const page = await client.campaigns.list({
      limit: size,
      ...(startingAfter ? { starting_after: startingAfter } : {}),
    });

    return {
      campaigns: page.data.map(summarize),
      has_more: page.hasMore,
      next_cursor: page.nextCursor,
    };
  },
});

export const startCampaign = defineTool({
  name: 'sendkuy_start_campaign',
  title: 'Start a campaign',
  description:
    'Start a draft or scheduled campaign. An instant campaign starts sending to every eligible contact in its group, is refused with insufficient_credits when the balance does not cover them, and spends real SendKuy credit. A scheduled or recurring campaign waits for its time. If a person is in the conversation, tell them the campaign name and total_contacts before you start it. Pause or cancel it with sendkuy_control_campaign.',
  scopes: ['campaigns:write'],
  operations: ['startCampaign'],
  annotations: WRITES_IDEMPOTENT,
  inputSchema: z.object({ id: campaignId }),
  outputSchema: z.object({ campaign: campaignSummary }),
  async run(client, { id }) {
    return { campaign: summarize(await client.campaigns.start(id)) };
  },
});

export const getCampaign = defineTool({
  name: 'sendkuy_get_campaign',
  title: 'Get campaign progress',
  description:
    'Read a campaign: status, progress (processed_contacts of total_contacts), why it is paused, and delivery stats (sent, delivered, failed, opened, replied, unsubscribed) overall and per channel.',
  scopes: ['campaigns:read'],
  operations: ['getCampaign'],
  annotations: READ_ONLY,
  inputSchema: z.object({ id: campaignId }),
  outputSchema: z.object({
    campaign: campaignSummary,
    stats: z.record(z.string(), z.unknown()).nullable(),
  }),
  async run(client, { id }) {
    const campaign = await client.campaigns.get(id);

    return {
      campaign: summarize(campaign),
      stats: (campaign.stats as Record<string, unknown> | undefined) ?? null,
    };
  },
});

export const controlCampaign = defineTool({
  name: 'sendkuy_control_campaign',
  title: 'Pause, resume or cancel a campaign',
  description:
    'Pause a running campaign, resume a paused one, or cancel it for good. Pause is the emergency brake when a campaign is going out wrong: messages not yet sent stay unsent until you resume. Cancel cannot be undone.',
  scopes: ['campaigns:write'],
  operations: ['pauseCampaign', 'resumeCampaign', 'cancelCampaign'],
  annotations: WRITES_IDEMPOTENT,
  inputSchema: z.object({ id: campaignId, action: z.enum(['pause', 'resume', 'cancel']) }),
  outputSchema: z.object({ campaign: campaignSummary }),
  async run(client, { id, action }) {
    const campaign =
      action === 'pause'
        ? await client.campaigns.pause(id)
        : action === 'resume'
          ? await client.campaigns.resume(id)
          : await client.campaigns.cancel(id);

    return { campaign: summarize(campaign) };
  },
});
