<p align="center">
  <a href="https://sendkuy.com/?utm_source=readme&utm_medium=sdk&utm_campaign=sendkuy-mcp">
    <img src="https://raw.githubusercontent.com/sendkuy/sendkuy-mcp/main/art/banner.png" alt="SendKuy MCP server" width="100%">
  </a>
</p>

# SendKuy MCP server

Give AI assistants and agents a way to reach people: send WhatsApp, SMS and email, verify OTP codes and run campaigns through your SendKuy account.

[![npm](https://img.shields.io/npm/v/@sendkuy/mcp)](https://www.npmjs.com/package/@sendkuy/mcp)
[![CI](https://github.com/sendkuy/sendkuy-mcp/actions/workflows/ci.yml/badge.svg)](https://github.com/sendkuy/sendkuy-mcp/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue)](LICENSE)
[![sendkuy/sendkuy-mcp MCP server](https://glama.ai/mcp/servers/sendkuy/sendkuy-mcp/badges/score.svg)](https://glama.ai/mcp/servers/sendkuy/sendkuy-mcp)

Use it while you build an integration ("send a test OTP to my number", "why is my webhook failing?"), or as the notification step of an agent that runs on its own: an on-call alert, a daily revenue summary, an order update per customer.

Full guide with scenarios: [docs.sendkuy.com/mcp](https://docs.sendkuy.com/mcp?utm_source=readme&utm_medium=sdk&utm_campaign=sendkuy-mcp)

## Get a key

Create an API key at [app.sendkuy.com/user/api](https://app.sendkuy.com/user/api?utm_source=readme&utm_medium=sdk&utm_campaign=sendkuy-mcp). Give it `account:read` plus the scopes of the tools you want, and nothing more. The server lists only the tools your key can use, so a key with read scopes never sees a tool that sends.

## Install

Claude Code:

```bash
claude mcp add --transport stdio --env SENDKUY_API_KEY=sk_live_YOUR_API_KEY sendkuy -- npx -y @sendkuy/mcp
```

Cursor (`.cursor/mcp.json`), Windsurf and Claude Desktop:

```json
{
  "mcpServers": {
    "sendkuy": {
      "command": "npx",
      "args": ["-y", "@sendkuy/mcp"],
      "env": { "SENDKUY_API_KEY": "sk_live_YOUR_API_KEY" }
    }
  }
}
```

VS Code (`.vscode/mcp.json`):

```json
{
  "inputs": [
    {
      "type": "promptString",
      "id": "sendkuy-key",
      "description": "SendKuy API key",
      "password": true
    }
  ],
  "servers": {
    "sendkuy": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "@sendkuy/mcp"],
      "env": { "SENDKUY_API_KEY": "${input:sendkuy-key}" }
    }
  }
}
```

Claude Desktop can also install `sendkuy-mcp.mcpb` from the [latest release](https://github.com/sendkuy/sendkuy-mcp/releases/latest) with one click.

## Tools

| Tool                              | What it does                                                      | Scopes                |
| --------------------------------- | ----------------------------------------------------------------- | --------------------- |
| `sendkuy_get_account`             | Plan, credits per channel, usage this period, the key's scopes    | `account:read`        |
| `sendkuy_send_message`            | One body to 1–100 recipients, contacts or a group, on one channel | `messages:write`      |
| `sendkuy_send_batch`              | Up to 500 messages with different content, answered row by row    | `messages:write`      |
| `sendkuy_get_messages`            | Status of up to 20 messages by id                                 | `messages:read`       |
| `sendkuy_list_messages`           | Recent messages by channel, status and time                       | `messages:read`       |
| `sendkuy_cancel_message`          | Cancel a message not sent yet                                     | `messages:write`      |
| `sendkuy_send_verification`       | Send an OTP code                                                  | `verifications:write` |
| `sendkuy_check_verification`      | Check the code a user typed                                       | `verifications:write` |
| `sendkuy_check_whatsapp_numbers`  | Which numbers are on WhatsApp                                     | `numbers:read`        |
| `sendkuy_find_contacts`           | A contact by phone or `external_id`                               | `contacts:read`       |
| `sendkuy_list_templates`          | Saved message templates                                           | `templates:read`      |
| `sendkuy_list_groups`             | Contact groups and their size                                     | `groups:read`         |
| `sendkuy_list_campaigns`          | Campaigns prepared in the dashboard                               | `campaigns:read`      |
| `sendkuy_start_campaign`          | Start a campaign                                                  | `campaigns:write`     |
| `sendkuy_get_campaign`            | Progress and delivery stats                                       | `campaigns:read`      |
| `sendkuy_control_campaign`        | Pause, resume or cancel                                           | `campaigns:write`     |
| `sendkuy_list_webhook_deliveries` | Webhooks and their latest delivery attempts                       | `webhooks:read`       |

Tools that send really send and spend credit. They take an optional `dedupe_key`: an agent that repeats a step with the same key gets the first answer back instead of sending twice.

## Examples

- **On-call alert.** "When the health check fails, WhatsApp the on-call group with the service name and the error." The agent sends to the group's `grp_` id with `dedupe_key` set to the incident id.
- **Daily revenue summary.** "Every evening, send each branch manager their own numbers." One `sendkuy_send_batch` call, a different body per manager.
- **Debugging an integration.** "Which WhatsApp messages failed in the last hour, and why?" `sendkuy_list_messages`, then `sendkuy_list_webhook_deliveries`.

## Configuration

| Variable           |                                                                                                                              |
| ------------------ | ---------------------------------------------------------------------------------------------------------------------------- |
| `SENDKUY_API_KEY`  | Your API key. Without it the server still starts and lists its tools, and every call answers with an error until you set it. |
| `SENDKUY_BASE_URL` | Only for a proxy or a mock server in tests. Defaults to `https://app.sendkuy.com/api/v1`.                                    |

## License

MIT
