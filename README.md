# LNB

Market intelligence for teams. LNB turns Claude into your team's research
analyst: it profiles vendors, mines pain points, tracks trends and market
sizes — all saved as structured, evidence-cited entries in a workspace your
whole team shares.

Website: https://getlnb.pages.dev

## Install (Claude Code)

Tell Claude:

> Install the plugin from https://github.com/getlnb/lnb

Or run it yourself:

```
/plugin marketplace add getlnb/lnb
/plugin install lnb@lnb
```

On first use, the LNB server will ask you to sign in with GitHub (Claude
opens the browser, or shows you a link). If a teammate has already added you to
their workspace, you land in it straight away. Otherwise Claude will offer to
create one (`create_org`), or you can join an existing one with its invite code
(`join_org`).

To bring in teammates, `invite_member` seeds someone by GitHub username or
email address, so they land in your workspace the first time they sign in —
nothing for them to paste.

## Capture from your phone

Add LNB as a custom connector in the Claude app
(Settings → Connectors → Add custom connector):

```
https://mcp.lnb-mcp.workers.dev/mcp
```

Then just text Claude whatever you found — "save this: <link>, the pricing
page mentions per-seat tiers" — and it lands in your team workspace.

## What's inside

Everything is served by the LNB MCP server, so it works identically on every
surface — the plugin is just the one-line installer for Claude Code.

**Playbooks** (slash-invokable prompts — `/mcp__lnb__<name>` in Claude Code,
the "+" / slash picker in chat): `capture`, `profile-vendor`,
`mine-pain-points`, `mine-trends`, `map-customers`, `market-size`,
`profile-target-org`, `map-standards`, `add-reading`, `brief`,
`verify-evidence`. Or just ask in plain language — the `start_playbook` tool
gives Claude the same playbooks.

**Tools**: `whoami`, `create_org` / `join_org` / `org_info`, `get_taxonomy`,
`get_schema`, `upsert_entry`, `get/list/search/delete_entry`.

## Principles

- **Evidence first.** Every factual claim carries a citation (URL, access
  date, source type). Model inference is allowed but always labeled.
- **No contact.** Desk research only — never contacting vendors or posing as
  a buyer. Pricing is captured from public pages only.
- **Collect, don't conclude.** The tool surfaces evidence; humans draw the
  conclusions.

## Releases

Versioning is automated. Don't edit version numbers by hand — CI owns them.

Commit messages follow
[Conventional Commits](https://www.conventionalcommits.org/):

```
fix: correct the MCP server URL          → patch  (0.2.0 → 0.2.1)
feat: add a marketplace description      → minor  (0.2.0 → 0.3.0)
feat!: require Claude Code 2.x           → major  (0.2.x → 1.0.0)
chore: / docs: / ci: / refactor:         → no release
```

A breaking change is either a `!` after the type or a `BREAKING CHANGE:` line
in the commit body.

On every push to `main`, `.github/workflows/release.yml` runs
[semantic-release](https://semantic-release.gitbook.io/), which:

1. reads the commits since the last `v*` tag and picks the bump,
2. writes the new version into `.claude-plugin/plugin.json` and
   `.claude-plugin/marketplace.json` (via `scripts/set-version.mjs`),
3. updates `CHANGELOG.md`,
4. commits that as `chore(release): <version> [skip ci]`, tags `v<version>`,
   and publishes a GitHub Release.

Nothing is published to npm — the plugin is consumed straight from this repo.

Pull requests are commit-linted (`.github/workflows/commitlint.yml`). There are
no local git hooks; if you want the same check before pushing, run
`npm install && npx commitlint --from origin/main`.
