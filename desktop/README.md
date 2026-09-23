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

## How far it got before being parked

Three of the four blockers were actually solved, and the code here has those
fixes in it. Recording them so a future attempt starts from the right place:

1. **npx not on PATH** — fixed. mcp-remote is vendored into
   `server/node_modules` and launched with `process.execPath`.
2. **2,418 ms handshake vs a ~400 ms budget** — fixed. The bridge answers
   `initialize` itself from a local copy of the server's capabilities and warms
   the remote behind it; measured at **112 ms**, with `tools/list` returning all
   26 real tools once the proxy connects.
3. **`InvalidGrantError: Client ID mismatch`** — fixed. Desktop runs several
   instances at once and they raced dynamic client registration, so the code
   was redeemed against a different client than it was issued to. A static
   public client (`jJpHM49fTvSW31JD`, PKCE, loopback redirect) removes the
   registration entirely.
4. **`InvalidGrantError: Invalid PKCE code_verifier`** — NOT fixed, and the
   reason this is parked. With three concurrent instances, one wins the lockfile
   and the others race its verifier on disk. This lives inside mcp-remote's
   cross-process coordination, which assumes far less concurrency than Desktop
   applies to it.

The pattern across all four is the same: each fix was correct and revealed the
next instance of one underlying mismatch — a bundle spec written for a local
stdio server, hosting a remote OAuth one.

## What would make it work

Either upstream change, neither ours:

1. Desktop waits longer for `initialize`, or probes with a longer budget.
2. Dropping mcp-remote and owning the remote transport, with single-flight auth
   we control: one instance does OAuth behind a lock we wrote, the rest wait and
   share the tokens. That is the only version that actually fixes blocker 4 —
   and it means maintaining a hand-rolled MCP proxy forever, to save a user
   about ten seconds. Not obviously worth it.

## Use this instead

**Settings → Connectors → Add custom connector**, then paste:

```
https://mcp.lnb-mcp.workers.dev/mcp
```

Native, no install, no Node, and it syncs to claude.ai and mobile — which the
bundle never would, because it installs a local bridge on one machine.
