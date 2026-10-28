#!/usr/bin/env node
import { serveStdio } from '@modelcontextprotocol/server/stdio';
import { createServer } from './server';
import { resolveAccess, StartupError } from './startup';
import { ALL_TOOLS } from './tools';

try {
  const access = await resolveAccess(process.env);

  if (access.mode === 'keyless') {
    process.stderr.write(
      'sendkuy-mcp: SENDKUY_API_KEY is not set. Tools are listed, but every call answers with an error until a key is set.\n'
    );
  }

  serveStdio(() => createServer(ALL_TOOLS, access));
} catch (error) {
  process.stderr.write(
    `sendkuy-mcp: ${error instanceof StartupError ? error.message : String(error)}\n`
  );
  process.exit(1);
}
