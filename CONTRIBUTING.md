# Contributing

Thank you for helping improve the SendKuy MCP server.

## Setup

```bash
npm install
npm test
npm run typecheck
npm run build
```

## How the tools stay in sync with the API

`spec/openapi.json` is a copy of the SendKuy API contract, and `spec/operations.json` names each operation. Both are synced by the SendKuy team, so please do not edit them by hand. `test/contract.test.ts` checks every tool against them: the operations it calls must exist, and the scopes it asks for must equal what those operations require.

## Pull requests

- Keep each pull request to one change, with a test when behaviour changes.
- Nothing may write to stdout: it carries the MCP protocol. `test/stdout.test.ts` enforces this.
- Use [Conventional Commits](https://www.conventionalcommits.org/) in English, for example `fix(tools): report a missing campaign by id`.
- Make sure `npm test`, `npm run typecheck`, `npm run format:check` and `npm run check:versions` pass.
