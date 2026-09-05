# Changelog

## 0.1.0

First extraction from the `.ds/` scripts that built the Peirce design system into
`UIREVAMP-DS-1`.

- `bin/peirce-mcp`, `bin/peirce-run`, `bin/peirce-export` — no hardcoded paths.
  Root resolves from the script's own location; the token comes from
  `PEIRCE_MCP_TOKEN` or any `peirce` MCP entry in `~/.claude.json`.
- `skills/penpot-mcp/SKILL.md` — the loop and the hard rules, kept short.
  `reference/handbook.md` behind it for the long form.
- `recipes/ids.js` replaces the old hardcoded board-id list with discovery, so
  the kit works against any file rather than one specific one.
- `recipes/unbound.js` generalised to default to the whole current page.
- Generic by construction. The kit ships no token data, no palette and no
  design-system helpers: `lib.js` is drawing primitives only, fonts are
  overridable per call, and `tokens-pull` reads the catalog out of whatever file
  is open. `section()` and `swatch()` assumed one specific dark palette and were
  dropped; the token build pipeline is a design system's own concern and stays
  outside the kit.

Caught during the first end-to-end run against `UIREVAMP-DS-1`:

- `peirce-run` with no arguments emitted `var ARGS = {\};` — a bash brace-default
  leaking a backslash into the payload. Every no-argument call would have died at
  execution. A `node --check` pass over each recipe now guards this.
- `ids.js` never marked the current page: Penpot returns a fresh proxy on each
  `penpot.currentPage` access, so `===` never matches. Compares ids now.
- `unbound.js` had its exemption pattern hardcoded to the naming conventions of
  one page. It takes an `exempt` regex argument now.

Distributed as a Claude Code plugin marketplace from this repository. This is the
source of truth; a local install should be a symlink to `plugins/peirce-design-kit`.
