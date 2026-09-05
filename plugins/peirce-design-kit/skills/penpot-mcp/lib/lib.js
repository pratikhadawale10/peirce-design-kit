/* ---- Drawing helpers, prepended to every call ----

   Generic on purpose: this runs against whatever file the user has open, which
   carries their fonts and their tokens, not ours. Override the two families
   per call with ARGS.fonts, e.g.

     peirce-run myscript.js '{"fonts":{"body":"Roboto","mono":"IBM Plex Mono"}}'

   Nothing here types a colour for you. Bind a token or pass one explicitly: a
   file whose fills are literals cannot be re-themed and drifts within a few
   sessions.                                                                  */
var FONTS = (typeof ARGS === 'object' && ARGS && ARGS.fonts) || {};
function _family(name, fallbackId) {
  var f = penpot.fonts.findAllByName(name).find(function (x) { return x.name === name; });
  return f ? { font: f, id: f.id || fallbackId } : null;
}
var BODY = _family(FONTS.body || 'Inter', 'gfont-inter');
var MONO = _family(FONTS.mono || 'JetBrains Mono', 'gfont-jetbrains-mono');
function place(sh, parent, x, y) { if (parent === undefined) throw new Error('place: parent undefined'); if (parent) parent.appendChild(sh); sh.x = (parent ? parent.x : 0) + x; sh.y = (parent ? parent.y : 0) + y; return sh; }
function solid(c, o) { return { fillColor: c, fillOpacity: (o === undefined ? 1 : o) }; }
function rect(parent, x, y, w, h, opt) {
  opt = opt || {};
  var r = penpot.createRectangle(); r.resize(w, h); place(r, parent, x, y);
  r.fills = opt.fill ? [solid(opt.fill, opt.fillOpacity)] : [];
  if (opt.r !== undefined) { r.borderRadius = opt.r; }
  if (opt.stroke) r.strokes = [{ strokeColor: opt.stroke, strokeStyle: 'solid', strokeWidth: opt.sw || 1, strokeAlignment: opt.sa || 'inner', strokeOpacity: opt.so === undefined ? 1 : opt.so }];
  if (opt.name) r.name = opt.name;
  return r;
}
function ell(parent, x, y, w, h, opt) {
  opt = opt || {};
  var e = penpot.createEllipse(); e.resize(w, h); place(e, parent, x, y);
  e.fills = opt.fill ? [solid(opt.fill, opt.fillOpacity)] : [];
  if (opt.stroke) e.strokes = [{ strokeColor: opt.stroke, strokeStyle: 'solid', strokeWidth: opt.sw || 1, strokeAlignment: 'inner' }];
  if (opt.name) e.name = opt.name;
  return e;
}
function board(parent, x, y, w, h, opt) {
  opt = opt || {};
  var b = penpot.createBoard(); b.resize(w, h); place(b, parent, x, y);
  b.fills = opt.fill ? [solid(opt.fill, opt.fillOpacity)] : [];
  if (opt.r !== undefined) b.borderRadius = opt.r;
  if (opt.stroke) b.strokes = [{ strokeColor: opt.stroke, strokeStyle: 'solid', strokeWidth: opt.sw || 1, strokeAlignment: opt.sa || 'inner' }];
  b.name = opt.name || 'board';
  b.clipContent = opt.clip === undefined ? true : opt.clip;
  if (opt.shadow) b.shadows = opt.shadow;
  return b;
}
function txt(parent, x, y, w, h, str, opt) {
  opt = opt || {};
  var t = penpot.createText(String(str));
  var fam = opt.mono ? MONO : BODY;
  var wt = String(opt.w || 400);
  /* Never assign fontFamily: it leaves the text in a fallback that looks almost
     right. Apply a real variant, then set fontId explicitly. */
  if (fam) {
    var v = fam.font.variants.find(function (vv) { return vv.fontWeight === wt && vv.fontStyle === 'normal'; }) || fam.font.variants[0];
    fam.font.applyToText(t, v);
    t.fontId = fam.id;
  }
  t.fontWeight = wt;
  t.fontSize = String(opt.size || 14);
  t.lineHeight = opt.lh ? (opt.lh / (opt.size || 14)) : 1.45;
  if (opt.ls) t.letterSpacing = String(opt.ls);
  t.growType = 'fixed';
  t.resize(w, h);
  t.align = opt.align || 'left';
  t.verticalAlign = opt.valign || 'top';
  t.fills = [solid(opt.color || '#111111', opt.o)];
  place(t, parent, x, y);
  return t;
}
function byId(id) { var f = penpot.currentPage.getShapeById ? penpot.currentPage.getShapeById(id) : null; if (!f) { var r = penpot.currentPage.root; (function walk(n){ if(!n||f) return; if(n.id===id){f=n;return;} var ch=n.children||[]; for(var i=0;i<ch.length;i++) walk(ch[i]); })(r); } if (!f) throw new Error('byId: not found ' + id); return f; }
function findBoard(name) {
  var r = penpot.currentPage.root;
  function walk(n) { if (!n) return null; if (n.name === name && n.type === 'board') return n; var ch = n.children || []; for (var i = 0; i < ch.length; i++) { var f = walk(ch[i]); if (f) return f; } return null; }
  return walk(r);
}
