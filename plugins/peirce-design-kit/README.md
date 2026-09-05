# peirce-design-kit

Drives Penpot through the Peirce MCP. It exists because the MCP hands you
`execute_code` and nothing else: no worked loop, and no warning about the half
dozen behaviours that will each cost you a session to discover.

The code is the small half of this. The procedure and the failure catalogue in
`skills/penpot-mcp/` are the reason designs come out finished rather than blocky.

## Install

```
/plugin marketplace add pratikhadawale10/peirce-design-kit
/plugin install peirce-design-kit@peirce
```

`bin/` lands on the Bash tool's PATH and the skill loads itself when a task
touches design work. To try it without installing:

```sh
claude --plugin-dir ./plugins/peirce-design-kit
```

### Working on the kit itself

Link your own install at the checkout rather than keeping a second copy that
drifts:

```sh
ln -s "$PWD/plugins/peirce-design-kit" ~/.claude/skills/peirce-design-kit
```

Edits are then live in your next session with no copying.

## Configure

The kit needs a bearer token for the MCP server.

```sh
export PEIRCE_MCP_TOKEN='Bearer …'      # or configure the 'peirce' server in ~/.claude.json
export PEIRCE_MCP_URL='https://peirce.app/mcp'   # optional, this is the default
```

If you already have the `peirce` MCP server in `~/.claude.json`, the commands find
the token there on their own — no env var needed.

`.mcp.json` also registers the server for Claude Code itself, so the
`mcp__peirce__*` tools appear when the network cooperates. When they don't
register, nothing breaks: `peirce-mcp` reaches the same server over JSON-RPC.

## Use

```sh
peirce-mcp peirce_whoami                       # sanity check: auth and projects
peirce-run ids                                 # page and board ids
peirce-run examples/01-hello-board.js          # draw something
peirce-run ping && peirce-export <id> /tmp/a.png   # then LOOK at the png
```

A design must be **selected** (`peirce_select_design`) **and open in the user's
browser**. `execute_code` runs in their editor tab. "No design is open in the
browser" means ask them to open it; retrying will not help.

## Layout

```
.claude-plugin/plugin.json     manifest and version
.mcp.json                      registers the peirce MCP server
bin/                           peirce-mcp, peirce-run, peirce-export  (on PATH)
skills/penpot-mcp/
  SKILL.md                     the loop and the hard rules — read this first
  reference/handbook.md        the long form, with the failure catalogue
  lib/                         lib.js, concatenated per call (tokens.js if you pull one)
  recipes/                     ids, ping, scan, unbound, tokens-pull, bind, …
examples/
```

## Why concatenation, not imports

`peirce-run` pastes `ARGS` + token data + `lib.js` + your script into one string
and posts it to `execute_code`. Penpot's plugin sandbox has no module loader —
`require`, `import` and `export` do not exist there. That is also why the library
is plain `var`-style source rather than a bundle.

## Tokens belong to the file, not to the kit

The kit ships no token data and no palette. The design system on the other end is
the user's.

```sh
peirce-run tokens-pull | sed 's/^\[LOG\] //' > skills/penpot-mcp/lib/tokens.js
```

That gives every later call a `TOKS` array and a `TOK` name-to-value map for the
open file. If the file has no catalog yet, build one before painting a system by
hand — literal fills cannot be re-themed and drift within a few sessions.

Fonts default to Inter and JetBrains Mono. Override per call:

```sh
peirce-run myscript.js '{"fonts":{"body":"Roboto","mono":"IBM Plex Mono"}}'
```
