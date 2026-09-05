/* Bind literal fills and strokes to the file's own colour tokens, by value.

     peirce-run bindtok '{"root":"<boardId>","count":true}'      what would bind
     peirce-run bindtok '{"root":"<boardId>","from":0,"to":40}'  bind a range

   Matching is by resolved colour value, not by naming convention, so this works
   on any file rather than only on one whose layers follow a particular scheme.

   Two reasons it is batched and grouped:
     - `applyToShapes` never returns; the call times out having succeeded, so
       small ranges keep each timeout cheap and the pass re-runnable.
     - Grouping shapes by token means one apply per token rather than per shape.

   A shape that already carries a token is skipped. Re-binding over an existing
   binding keeps a different arbitrary subset on each pass; to re-map a block,
   delete it, redraw it, and bind inside the same call that draws it. */
var CAT = penpot.library.local.tokens, BYHEX = {}, tokenCount = 0;
for (var i = 0; i < (CAT.sets || []).length; i++) {
  var set = CAT.sets[i], toks = set.tokens || [];
  for (var j = 0; j < toks.length; j++) {
    var t = toks[j];
    if (String(t.type).toLowerCase() !== 'color') continue;
    var v = String(t.value || '').trim().toLowerCase();
    /* an alias like {color.brand.500} has no value of its own to match on */
    if (v.charAt(0) !== '#') continue;
    tokenCount++;
    if (!BYHEX[v]) BYHEX[v] = t;
  }
}

var groups = {}, order = [];
function add(key, tok, prop, shape) {
  if (!groups[key]) { groups[key] = { token: tok, prop: prop, shapes: [] }; order.push(key); }
  groups[key].shapes.push(shape);
}
(function walk(x) {
  var ch = x.children || [];
  for (var i = 0; i < ch.length; i++) {
    var s = ch[i], bound = s.tokens || {};
    var f = s.fills;
    if (!bound.fill && f && f.length && typeof f !== 'string' && f[0].fillColor) {
      var fh = f[0].fillColor.toLowerCase(), ft = BYHEX[fh];
      if (ft) add(ft.name + '|fill', ft, 'fill', s);
    }
    var st = s.strokes;
    if (!bound.strokeColor && st && st.length && typeof st !== 'string' && st[0].strokeColor) {
      var sh = st[0].strokeColor.toLowerCase(), stt = BYHEX[sh];
      if (stt) add(stt.name + '|strokeColor', stt, 'strokeColor', s);
    }
    walk(s);
  }
})(ARGS.root ? byId(ARGS.root) : penpot.currentPage.root);

order.sort();
if (ARGS.count || ARGS.from === undefined) {
  var total = 0;
  for (var i = 0; i < order.length; i++) total += groups[order[i]].shapes.length;
  console.log('colour tokens=' + tokenCount + ' groups=' + order.length +
              ' shapes=' + total + '\nrun again with {"from":0,"to":40} to apply');
} else {
  var to = ARGS.to === undefined ? order.length : ARGS.to;
  for (var i = ARGS.from; i < to && i < order.length; i++) {
    var g = groups[order[i]];
    for (var c = 0; c < g.shapes.length; c += 60) {
      g.token.applyToShapes(g.shapes.slice(c, c + 60), [g.prop]);
    }
  }
  console.log('applied groups ' + ARGS.from + '-' + Math.min(to, order.length) +
              ' of ' + order.length);
}
