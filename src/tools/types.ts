import type { SendKuy } from 'sendkuy';
import type { z } from 'zod/v4';

export interface ToolAnnotations {
  readOnlyHint: boolean;
  destructiveHint: false;
  idempotentHint: boolean;
  openWorldHint: true;
}

export interface ToolDef<
  In extends z.ZodObject = z.ZodObject,
  Out extends z.ZodObject = z.ZodObject,
> {
  name: `sendkuy_${string}`;
  title: string;
  description: string;
  scopes: readonly string[];
  operations: readonly string[];
  annotations: ToolAnnotations;
  inputSchema: In;
  outputSchema: Out;
  run(client: SendKuy, input: z.infer<In>): Promise<z.infer<Out>>;
}

export function defineTool<In extends z.ZodObject, Out extends z.ZodObject>(
  tool: ToolDef<In, Out>
): ToolDef {
  return tool as unknown as ToolDef;
}

export const READ_ONLY: ToolAnnotations = {
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: true,
};

export const WRITES: ToolAnnotations = {
  readOnlyHint: false,
  destructiveHint: false,
  idempotentHint: false,
  openWorldHint: true,
};

export const WRITES_IDEMPOTENT: ToolAnnotations = { ...WRITES, idempotentHint: true };
