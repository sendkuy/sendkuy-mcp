import { getAccount } from './account';
import { controlCampaign, getCampaign, listCampaigns, startCampaign } from './campaigns';
import { findContacts } from './contacts';
import { listGroups } from './groups';
import { cancelMessage, getMessages, listMessages, sendBatch, sendMessage } from './messages';
import { checkWhatsappNumbers } from './numbers';
import { listTemplates } from './templates';
import type { ToolDef } from './types';
import { checkVerification, sendVerification } from './verifications';
import { listWebhookDeliveries } from './webhooks';

export const ALL_TOOLS: readonly ToolDef[] = [
  getAccount,
  sendMessage,
  sendBatch,
  getMessages,
  listMessages,
  cancelMessage,
  sendVerification,
  checkVerification,
  checkWhatsappNumbers,
  findContacts,
  listTemplates,
  listGroups,
  listCampaigns,
  startCampaign,
  getCampaign,
  controlCampaign,
  listWebhookDeliveries,
];
