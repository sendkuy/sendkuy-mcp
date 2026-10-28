import type { ToolDef } from './types';

export function visibleTools(all: readonly ToolDef[], scopes: readonly string[] | null): ToolDef[] {
  if (scopes === null) return [...all];

  const granted = new Set(scopes);

  return all.filter((tool) => tool.scopes.every((scope) => granted.has(scope)));
}
