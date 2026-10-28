import { defineConfig } from 'tsup';

export default defineConfig({
  entry: { server: 'src/index.ts' },
  outDir: 'bundle',
  format: ['esm'],
  target: 'node20',
  platform: 'node',
  clean: true,
  splitting: false,
  noExternal: [/.*/],
  banner: {
    js: "import { createRequire } from 'node:module'; const require = createRequire(import.meta.url);",
  },
});
