import { readFileSync } from 'node:fs';

const read = (file) => JSON.parse(readFileSync(new URL(`../${file}`, import.meta.url), 'utf8'));

const pkg = read('package.json');
const server = read('server.json');
const manifest = read('manifest.json');
const source = readFileSync(new URL('../src/version.ts', import.meta.url), 'utf8');

const checks = [
  ['server.json version', server.version],
  ['server.json packages[0].version', server.packages[0]?.version],
  ['manifest.json version', manifest.version],
  ['src/version.ts', source.match(/VERSION = '([^']+)'/)?.[1]],
];

const wrong = checks.filter(([, version]) => version !== pkg.version);

if (pkg.mcpName !== server.name)
  wrong.push(['server.json name', `${server.name} (mcpName is ${pkg.mcpName})`]);
if (server.packages[0]?.identifier !== pkg.name)
  wrong.push(['server.json identifier', server.packages[0]?.identifier]);

for (const [where, value] of wrong)
  console.error(`${where} is ${value}, package.json says ${pkg.version} / ${pkg.name}`);

process.exit(wrong.length === 0 ? 0 : 1);
