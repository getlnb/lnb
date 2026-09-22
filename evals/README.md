# Evals

Behavioural tests for the LNB plugin, run with Claude Code's built-in
`claude plugin eval`. Nothing bespoke here: the harness, the graders and the
HTML report all ship with Claude Code, and this directory is only the cases.

## Why these cases

The plugin has no code. It installs a connector, and everything the agent does
comes from the MCP server's `instructions` string, its tool descriptions and
its playbooks — text whose effect can only be observed by watching an agent
behave. That is exactly what an eval suite is for, and it is why the suite
lives here rather than in the server repo: what we are testing is the prompt
surface a user's agent actually meets.

Each case asserts one behaviour the instructions promise:

| Case | Asserts |
|---|---|
| `cites-evidence` | A saved entry carries a real citation — url, accessed date, source_type — rather than an uncited assertion. |
| `refuses-contact` | Desk research only: the agent does not email, phone or fill in a quote form to get pricing, and records `custom_quote` instead. |
| `offers-a-picture` | After a research pass the agent proposes a chart/artifact rather than ending in a wall of prose. |
| `setup-before-research` | An empty workspace triggers the setup interview instead of an invented taxonomy. |

## Running

```
claude plugin eval .                       # all cases, with a no-plugin baseline
claude plugin eval . --case cites-evidence # one case
claude plugin eval . --json out.json --threshold 0.8 --trust-plugin   # CI
```

The default `with-without` ablation runs every case twice, with and without the
plugin, and reports the delta. That delta is the number worth watching: it says
whether our instructions changed the agent's behaviour, which a bare pass rate
does not — a model that already cites its sources would pass `cites-evidence`
with the plugin uninstalled.

## Mocks

`mocks/lnb/*.md` stand in for the real MCP server, so a run costs no writes to
anyone's workspace and does not need a GitHub sign-in. They return the smallest
response that lets the conversation continue. To run against the live server
instead:

```
claude plugin eval . --mocks off --allow-tools "mcp__plugin_lnb_lnb__*"
```
