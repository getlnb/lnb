#!/usr/bin/env node
/*
 * Claude Desktop bundles run a LOCAL server over stdio — the manifest schema
 * takes a command, args and env, and has no field for a remote URL. LNB is a
 * remote HTTP server, so this shim bridges the two: it runs `mcp-remote`,
 * which speaks stdio to Claude and HTTP to us, and opens a browser for the
 * OAuth sign-in on first use.
 *
 * mcp-remote is VENDORED into this bundle rather than fetched with npx. The
 * first version of this shim spawned `npx`, and Desktop's log says why that
 * cannot work: "Using built-in Node.js for MCP server" — Desktop runs its own
 * bundled Node, so the user's npm is not on PATH and there is nothing to spawn.
 * It failed instantly with "Connection closed".
 *
 * Running `process.execPath` is the same fix from the other direction: whatever
 * Node launched this shim launches the proxy, so the bundle never depends on a
 * Node installation of its own.
 */
const { spawn } = require('node:child_process')
const path = require('node:path')

const URL = process.env.LNB_MCP_URL || 'https://mcp.lnb-mcp.workers.dev/mcp'
const proxy = path.join(__dirname, 'node_modules', 'mcp-remote', 'dist', 'proxy.js')

const child = spawn(process.execPath, [proxy, URL], {
  // stdio is the protocol channel and must pass through untouched; stderr is
  // where Desktop reads server logs from, so it is inherited too.
  stdio: ['inherit', 'inherit', 'inherit'],
  env: process.env,
})

child.on('error', (err) => {
  process.stderr.write(`LNB: could not start the bundled mcp-remote proxy (${err.message}).\n`)
  process.exit(1)
})
child.on('exit', (code, signal) => process.exit(signal ? 1 : (code ?? 0)))
for (const sig of ['SIGINT', 'SIGTERM']) process.on(sig, () => child.kill(sig))
