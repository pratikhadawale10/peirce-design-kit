# Driving Penpot through an MCP

Everything below was learned building a full design system into one Penpot file
over a working week: eleven surfaces, a 335-token catalog, both themes. It is
written for the next session, which would otherwise rediscover all of it at
considerable cost.

Read it before the first `execute_code` call. It describes the API and the loop,
not any particular design system — the file on the other end is the user's and
carries their tokens, their fonts and their conventions.

## 0. The one-paragraph version

The MCP exposes Penpot's plugin API through `execute_code`. It runs inside the design the user has open in their browser — not on a server. Calls are capped at 30 seconds, but a **timeout is not a failure**: the operation usually completed and the response was lost. You cannot trust anything you have not read back or exported and looked at. The working loop is draw → export → look → fix, in small batches, verifying after each one.

## 1. Connection

The `peirce` MCP server is configured in `~/.claude.json`, or shipped by this plugin's `.mcp.json` (project `mcpServers`, HTTP transport, bearer token in a header). Its tools register **only at session start**. If DNS or the network hiccups then, the whole session runs without `mcp__peirce__*` tools and `/mcp` reconnect does not bring them back.

That is survivable. Call the server directly over JSON-RPC with the same token — `peirce-mcp` does exactly this, and every tool works that way, `execute_code` and `export_shape` included. There is no `initialize` handshake needed per call.

```bash
peirce-mcp peirce_whoami                 # any tool + a JSON args file
peirce-mcp execute_code path/to/args.json
```

**The design must be open in the user's browser.** `execute_code` runs in their editor tab. If they navigate away you get "No design is open in the browser" — ask them to reopen, do not retry blindly. If they have it open in two tabs, Penpot shows a "MCP is active in another tab — switch here?" banner; the tab that wins the switch is the one that executes.

## 2. The scripts in this kit — reuse them, do not rewrite them

These are committed on purpose. A later session that writes its own equivalents will spend thousands of tokens rediscovering the same constraints.

- `peirce-mcp` — one JSON-RPC call to the MCP. `peirce-mcp <tool> <args.json>`, or `peirce-mcp code <file.js>` to run a script through `execute_code`.
- `peirce-run` — the one you will use most. `peirce-run <script.js> '<args-json>'` concatenates `tokens.js` + `lib.js` + your script and posts it. Your script sees `ARGS`, the token data, and all the drawing helpers.
- `TOKENS=flat peirce-run` — same, but prepends `tokens_flat.js` instead. Used only for loading tokens into Penpot.
- `lib.js` — drawing helpers: `board()`, `rect()`, `ell()`, `txt()`, `place()`, `section()`, `swatch()`, `byId()`, `findBoard()`, plus `contrast()` and `lum()` for live WCAG maths.
- `peirce-export` — `peirce-export <shapeId> <out.png>` exports a shape and writes the PNG to disk so it can be read back and looked at.
- `tokens-pull.js` — dumps the open file's token catalog as `TOKS` (rows) and `TOK` (name → value), so scripts can name the user's own tokens instead of typing hex. Redirect it to `lib/tokens.js` and it is prepended to every later call.

  If a design system is generated from a source of truth outside Penpot — a DTCG file, a build script — keep that outside this kit and emit `lib/tokens.js` from it. The kit deliberately ships no token data of its own.
- `flatten_tokens.py` — turns the DTCG file into `lib/tokens_flat.js`, a flat array the loader can iterate.
- `bind.js` — binds every fill and stroke to a matching library colour and renames the layer after it.
- `bindtok.js` — the important one: groups shapes by the library colour they reference and applies the matching **token**.
- `peirce-run ids` — prints every page and every top-level board with its id. **Address boards by id, never by name.**
- Transient, safe to ignore: `.build.js`, `.args.js`, `.payload.json`, `.resp.json` — rebuilt on every call.

## 3. The loop that actually works

1. Draw a small batch (one block, one row, ≤ 60 shapes).
2. Wait for the editor: `until peirce-run scan >/dev/null 2>&1; do sleep 8; done`.
3. Run any no-op call (`ping.js`) — **the exporter lags one call behind**. Export without it and you get the previous state, which looks exactly like your code having done nothing.
4. `peirce-export <sectionId> out.png`, downscale with `sips -Z 1500`, and **look at it**.
5. Fix what you see, not what you intended.

