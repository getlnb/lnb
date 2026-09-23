#!/usr/bin/env node
/*
 * stdio bridge from Claude Desktop to the remote LNB server.
 *
 * The obvious build — spawn `mcp-remote` and pipe stdio straight through —
 * installs fine and then fails, and Desktop's log says exactly why:
 *
 *   21:02:55.254  spawn #1 (sibling probe)
 *   21:02:55.654  Era probe verdict: legacy (sibling did not complete the exchange)
 *   21:02:55.669  spawn #2 (real server)
 *   21:02:55.678  initialize sent
 *   21:02:56.043  transport closed
 *
 * Desktop allows roughly 400 ms for a server to answer, and probes twice.
 * mcp-remote does OAuth discovery and connects to the remote BEFORE it serves
 * stdio, measured at 2,418 ms — six times the budget. No amount of tuning
 * closes that gap, because the cost is a network round trip inside a handshake
 * budget written for a local process.
 *
 * So this bridge answers `initialize` itself, immediately, and warms the remote
 * connection behind it. Everything else is queued until the proxy is up and
 * then forwarded untouched.
 *
 * The honesty cost, stated plainly: the capabilities below are a local copy of
 * what the remote advertises. They are stable (the remote has served this exact
 * shape since 0.2.0) and both sides are ours, so drift is a deploy-time
 * concern, not a runtime one — but if the server ever gains a capability, this
 * constant is the thing that has to change with it.
 */
const { spawn } = require('node:child_process')
const path = require('node:path')
const readline = require('node:readline')

const URL = process.env.LNB_MCP_URL || 'https://mcp.lnb-mcp.workers.dev/mcp'
const proxy = path.join(__dirname, 'node_modules', 'mcp-remote', 'dist', 'proxy.js')

/* A pre-registered public client, pinned so the instances cannot race.
 *
 * Desktop runs several copies of this server at once. Left to itself,
 * mcp-remote registers a fresh OAuth client per instance (dynamic client
 * registration), they race, and the authorization code gets redeemed against a
 * different client id than it was issued to:
 *
 *   [53862] Creating lockfile for server c24b5947... on port 7258
 *   [53861] Another instance is handling authentication on port 7258 (pid: 53862)
 *   [53862] Authorization error: InvalidGrantError: Client ID mismatch
 *
 * Pinning one client id removes the registration entirely, so every instance
 * presents the same identity and the lockfile's elected leader can finish.
 * Public client, no secret — the bundle ships to end users, so it must hold
 * nothing that is not already safe to publish; PKCE is what protects the
 * exchange, and the redirect is a loopback address. */
const CLIENT_INFO = JSON.stringify({ client_id: 'jJpHM49fTvSW31JD' })

/** Our own initialize response. Must match what the remote advertises. */
const SERVER_INFO = { name: 'lnb', version: '0.2.0' }
const CAPABILITIES = { prompts: { listChanged: true }, tools: { listChanged: true } }

/* An id the client will never use, so the proxy's answer to OUR warm-up
   handshake is recognisable and can be swallowed rather than forwarded as a
   duplicate reply the client never asked for. */
const WARMUP_ID = '__lnb_warmup__'

const send = (obj) => process.stdout.write(JSON.stringify(obj) + '\n')

/* Desktop does not route this process's stderr into its per-server log, so
   stderr alone leaves the bridge undebuggable in situ. Tee to a file as well;
   the pid is in every line because Desktop runs SEVERAL instances at once and
   untangling them is most of the work. */
const fs = require('node:fs')
const os = require('node:os')
const LOGFILE = process.env.LNB_BRIDGE_LOG || path.join(os.tmpdir(), 'lnb-bridge.log')
const log = (m) => {
  const line = `${new Date().toISOString()} [${process.pid}] ${m}\n`
  process.stderr.write(line)
  try { fs.appendFileSync(LOGFILE, line) } catch {}
}

let ready = false
const queue = []
let clientInit = null

const child = spawn(process.execPath, [proxy, URL, '--static-oauth-client-info', CLIENT_INFO], {
  stdio: ['pipe', 'pipe', 'inherit'],
  env: process.env,
})
child.on('error', (err) => {
  log(`could not start the bundled proxy: ${err.message}`)
  process.exit(1)
})
child.on('exit', (code, signal) => {
  log(`proxy exited code=${code} signal=${signal} ready=${ready} queued=${queue.length}`)
  process.exit(signal ? 1 : (code ?? 0))
})
for (const sig of ['SIGINT', 'SIGTERM']) process.on(sig, () => child.kill(sig))
log(`bridge start url=${URL}`)

const toChild = (obj) => child.stdin.write(JSON.stringify(obj) + '\n')

function flush() {
  ready = true
  while (queue.length) toChild(queue.shift())
}

/* Child -> client. The proxy only starts answering once it has finished OAuth
   and connected; the first thing it answers is our warm-up, which is the
   signal that the queue can drain. */
readline.createInterface({ input: child.stdout }).on('line', (line) => {
  if (!line.trim()) return
  let msg
  try {
    msg = JSON.parse(line)
  } catch {
    return // the proxy prints non-JSON banners on stdout in some versions
  }
  if (msg.id === WARMUP_ID) {
    log('remote connected; releasing queued messages')
    flush()
    return
  }
  send(msg)
})

/* Client -> child. */
readline.createInterface({ input: process.stdin }).on('line', (line) => {
  if (!line.trim()) return
  let msg
  try {
    msg = JSON.parse(line)
  } catch {
    return
  }

  if (msg.method === 'initialize') {
    // Answer now. Desktop is holding a ~400ms stopwatch.
    clientInit = msg.params
    send({
      jsonrpc: '2.0',
      id: msg.id,
      result: {
        protocolVersion: msg.params?.protocolVersion ?? '2024-11-05',
        capabilities: CAPABILITIES,
        serverInfo: SERVER_INFO,
      },
    })
    // Then do the real handshake against the remote, out of band.
    toChild({ jsonrpc: '2.0', id: WARMUP_ID, method: 'initialize', params: msg.params })
    return
  }

  // `notifications/initialized` belongs to the handshake we just faked, so it
  // must not reach the proxy before the proxy's own handshake has completed.
  if (ready) toChild(msg)
  else queue.push(msg)
})

process.stdin.on('end', () => child.kill())
