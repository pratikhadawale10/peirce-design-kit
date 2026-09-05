/* Smallest useful call. Run it clear of existing work:

     peirce-run examples/01-hello-board.js '{"x":12000,"y":0,"fg":"#111111","bg":"#FFFFFF"}'

   then read back the id it prints, and LOOK at what you drew:

     peirce-run ping                      # the exporter lags one call behind
     peirce-export <id> /tmp/hello.png

   Colours are arguments, not literals in the source. In real work they come from
   the file's own tokens: `peirce-run tokens-pull` generates a TOK map you can
   index by name, and `bindtok` binds shapes to the real token afterwards. */
var x  = ARGS.x  || 0,         y  = ARGS.y  || 0;
var bg = ARGS.bg || '#FFFFFF', fg = ARGS.fg || '#111111';
var muted = ARGS.muted || '#6B7280', accent = ARGS.accent || '#2563EB';

var b = board(null, x, y, 360, 200, { fill: bg, r: 12, name: 'hello', clip: false });
txt(b, 24, 24, 312, 24, 'Hello from the kit', { size: 18, w: '600', color: fg, lh: 24 });
txt(b, 24, 56, 312, 20, 'Drawn through execute_code, not by hand.',
    { size: 13, w: '400', color: muted, lh: 20 });
rect(b, 24, 96, 120, 36, { fill: accent, r: 8, name: 'button' });
txt(b, 24, 106, 120, 20, 'Primary',
    { size: 13, w: '600', color: '#FFFFFF', align: 'center', lh: 20 });

/* Contrast is checkable in-file rather than guessed at. */
console.log('board=' + b.id + '  text-on-bg=' + contrast(fg, bg) +
            ':1  label-on-accent=' + contrast('#FFFFFF', accent) + ':1');