Export the section board, not the whole page. A 2560 × 7300 page export is slow and times out while the renderer is busy re-resolving tokens.

## 4. Timeouts, crashes and other lies

- **A 30-second timeout is usually a success.** `token.applyToShapes()` never returns — the task always times out — but the binding is applied and the script continues to the next statement. Batch many groups into one call, ignore the timeout, then verify by reading `shape.tokens`. The same is true of large `addToken` batches.
- **The page really does crash sometimes.** When it does, Penpot rolls back to a recent checkpoint and you lose the last writes. Every pass must therefore be **idempotent and re-runnable**, and you must verify counts after each batch (`bindcheck.js`, `vtok.js`, `typofix.js` all exist for this).
- **Reads can be stale.** Asset lists in particular report soft-deleted entries and lag behind writes. If a count looks wrong, wait and read again before acting on it.

## 5. Constraints of the plugin API

- **`shape.x` / `shape.y` are absolute page coordinates**, not parent-relative. Use `place(shape, parent, x, y)`.
- **Penpot rewrites `/` in a layer name to ` / `** — it is the asset-group separator. `findBoard('sec/foo')` then misses. Address by id.
- **A null parent fails silently.** The helper `place()` throws on `undefined` for this reason: 56 shapes once landed on the page root, invisible inside the board they should have been in.
- **`width` / `height` are read-only** — use `resize(w, h)`. On a Text, `resize()` forces `growType: 'fixed'`, which is what you want.
- **Never set `text.fontFamily` by hand.** Go through `penpot.fonts.findAllByName(name).find(f => f.name === name)`, then `font.applyToText(text, variant)`, then set `text.fontId = 'gfont-inter'` (or `'gfont-jetbrains-mono'`) explicitly. `applyToText` leaves a local uuid behind and the text renders at regular weight regardless of `fontWeight`.
- **`letterSpacing` rejects negative values.** No optical tightening of display text.
- **Icons: `penpot.createShapeFromSvg()`** with `fill="#RRGGBB"` or `stroke="…"` in the path is far faster than creating shapes and colouring descendants. To show a stroke scaled up (a construction diagram), multiply `stroke-width` by the scale factor — resizing the shape does not thicken the stroke.

## 6. Tokens: what works, what does not

**Creating tokens from code works.** `penpot.library.local.tokens` is a `TokenCatalog` with `sets`, `themes`, `addSet()`, `addTheme()`; each `TokenSet` has `addToken({type, name, value})`. It serialises as `{}` because everything is a getter — probe it with the documented members, never `Object.keys`.

- **Activate a set before loading aliased tokens into it.** A value like `{color.brand.500}` is rejected as invalid if the set it references is inactive. This one error message cost an hour.
- **Plugin token types differ from DTCG names**: `fontFamilies`, `fontSizes`, `fontWeights` (plural) where the JSON says `fontFamily`, `fontSize`, `fontWeight`. Penpot's importer also rejects `strokeWidth` — use `borderWidth`.
- **Negative shadow spread is rejected.** Clamp to 0.
- **Token names cannot contain a numeric path segment like `0.5`** — `spacing.0.5` fails with "Field name is invalid". The spacing scale is named by pixel value for this reason.
- **`TokenTheme.addSet()` is a no-op.** Themes created from the plugin come out empty and, once activated, deactivate every set not in them. Toggle sets directly instead, or create themes through the panel's JSON import, which does work.
- **Editing a token value in place works** (`token.value = '{color.neutral.330}'`) but **already-bound shapes keep the old resolved colour until the theme is toggled off and on**. A fix will look like it failed until you cycle the theme.

**Applying tokens to shapes** works through `token.applyToShapes(shapes, ['fill'])` — with the timeout caveat above. Valid property names come from the API docs: `fill`, `strokeColor`, `strokeWidth`, `borderRadiusTopLeft`…`borderRadiusBottomLeft`, `typography`, `shadow`, `width`, `height`, padding and gap names for layouts.

- **Re-applying a token to a shape that already carries one is unreliable.** Each pass keeps a different subset and silently drops earlier bindings. **Fresh shapes bind reliably.** So to re-map an existing block: delete it, redraw it, and apply the tokens **in the same call**. That pattern binds 18 of 18 buttons every time; re-binding in place never got past 10.
- Applying a token whose resolved value already equals the current fill can be a no-op that records nothing. Bind while the *other* theme is active if you hit this.

## 7. Library assets

