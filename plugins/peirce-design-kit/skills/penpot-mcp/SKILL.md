---
name: penpot-mcp
description: Draw, edit or audit anything in a Peirce design file (Penpot) — screens, components, icons, design-system pages, tokens. Use whenever the task touches a Peirce design, the Peirce MCP, execute_code, export_shape, Penpot tokens or library assets, or when the mcp__peirce__* tools are missing from the session and you still need to reach the server.
---

# Driving Penpot through the Peirce MCP

The MCP exposes Penpot's plugin API through `execute_code`. Your code runs inside
the design **open in the user's browser tab**, not on a server. That single fact
drives everything below.

Full detail, worked examples and the failure catalogue: `reference/handbook.md`.
Read it before a long session; the summary here is enough for a short one.

## Preflight

1. **A design must be selected and open.** `peirce_select_design` with the item
   key (`PROJECT-DS-1`), then have the user open it. "No design is open in the
   browser" means **ask them to open it — do not retry.**
2. `peirce-run ids` prints every page and every top-level board with its id.
   **Address boards by id.** Penpot rewrites `/` in a name to ` / `, so name
   lookups silently miss and shapes land on the page root instead of erroring.
3. If `mcp__peirce__*` tools are missing this session, that is fine and expected
   — they register only at session start. `peirce-mcp` calls the same server over
   JSON-RPC and every tool works, `execute_code` and `export_shape` included.

## Commands

```bash
peirce-run <script.js|recipe> '<args-json>'   # ARGS + tokens + lib.js + your script
peirce-mcp <tool> <args.json>                 # any other MCP tool
peirce-mcp code <file.js>                     # raw execute_code, no library
peirce-export <shapeId> out.png               # export, then LOOK at it
```

`lib.js` gives you `board() rect() ell() txt() place() byId() findBoard()
contrast() lum() onColor()`. Recipes: `ids`, `ping`, `scan`, `unbound`,
`tokens-pull`, `bindtok`.

The kit ships **no token data**: the design system belongs to the file, not to
the kit. `peirce-run tokens-pull` dumps the open file's catalog as `TOKS` and
`TOK`; redirect it to `lib/tokens.js` and it is prepended to every later call.
Fonts default to Inter and JetBrains Mono and are overridable per call with
`'{"fonts":{"body":"Roboto","mono":"IBM Plex Mono"}}'`.

## The loop — never skip a step

1. Draw a small batch. One block, **≤ 60 shapes**.
2. Wait for the editor: `until peirce-run scan >/dev/null 2>&1; do sleep 8; done`
3. Run `peirce-run ping`. **The exporter lags one call behind.** Skip this and
   you export the previous state and conclude your code did nothing.
4. `peirce-export <sectionId> out.png`, `sips -Z 1500 out.png`, and **read the
   image.** This step is what separates a real design from a plausible-looking
   one. Nothing lands correct first time.
5. Fix what you see. Repeat.

Export section boards, not the whole page: a full-page export times out while
the renderer is busy.

## Hard rules

- **A 30-second timeout is usually a success.** The write landed and the response
  was lost. `applyToShapes()` never returns. Retrying blindly double-applies.
  Verify by reading state back, never by retrying.
- **Crashes roll back recent writes.** Make every pass idempotent and verify
  counts after each batch.
- **Re-binding a token onto a shape that already has one is unreliable** — each
  pass keeps a different subset. To re-map a block: delete it, redraw it, apply
  the tokens **in the same call**. Fresh shapes bind 100%.
- **`shape.x/y` are absolute page coordinates.** Use `place(shape, parent, x, y)`.
- **Never set `text.fontFamily`.** Use
  `penpot.fonts.findAllByName(n).find(f => f.name === n)` → `applyToText(text, variant)`
  → then set `text.fontId` explicitly. `lib.js`'s `txt()` already does this.
- `resize(w, h)` — width/height are read-only. `letterSpacing` rejects negatives.
- Icons: `penpot.createShapeFromSvg()` with stroke and fill in the path. To show
  a stroke scaled up, multiply `stroke-width` by the scale; resizing does not
  thicken it.

## Tokens

`penpot.library.local.tokens` is a `TokenCatalog`. It serialises as `{}` because
everything is a getter — probe by documented member, never `Object.keys`.

- **Activate a set before loading aliased tokens into it**, or every
  `{color.brand.500}` value is rejected as invalid.
- Plugin type names are plural where DTCG is singular: `fontFamilies`,
  `fontSizes`, `fontWeights`. Use `borderWidth`, not `strokeWidth`. No negative
  shadow spread. No numeric path segment like `spacing.0.5`.
- **`TokenTheme.addSet()` is a no-op** — toggle sets directly, or import the JSON
  through the panel.
- Editing `token.value` works, but bound shapes keep the old colour **until the
  theme is toggled off and on**.
- Apply with `token.applyToShapes(shapes, ['fill'])`. Props: `fill`,
  `strokeColor`, `strokeWidth`, `borderRadius{TopLeft…}`, `typography`, `shadow`,
  `width`, `height`.
- `LibraryTypography` needs `fontVariantId` from `variant.fontVariantId`, not
  `variant.id`, or it silently vanishes on save.

## Design rules worth holding

- Every shape carries a token. Finish with `peirce-run unbound` — it must report
  **0**.
- Anything documenting one specific theme (dark/light demo cards, an elevation
  stage, a contrast table) is pinned to **primitives**, never semantic
  `bg.*`/`text.*`, or it repaints and stops proving what it claims.
- Beware hex collisions when binding by colour: one hex can belong to two tokens.
- Check contrast in-file with `contrast(fg, bg)` rather than assuming. A filled
  accent button usually needs the darker accent step; white on a mid accent
  often lands near 3.7:1 and fails AA.
- Snap to the type scale. Never introduce an off-scale size or weight; add a
  token deliberately instead.

## Starting on a file you have not seen

1. `peirce-run ids` — pages and board ids. Never address a board by name.
2. `peirce-run scan` and read what is already there. Find the empty space before
   you draw; the origin is rarely free.
3. `peirce-run tokens-pull` — if the file has a token catalog, pull it and bind
   to it. If it has none, ask whether to build one before painting a system by
   hand.
4. Draw in small batches, applying tokens **inside the same call** that creates
   the shapes. Fresh shapes bind reliably; re-binding does not.
5. Finish: `peirce-run unbound`, then export each board in every theme the file
   defines and look at them.
