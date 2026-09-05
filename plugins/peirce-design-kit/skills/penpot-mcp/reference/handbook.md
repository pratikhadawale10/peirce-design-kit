# The long form

Written after building a full design system into one Penpot file over a working
week: eleven surfaces, a 335-token catalog, both themes. It is for the next
session, which would otherwise pay for all of it again.

## What is *not* here, and where it is

The behaviour of the Penpot API — the loop, the timeouts, the token rules, the
image path, the failures that are silent rather than loud — is delivered by the
server. Call `high_level_overview` once and it arrives appended to Penpot's own
reference, or call `peirce_design_skill` for the same text as a file to save in
the project.

It is not repeated here on purpose. It used to be, in four places and four
wordings, which is three more than can be kept true.

What follows is the part the server cannot tell you: what this kit contains, the
assumptions that were confidently wrong, and how the output actually got good.

## 1. Connection

The `peirce` MCP server is configured in `~/.claude.json`, or shipped by this
plugin's `.mcp.json`. Its tools register **only at session start**. If DNS or the
network hiccups then, the whole session runs without `mcp__peirce__*` tools, and
`/mcp` reconnect does not bring them back.

That is survivable. Call the server directly over JSON-RPC with the same token —
`peirce-mcp` does exactly that, and every tool works, with no per-call
`initialize` handshake.

```bash
peirce-mcp peirce_whoami
peirce-mcp execute_code args.json
```

If the user has the design open in two tabs, Penpot shows a "MCP is active in
another tab — switch here?" banner; the tab that wins the switch is the one that
executes.

## 2. What is in the kit

Committed on purpose. A later session that writes its own equivalents will spend
thousands of tokens rediscovering the same constraints.

- `bin/peirce-mcp` — one JSON-RPC call. `peirce-mcp <tool> <args.json>`, or
  `peirce-mcp code <file.js>` to run a script through `execute_code`.
- `bin/peirce-run` — the one you will use most. Concatenates `ARGS` +
  `lib/tokens.js` + `lib/lib.js` + your script and posts it. Your script sees
  `ARGS`, the token data and every helper.
- `bin/peirce-export` — exports a shape and writes the PNG to disk, so it can be
  read back and looked at.
- `lib/lib.js` — `place()`, `board()`, `rect()`, `ell()`, `txt()`, `byId()`,
  `findBoard()`, `solid()`, and `lum()` / `contrast()` for live WCAG maths.
- `lib/tokens.js` — **not shipped.** The design system belongs to the file.
  Generate it with `peirce-run tokens-pull > lib/tokens.js`. If your tokens come
  from a source of truth outside Penpot, keep that outside this kit and emit this
  file from it.
- `recipes/ids.js` — every page and top-level board, with ids.
- `recipes/scan.js` — what is already on the page, and where the space is.
- `recipes/ping.js` — a no-op, to flush the exporter's one-call lag.
- `recipes/tokens-pull.js` — the open file's catalog as `TOKS` (rows) and `TOK`
  (name → value), so scripts can name the user's own tokens instead of typing hex.
- `recipes/bindtok.js` — binds literal fills to tokens, matched by resolved
  colour value. Skips shapes that already carry one.
- `recipes/unbound.js` — the audit. Every shape that paints should carry a token;
  pass `exempt` to name the deliberate exceptions.
- `examples/` — two worked scripts, one drawing, one auditing.

## 3. Assumptions I brought, and what review corrected

The part that matters most, because every one of these was believed confidently
and was wrong.

- **"Tokens can't be created from the plugin — `library.local.tokens` is an empty
  object."** Wrong. It is an interface of getters. `addSet` and `addToken` work
  fine. The empty `{}` was a serialisation artefact.
- **"`applyToShapes` is broken — it hangs the editor."** Wrong. It applies and
  continues; only the response is lost. Three sessions' worth of workarounds were
  designed around this false conclusion before a read-back after the timeout
  showed the binding sitting there all along.
- **"Binding by hex is safe."** Wrong. One hex was both `color.neutral.800` and
  the dark theme's `bg.overlay`. Dark label text auto-bound to `bg.overlay` turned
  white-on-white the moment the light theme was activated. Any hex-driven binder
  needs an explicit precedence rule and a manual override for demo blocks.
- **"The documentation page can be fully theme-aware."** Wrong. Anything that
  documents one specific theme — a dark token card, an elevation stage — must be
  pinned to primitives, or it repaints and stops proving what it claims.
- **"An export shows the current state."** No. It lags a call behind. Two "the
  code did nothing" investigations were the exporter being one step behind.
- **"A contrast table measured on dark is fine as documentation."** It was, but a
  dark slab on a white page reads as a bug no matter what the caption says.
  Rebuilding it to print **both** themes' ratios per row immediately exposed
  three real light-mode failures that the dark-only table had been hiding.
  **Making the documentation honest is a debugging technique, not a cosmetic
  one.**

## 4. How the quality actually got there

Nothing was right first time. The loop was always draw, export, look, judge,
alter.

- **Priority icons** went filled-triangle → stroked chevron → chevron with
  optical correction, across three review passes. The last one — dropping double
  chevrons to 1.75px against the singles' 2px — only became obvious after looking
  at a 700px-wide export of a single row.
- **The button state grid** was drawn, bound, found inverted in light mode,
  re-bound four times unsuccessfully, then deleted and redrawn with tokens applied
  at creation. That failure is what taught the delete-and-redraw rule.
- **The iconography section** was built, reviewed, found to be "added randomly
  anywhere" — because every block had its own arbitrary x origin — and rebuilt on
  four 574px columns with 24px gutters summing to exactly 2368.
- **One section looked broken in light mode** because it was created *after* the
  page-wide binding pass, so its board and header were never bound. The fix was
  cheap; finding it required a page-wide audit for shapes with a fill and no
  token. That audit is `recipes/unbound.js`. Run it at the end of any session; it
  should report zero.

## 5. Order of operations for a fresh design file

1. Load the tokens through Penpot's own Tokens panel, or with a loader of your
   own.
2. Verify what landed: set names, counts, which are active.
3. Publish library colours and text styles through the Assets panel, in small
   batches, and verify none vanished.
4. Draw in small batches, applying tokens **inside the same call** that creates
   the shapes.
5. After each batch: wait for the editor, `peirce-run ping`, export, look.
6. At the end: `peirce-run unbound`, then toggle the theme both ways and export
   each section.

## 6. Session checklist

- Ask the user to open the design in Penpot before anything else.
- `peirce-run ids` for board ids. Never address a board by name.
- Small batches; wait for the editor between calls.
- Verify by reading back, then by exporting and looking.
- Re-map a block by deleting and redrawing it, not by re-binding it.
- Finish with the unbound-shape audit and a both-themes export.
