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
opens the browser, or shows you a link). A personal workspace is created
automatically; create a team org and share its invite code with teammates
(`create_org` / `join_org`).

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
