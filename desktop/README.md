# Claude Desktop bundle — parked, does not work

**Do not ship this.** It installs cleanly and then fails to start. Kept because
the investigation is worth more than the code, and because one upstream change
would make it viable.

## What happens

Desktop accepts the bundle, installs it, launches it — and drops it:

```
Server transport closed unexpectedly, this is likely due to the process exiting early
Couldn't start for Cowork and Code sessions. Error: Version negotiation failed:
the connection closed during the server/discover probe
```

## Why

Timed, not guessed. The bridge takes **2,418 ms** to answer `initialize`;
Desktop's negotiation probe closed the transport after about **800 ms**.

```
node probe: RESPONDED in 2418 ms
Desktop log: 21:02:55.254 start -> 21:02:56.043 transport closed   (789 ms)
```

`mcp-remote` does OAuth discovery and connects to the remote server *before* it
starts serving stdio, so nothing can answer until that round trip finishes. The
probe does not wait.

This is structural, not tuning. A Desktop bundle is designed to run a **local**
stdio server — the manifest has no field for a remote URL (`{ type:
"python"|"node"|"binary", entry_point, mcp_config: { command, args, env } }`,
verified in the shipped app). Wrapping a remote server in a local bridge means
paying network latency inside a handshake budget meant for a local process.

## Things ruled out along the way

- **Missing Node** — no. Desktop logs `Using built-in Node.js for MCP server`
  and supplies its own, which is also why the first version of the shim died
  instantly: it spawned `npx`, which is not on Desktop's PATH. Vendoring
  `mcp-remote` into `server/node_modules` and launching it with
  `process.execPath` fixed that, and the installed copy runs correctly by hand.
- **Stale lockfiles / port contention** — no. `~/.mcp-auth` had no lock for
  0.1.49, port 7258 was free, no stray processes.
- **A deep link instead** — none exists. Desktop's registered routes are
  `claude://claude.ai/new`, `claude://code/{new,continue,needs-input}`,
  `claude://claude.ai/mcp-auth-callback/sdk`, `claude://cowork/shared-artifact`.
  Nothing for adding a connector.
- **A remote entry in `claude_desktop_config.json`** — not supported. That file
  is stdio-only (`command`/`args`/`env`); remote connectors live account-side.

## What would make it work

Either upstream change, neither ours:

1. Desktop waits longer for `initialize`, or probes with a longer budget.
2. A bridge that answers `initialize` locally and connects to the remote lazily,
   buffering until ready. Writing one is possible — we know our own server's
   capabilities — but it means maintaining a hand-rolled MCP proxy to save a
   user about ten seconds. Not obviously worth it.

## Use this instead

**Settings → Connectors → Add custom connector**, then paste:

```
https://mcp.lnb-mcp.workers.dev/mcp
```

Native, no install, no Node, and it syncs to claude.ai and mobile — which the
bundle never would, because it installs a local bridge on one machine.
