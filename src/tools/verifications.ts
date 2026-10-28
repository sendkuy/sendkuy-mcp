import type { CreateVerificationParams, Verification } from 'sendkuy';
import { z } from 'zod/v4';
import { dedupeKey, idempotencyKey } from './dedupe';
import { defineTool, WRITES } from './types';

const verificationSummary = z.object({
  id: z.string(),
  status: z.string(),
  channel: z.string().nullable(),
  channels: z.array(z.string()),
  to: z.string().nullable(),
  email: z.string().nullable(),
  checks_remaining: z.number(),
  expires_at: z.string(),
  approved_at: z.string().nullable(),
});

function summarize(verification: Verification): z.infer<typeof verificationSummary> {
  return {
    id: verification.id,
    status: verification.status,
    channel: verification.channel,
    channels: verification.channels,
    to: verification.to,
    email: verification.email,
    checks_remaining: verification.checks_remaining,
    expires_at: verification.expires_at,
    approved_at: verification.approved_at,
  };
}

export const sendVerification = defineTool({
  name: 'sendkuy_send_verification',
  title: 'Send an OTP code',
  description:
    'Send a one-time code to a phone number or email address and get a verification id (vrf_...). SendKuy generates the code, sends it, and falls back through the channels you list in order. Check what the user typed with sendkuy_check_verification. This really sends and spends SendKuy credit. Pass dedupe_key so a retried step does not send a second code.',
  scopes: ['verifications:write'],
  operations: ['createVerification'],
  annotations: WRITES,
  inputSchema: z.object({
    to: z
      .string()
      .optional()
      .describe('E.164 phone number with the leading +, for WhatsApp and SMS.'),
    email: z.email().optional().describe('Email address, for the email channel.'),
    channels: z
      .array(z.enum(['whatsapp', 'sms', 'email']))
      .min(1)
      .max(3)
      .optional()
      .describe('Channels to try, in order.'),
    code_length: z.number().int().min(4).max(8).optional(),
    ttl: z.number().int().min(60).max(1800).optional().describe('Seconds the code stays valid.'),
    brand: z.string().min(1).max(30).optional().describe('Name shown in the message.'),
    locale: z.enum(['id', 'en']).optional(),
    dedupe_key: dedupeKey,
  }),
  outputSchema: z.object({ verification: verificationSummary }),
  async run(client, { dedupe_key, ...params }) {
    const verification = await client.verifications.create(params as CreateVerificationParams, {
      idempotencyKey: idempotencyKey('sendkuy_send_verification', dedupe_key),
    });

    return { verification: summarize(verification) };
  },
});

export const checkVerification = defineTool({
  name: 'sendkuy_check_verification',
  title: 'Check an OTP code',
  description:
    'Check the code a user typed against a verification from sendkuy_send_verification. status approved means the code was right. A wrong code answers verification_code_invalid and uses up one of checks_remaining.',
  scopes: ['verifications:write'],
  operations: ['checkVerification'],
  annotations: WRITES,
  inputSchema: z.object({
    id: z.string().describe('The verification id, vrf_...'),
    code: z.string().regex(/^[0-9]{4,8}$/),
  }),
  outputSchema: z.object({ verification: verificationSummary }),
  async run(client, { id, code }) {
    return { verification: summarize(await client.verifications.check(id, { code })) };
  },
});
