import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, test } from 'vitest';
import { ALL_TOOLS } from '../src/tools';

const spec = JSON.parse(
  readFileSync(join(import.meta.dirname, '..', 'spec', 'openapi.json'), 'utf8')
) as {
  paths: Record<
    string,
    Record<string, { operationId?: string; security?: Array<{ bearerAuth?: string[] }> }>
  >;
};
const operations = JSON.parse(
  readFileSync(join(import.meta.dirname, '..', 'spec', 'operations.json'), 'utf8')
) as Record<string, string>;

const scopesByOperation = new Map<string, string[]>();

for (const methods of Object.values(spec.paths)) {
  for (const operation of Object.values(methods)) {
    if (operation.operationId) {
      scopesByOperation.set(
        operation.operationId,
        (operation.security ?? []).flatMap((entry) => entry.bearerAuth ?? [])
      );
    }
  }
}

describe('tools against the API contract', () => {
  test('there are 17 tools with unique sendkuy_ names', () => {
    const names = ALL_TOOLS.map((tool) => tool.name);

    expect(names).toHaveLength(17);
    expect(new Set(names).size).toBe(17);
    for (const name of names) expect(name).toMatch(/^sendkuy_[a-z_]+$/);
  });

  test('every operation a tool uses exists in operations.json', () => {
    for (const tool of ALL_TOOLS) {
      for (const operation of tool.operations)
        expect(operations, tool.name).toHaveProperty(operation);
    }
  });

  test('a tool asks for exactly the scopes its operations need', () => {
    for (const tool of ALL_TOOLS) {
      const needed = new Set(
        tool.operations.flatMap((operation) => scopesByOperation.get(operation) ?? [])
      );

      expect([...tool.scopes].sort(), tool.name).toEqual([...needed].sort());
    }
  });

  test('only tools whose scopes all read are marked read-only', () => {
    for (const tool of ALL_TOOLS) {
      expect(tool.annotations.readOnlyHint, tool.name).toBe(
        tool.scopes.every((scope) => scope.endsWith(':read'))
      );
    }
  });
});