`penpot.library.local.createColor()` / `createTypography()` / `createComponent(shapes)`. A library colour binds a fill through `libColor.asFill()`, which returns `{fillColor, fillColorRefFile, fillColorRefId}` — the shape then follows the asset when it changes. Applying a *token* to that shape clears the library ref, which is expected.

**`LibraryTypography` needs `fontVariantId` taken from `variant.fontVariantId`** — not `variant.id`, which is `undefined`. Without it the typography silently vanishes on save: fourteen were created and zero persisted before this was found.

## 8. Assumptions I brought, and what review corrected

This is the part that matters most, because every one of these was believed confidently and was wrong.

- **"Tokens can't be created from the plugin — `library.local.tokens` is an empty object."** Wrong. It is an interface of getters. `addSet` and `addToken` work fine. The empty `{}` was a serialisation artefact.
- **"`applyToShapes` is broken — it hangs the editor."** Wrong. It applies and continues; only the response is lost. Three separate sessions' worth of workarounds were designed around this false conclusion before a read-back after the timeout showed `{"fill":"text.tertiary"}` sitting there all along.
- **"Binding by hex is safe."** Wrong. `#16191F` is both `color.neutral.800` and the dark theme's `bg.overlay`. Dark label text auto-bound to `bg.overlay` turned white-on-white the moment the light theme was activated. Any hex-driven binder needs an explicit precedence rule and a manual override for demo blocks.
- **"The documentation page can be fully theme-aware."** Wrong. Anything that documents one specific theme — the dark token card, the light token card, the elevation stage — must be pinned to **primitives**, or it repaints and stops proving what it claims.
- **"An export shows the current state."** No. It lags a call behind. Two "the code did nothing" investigations were the exporter being one step behind.
- **"A contrast table measured on dark is fine as documentation."** It was, but a dark slab on a white page reads as a bug no matter what the caption says. Rebuilding it to print **both** themes' ratios per row immediately exposed three real light-mode failures (`danger.400` at 2.8:1, `success.400` at 2.0:1, `text.tertiary` at 4.4:1) that the dark-only table had been hiding. **Making the documentation honest is a debugging technique, not a cosmetic one.**

## 9. How the quality actually got there

Nothing on that page was right first time. The loop was always the same: draw, export, look, judge, alter.

- **Priority icons** went filled-triangle → stroked chevron → chevron with optical correction, across three review passes. The last one — dropping double chevrons to 1.75px against the singles' 2px — only became obvious after looking at a 700px-wide export of a single row.
- **The button state grid** was drawn, bound, found inverted in light mode, re-bound four times unsuccessfully, then deleted and redrawn with tokens applied at creation. That failure is what taught the delete-and-redraw rule.
- **The iconography section** was built, reviewed, found to be "added randomly anywhere" — because every block had its own arbitrary x origin — and rebuilt on four 574px columns with 24px gutters summing to exactly 2368.
- **Section 08 looked broken in light mode** because it was created *after* the page-wide binding pass, so its board and header were never bound. The fix was cheap; finding it required a page-wide audit for shapes with a fill and no token. Run that audit at the end of any session: it should report zero.

## 10. Order of operations for a fresh design file

1. `python3 tokens/build_tokens.py` then `python3 tokens/flatten_tokens.py`.
2. Load the tokens through Penpot's own Tokens panel, or with a loader of your own. **Activate a set before loading aliased tokens into it**, or every `{color.brand.500}` reference is rejected as invalid.
3. Verify with `tokcheck2.js` — set names, counts, which are active.
4. Publish library colours and text styles through the Assets panel, in small batches, and verify none vanished: `LibraryTypography` silently drops on save when `fontVariantId` came from `variant.id` rather than `variant.fontVariantId`.
5. Draw, in small batches, applying tokens **inside the same call** that creates the shapes.
6. After each batch: wait for the editor, `ping.js`, export, look.
7. At the end: audit for unbound shapes, and toggle the theme both ways and export each section.

## 11. Session checklist

- Ask the user to open the design in Penpot before anything else.
- `peirce-run ids` for board ids.
- Never address a board by name.
- Batch ≤ 60 shapes per call; wait for the editor between calls.
- Treat a 30s timeout as "probably applied" — verify, do not retry blindly.
- Verify by reading back, then by exporting and looking.
- Re-map a block by deleting and redrawing it, not by re-binding it.
- Finish with the unbound-shape audit and a both-themes export.
