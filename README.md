# Peirce plugin marketplace

Tools for driving [Peirce](https://peirce.app) from an AI client.

```
/plugin marketplace add pratikhadawale10/peirce-design-kit
/plugin install peirce-design-kit@peirce
```

## What is here

**`peirce-design-kit`** — driving Penpot designs through the Peirce MCP. The MCP
hands you `execute_code` and a type reference; this carries the working loop and
the failure catalogue that the API cannot express, plus the drawing helpers and
recipes that make following it cheap.

It ships no palette and no token data of its own. The design system belongs to
the file you are working in.

## Reading it without installing

The scripts are short and worth reading before you run them:

- `plugins/peirce-design-kit/skills/penpot-mcp/SKILL.md` — the loop and the hard rules
- `plugins/peirce-design-kit/skills/penpot-mcp/reference/handbook.md` — the long form
- `plugins/peirce-design-kit/skills/penpot-mcp/lib/lib.js` — the drawing helpers
- `plugins/peirce-design-kit/skills/penpot-mcp/recipes/` — read a file's pages, tokens, unbound shapes
- `plugins/peirce-design-kit/bin/` — three shell scripts that talk to the MCP

## Configure

The commands need a bearer token for the MCP server:

```sh
export PEIRCE_MCP_TOKEN='Bearer …'
```

If the `peirce` MCP server is already in `~/.claude.json`, they find the token
there on their own.
