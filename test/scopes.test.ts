import { describe, expect, test } from 'vitest';
import { ALL_TOOLS } from '../src/tools';
import { visibleTools } from '../src/tools/registry';

const readScopes = [...new Set(ALL_TOOLS.flatMap((tool) => tool.scopes))].filter((scope) =>
  scope.endsWith(':read')
);

describe('visibleTools', () => {
  test('a key with only read scopes sees no tool that writes', () => {
    const visible = visibleTools(ALL_TOOLS, readScopes);

    expect(visible.length).toBeGreaterThan(0);
    expect(visible.filter((tool) => !tool.annotations.readOnlyHint)).toEqual([]);
  });

  test('each tool appears exactly when all its scopes are present', () => {
    for (const tool of ALL_TOOLS) {
      expect(visibleTools(ALL_TOOLS, tool.scopes), tool.name).toContain(tool);

      for (const missing of tool.scopes) {
        const fewer = tool.scopes.filter((scope) => scope !== missing);

        expect(visibleTools(ALL_TOOLS, fewer), `${tool.name} without ${missing}`).not.toContain(
          tool
        );
      }
    }
  });

  test('without a key every tool is listed', () => {
    expect(visibleTools(ALL_TOOLS, null)).toHaveLength(17);
  });
});
