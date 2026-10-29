# Releasing

How `@sendkuy/mcp` reaches npm, GitHub releases, the MCP Registry and the MCP directories.

A release is a `vX.Y.Z` tag. `.github/workflows/release.yml` then:

1. runs the tests and the build;
2. checks the version against the tag, `server.json` and `manifest.json`;
3. publishes to npm through trusted publishing, skipping that step when the version is already on npm;
4. packs `sendkuy-mcp.mcpb` and attaches it to a GitHub release, with notes taken from `CHANGELOG.md`;
5. publishes `server.json` to the MCP Registry as `com.sendkuy/mcp`.

The first release needs some one-time setup before the tag. Every release after that is the checklist in
[Every release](#every-release).

## First release (1.0.0)

### 1. The API and the SDK it depends on

The server reads the key's `scopes` from `GET /account`. Until that field is live, a server started with a key
lists no tools.

- [ ] Merge `feat/mcp-server` in `sendkuy` and deploy it. Check that the field is live:

  ```bash
  curl -s https://app.sendkuy.com/api/v1/account -H "Authorization: Bearer $SENDKUY_API_KEY" | jq .data.scopes
  ```

  Expected: a list such as `["account:read","messages:read"]`, not `null`.

- [ ] Merge `feat/account-scopes` in `sendkuy-node` and `sendkuy-php`, then tag both `v1.2.0`. Check:

  ```bash
  npm view sendkuy version   # 1.2.0
  ```

- [ ] In this repo, replace the local link with the published SDK, then test and commit:

  ```bash
  npm install sendkuy@^1.2.0
  npm test && npm run build && npm run pack:mcpb
  git commit -am "build: depend on sendkuy 1.2.0 from npm"
  ```

  `package.json` must say `"sendkuy": "^1.2.0"`, not `file:../sendkuy-node`. Until it does, `npm ci` fails on GitHub
  Actions and in the Dockerfile.

### 2. The GitHub repository

- [ ] Create the public repository `sendkuy/sendkuy-mcp`, under the same `sendkuy` account as the SDKs.
- [ ] Push `main`:

  ```bash
  git remote add origin git@github.com:sendkuy/sendkuy-mcp.git
  git push -u origin main
  ```

- [ ] Wait for CI to pass on both jobs: Node 22/24, and "Runs on Node 20".

### 3. The MCP Registry key for `sendkuy.com`

The registry accepts the `com.sendkuy/` namespace only from someone who proves they control `sendkuy.com`, using a
DNS TXT record and the matching private key.

- [ ] Generate an Ed25519 key pair and print both halves:

  ```bash
  openssl genpkey -algorithm Ed25519 -out mcp-registry-key.pem
  openssl pkey -in mcp-registry-key.pem -pubout -outform DER | tail -c 32 | base64
  openssl pkey -in mcp-registry-key.pem -noout -text | grep -A3 "priv:" | tail -n +2 | tr -d ' :\n'; echo
  ```

  The first value is the public key in base64. The second is the private key in hex.

- [ ] In Cloudflare DNS for `sendkuy.com`, add a TXT record on the apex (`@`). Other TXT records on the apex,
      such as SPF, can stay.

  ```text
  v=MCPv1; k=ed25519; p=<public key in base64>
  ```

  Check: `dig +short TXT sendkuy.com` shows it.

- [ ] In the repository settings, under Secrets and variables → Actions, add `MCP_REGISTRY_PRIVATE_KEY` with the
      private key in hex.
- [ ] Store `mcp-registry-key.pem` where the APK signing key is backed up. Never commit it. If it is lost, generate a
      new pair and replace both the TXT record and the secret.

### 4. npm: first publish by hand, then trusted publishing

npm attaches a trusted publisher to a package that already exists, so 1.0.0 goes out from your machine with the
`sendkuy` npm account. That account owns the `@sendkuy` scope; no npm organization is needed.

- [ ] Publish:

  ```bash
  npm whoami          # sendkuy
  npm ci && npm test && npm run build
  npm publish --access public --provenance=false
  npm view @sendkuy/mcp version   # 1.0.0
  ```

  `--provenance=false` is needed because `publishConfig` asks for provenance, which only works inside GitHub Actions.

- [ ] On npmjs.com, open `@sendkuy/mcp` → Settings → Trusted Publisher → GitHub Actions. Fill in:
  - Organization or user: `sendkuy`
  - Repository: `sendkuy-mcp`
  - Workflow: `release.yml`
  - Environment: leave empty
  - Tick the **npm publish** permission.

### 5. Tag v1.0.0

- [ ] Tag and push:

  ```bash
  git tag -a v1.0.0 -m "v1.0.0"
  git push origin v1.0.0
  ```

  The workflow sees 1.0.0 already on npm and skips publishing. It still creates the GitHub release with the `.mcpb`,
  and publishes to the MCP Registry.

- [ ] Check:

  ```bash
  gh release view v1.0.0 --repo sendkuy/sendkuy-mcp   # lists sendkuy-mcp.mcpb
  curl -s "https://registry.modelcontextprotocol.io/v0.1/servers?search=com.sendkuy" | jq '.servers[].server | {name, version}'
  ```

### 6. Directories

Do these in order, because `awesome-mcp-servers` only accepts servers that pass Glama's checks. Record every listing URL
and date in the Tahap 2 table of `sendkuy/docs/local/seo-backlink-checkpoint.md`. Use the same short description
everywhere:

> Send WhatsApp, SMS and email, verify OTP codes and run campaigns with SendKuy.

- [ ] **Glama.**
  - Sign in at glama.ai with the GitHub account `sendkuy`, and add the repository.
  - `glama.json` claims it for that account.
  - Wait until the server builds from the `Dockerfile` and its introspection check passes. Glama's check starts the
    server without a key, and it still lists every tool.
  - Copy the score badge into `README.md` under the other badges:

    ```markdown
    [![sendkuy/sendkuy-mcp MCP server](https://glama.ai/mcp/servers/sendkuy/sendkuy-mcp/badges/score.svg)](https://glama.ai/mcp/servers/sendkuy/sendkuy-mcp)
    ```

- [ ] **awesome-mcp-servers.** Open a pull request to `punkpeye/awesome-mcp-servers`. Add one line to the
      Communication section, in alphabetical order, and include the Glama badge if the repository's bot asks for it:

  ```markdown
  - [sendkuy/sendkuy-mcp](https://github.com/sendkuy/sendkuy-mcp) 📇 ☁️ 🍎 🪟 🐧 - Send WhatsApp, SMS and email, verify OTP codes and run campaigns through SendKuy, with tools filtered by the API key's scopes.
  ```

- [ ] **Smithery.** Download `sendkuy-mcp.mcpb` from the GitHub release, then:

  ```bash
  npx -y @smithery/cli mcp publish ./sendkuy-mcp.mcpb -n sendkuy/mcp
  ```

- [ ] **mcp.so.** Submit the repository URL through the free form at mcp.so/submit.
- [ ] **Docker MCP Catalog.** Open a pull request to `docker/mcp-registry`. Its `task wizard` generates
      `servers/sendkuy/server.yaml`. Declare `SENDKUY_API_KEY` as a secret.
- [ ] **Cursor Directory.** Check its current submission rules, and submit if it is free.
- [ ] **PulseMCP, and the GitHub and VS Code MCP galleries.** Nothing to do: they read the MCP Registry.

## Every release

- [ ] If the API contract changed, run `../scripts/sync-spec`, then `npm test`. `test/contract.test.ts` fails when an
      operation a tool calls is gone, or when its scopes changed.
- [ ] If a new `sendkuy` version is out, bump it with `npm install sendkuy@^X.Y.Z`.
- [ ] Bump the version:

  ```bash
  npm version X.Y.Z --no-git-tag-version
  ```

  This sets `package.json` and `package-lock.json`. Set the same number by hand in three more places:
  - `src/version.ts`
  - `server.json`: both `version` and `packages[0].version`
  - `manifest.json`

  Then run `npm run check:versions`.

- [ ] Add `## [X.Y.Z] - YYYY-MM-DD` to `CHANGELOG.md`. Without that section the workflow stops before publishing.
- [ ] Run `npm run format:check && npm run typecheck && npm test && npm run pack:mcpb`.
- [ ] Commit, push `main`, and wait for CI.
- [ ] Tag and push:

  ```bash
  git tag -a vX.Y.Z -m "vX.Y.Z"
  git push origin vX.Y.Z
  ```

- [ ] Check npm with `npm view @sendkuy/mcp version`, the GitHub release asset, and the registry search above.

## When something fails

| Symptom                                                           | Cause                                                              | Fix                                                                                                |
| ----------------------------------------------------------------- | ------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------- |
| npm publish answers 404 in the workflow                           | No trusted publisher on the package                                | Add it as in step 4, then `gh run rerun <run id>`                                                  |
| npm publish answers 403 "OIDC permission denied"                  | The trusted publisher exists, but **npm publish** is not ticked    | Tick it, then `gh run rerun <run id>`                                                              |
| "package.json says … the tag is …"                                | The version was not bumped everywhere                              | Delete the tag (`git push origin :vX.Y.Z`), fix the version, tag again                             |
| "CHANGELOG.md has no section for …"                               | The changelog section is missing                                   | Same as above                                                                                      |
| `mcp-publisher login dns` fails                                   | The TXT record is missing or does not match the secret             | Compare `dig +short TXT sendkuy.com` with the public key derived from `mcp-registry-key.pem`       |
| The registry rejects `server.json`                                | The schema changed, or a field is invalid                          | Fix `server.json` against the schema in its `$schema` field, then release a patch version          |
| The registry step failed, but npm and the GitHub release are done | —                                                                  | Run `mcp-publisher login dns …` and `mcp-publisher publish` by hand from this directory            |
| Glama check fails                                                 | The Docker build fails, or the server does not start without a key | Run `docker build -t sendkuy-mcp .`, then the `printf … \| node dist/index.js` check from `ci.yml` |
| A server started with a key lists no tools                        | `GET /account` has no `scopes`, or the key lacks `account:read`    | Check with the `curl` in step 1, and give the key `account:read`                                   |

The MCP Registry is still in preview, and its data may be reset. If `com.sendkuy/mcp` disappears from the registry,
run `mcp-publisher publish` again.
