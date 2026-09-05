---
name: penpot-mcp
description: Draw, edit or audit anything in a Peirce design file (Penpot) — screens, components, icons, design-system pages, tokens. Use whenever the task touches a Peirce design, the Peirce MCP, execute_code, export_shape, Penpot tokens or library assets, or when the mcp__peirce__* tools are missing from the session and you still need to reach the server.
---

# Driving Penpot through the Peirce MCP

This file covers what the **kit** adds: the runner, the helpers, the recipes.

It deliberately does not restate how the Penpot API behaves. The server sends
that itself — call `high_level_overview` once and you get the draw-check-fix
loop, the token rules, the image path and the failures that are silent rather
than loud, appended to Penpot's own reference. One copy, in one place, so there
is no second version to go stale. If your client never surfaces it,
`peirce_design_skill` returns the same text as a file to keep.

`reference/handbook.md` is the long form: the assumptions that turned out to be
wrong under review, and how the output actually got good.

## Preflight

1. **A design must be selected and open in the user's browser.**
   `peirce_select_design` with the item key (`PROJECT-DS-1`), then ask them to
   open it.
2. `peirce-run ids` prints every page and top-level board with its id. Address
   boards by id.
3. If `mcp__peirce__*` is missing this session, that is expected — those tools
   register only at session start. `peirce-mcp` reaches the same server over
   JSON-RPC and every tool works, `execute_code` and `export_shape` included.

## Commands

```bash
peirce-run <script.js|recipe> '<args-json>'   # ARGS + tokens + lib.js + your script
peirce-mcp <tool> <args.json>                 # any other MCP tool
peirce-mcp code <file.js>                     # raw execute_code, no library
peirce-export <shapeId> [out.png]             # export, then LOOK at it
```

Each invocation gets its own scratch directory, so two runs in parallel cannot
read each other's half-written payload. Set `PEIRCE_WORK` to a real path to keep
the intermediate files and inspect them.

## What lib.js gives you

- `place(sh, parent, x, y)` — the only correct way to position a child. Throws on
  an undefined parent instead of silently dropping the shape on the page root.
- `board(parent, x, y, w, h, opt)`, `rect(…)`, `ell(…)` — create, size and place
  in one call. `opt` takes `fill`, `stroke`, `sw`, `sa`, `r`, `name`.
- `txt(parent, x, y, w, h, str, opt)` — text with the font applied the way that
  actually holds. `opt` takes `size`, `w` (weight), `lh`, `ls`, `align`,
  `valign`, `color`, `mono`.
- `byId(id)`, `findBoard(name)` — lookup. Prefer `byId`.
- `lum(hex)`, `contrast(a, b)` — WCAG maths against the file's real colours.
- `solid(color, opacity)` — a fill object.

Fonts default to Inter and JetBrains Mono, overridable per call with
`'{"fonts":{"body":"Roboto","mono":"IBM Plex Mono"}}'`.

## Recipes

| recipe | what it does |
| --- | --- |
| `ids` | every page and top-level board, with ids |
| `scan` | what is already on the page, and where the space is |
| `ping` | a no-op, to flush the exporter's one-call lag |
| `tokens-pull` | the open file's token catalog, as JS |
| `bindtok` | bind literal fills to tokens, matched by resolved value |
| `unbound` | the audit — every shape that paints should carry a token |

The kit ships **no token data**. The design system belongs to the file, not to
the kit. `peirce-run tokens-pull > lib/tokens.js` and it is prepended to every
later call; point `TOKENS` at another path to swap it.

## Working on a file you have not seen

1. `peirce-run ids`, then `peirce-run scan`. Find the empty space before you
   draw — the origin is rarely free.
2. `peirce-run tokens-pull`. If the file has a catalog, bind to it. If it has
   none, ask before painting a system by hand.
3. Draw in small batches, applying tokens **inside the same call** that creates
   the shapes. The operating notes explain why the order matters.
4. Between batches, wait for the editor:
   `until peirce-run scan >/dev/null 2>&1; do sleep 8; done`
5. `peirce-run ping`, then `peirce-export <boardId> out.png`, then
   `sips -Z 1500 out.png`, and read the image.
6. Finish with `peirce-run unbound` — it should report 0 — and an export of each
   board in every theme the file defines.

## Judgement, not just mechanics

- Snap to the file's own type and spacing scale. An off-scale value is a decision
  to make deliberately, as a new token, not by typing a number.
- Check contrast with `contrast(fg, bg)` rather than assuming. A filled accent
  button usually needs the darker step.
- Beware hex collisions when binding by colour: one hex can belong to two tokens,
  and the wrong pick goes unnoticed until the theme flips.
- Anything documenting one specific theme is pinned to primitives, never to
  semantic `bg.*`/`text.*`, or it repaints and stops proving its point.
