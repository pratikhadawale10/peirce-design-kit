/* Every shape that paints must carry a token. Finish a session with this: it
   must report 0. Pass {"sec":"<boardId>"} to scope it, otherwise it walks the
   whole current page.

   Pass {"exempt":"mark|literal|data colour"} to widen the exemption pattern to
   your own naming: the default only knows the conventions this kit grew up with.

   Shapes whose name marks them as deliberately literal are exempt: anything
   documenting one specific theme (a dark/light demo card, a contrast table) is
   pinned to a primitive on purpose and would stop proving its point if it
   repainted with the theme. */
var ROOT = ARGS.sec ? byId(ARGS.sec) : penpot.currentPage.root, out = [];
var EX = new RegExp(ARGS.exempt || 'mark|literal|svg-path', 'i');
(function walk(x) {
  var ch = x.children || [];
  for (var i = 0; i < ch.length; i++) {
    var s = ch[i], t = s.tokens || {};
    var hasFill   = s.fills   && s.fills.length   && typeof s.fills   !== 'string';
    var hasStroke = s.strokes && s.strokes.length && typeof s.strokes !== 'string';
    var exempt = EX.test(s.name || '') || EX.test((s.parent && s.parent.name) || '');
    if (!exempt && ((hasFill && !t.fill) || (hasStroke && !t.strokeColor))) {
      out.push(s.type + ':' + (s.name || '') + ':' + (s.parent && s.parent.name) +
               (hasFill && !t.fill ? ' F' : '') + (hasStroke && !t.strokeColor ? ' S' : ''));
    }
    walk(s);
  }
})(ROOT);
console.log('unbound=' + out.length + (out.length ? '\n' + out.slice(0, 20).join('\n') : ''));
