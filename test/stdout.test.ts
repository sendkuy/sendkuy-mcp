import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test } from 'vitest';

function files(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) =>
    entry.isDirectory() ? files(join(dir, entry.name)) : [join(dir, entry.name)]
  );
}

test('nothing in src writes to stdout, which belongs to the protocol', () => {
  const offenders = files(join(import.meta.dirname, '..', 'src')).filter((file) =>
    /console\.(log|info|debug)\(|process\.stdout\.write/.test(readFileSync(file, 'utf8'))
  );

  expect(offenders).toEqual([]);
});
