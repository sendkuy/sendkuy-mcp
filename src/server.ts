import { McpServer } from '@modelcontextprotocol/server';
import type { Access } from './startup';
import { visibleTools } from './tools/registry';
import { keylessError, ok, toolError } from './tools/result';
import type { ToolDef } from './tools/types';
import { VERSION } from './version';

export function createServer(tools: readonly ToolDef[], access: Access): McpServer {
  const server = new McpServer(
    { name: 'sendkuy', version: VERSION },
    { capabilities: { tools: {} } }
  );

  for (const tool of visibleTools(tools, access.mode === 'key' ? access.scopes : null)) {
    server.registerTool(
      tool.name,
      {
        title: tool.title,
        description: tool.description,
        inputSchema: tool.inputSchema,
        outputSchema: tool.outputSchema,
        annotations: { title: tool.title, ...tool.annotations },
      },
      async (input) => {
        if (access.mode === 'keyless') return keylessError();

        try {
          return ok(await tool.run(access.client, input));
        } catch (error) {
          return toolError(
            error,
            typeof (input as { dedupe_key?: unknown }).dedupe_key === 'string'
          );
        }
      }
    );
  }

  return server;
}
