/* Print every page, and every top-level board on the current page, with its id.
   Address boards by id, never by name: Penpot rewrites "/" in a name to " / ",
   so a name lookup silently misses and your shapes land on the page root. */
var out = [], pages = penpot.currentFile.pages;
for (var i = 0; i < pages.length; i++) {
  var pg = pages[i];
  out.push((pg.id === penpot.currentPage.id ? '* ' : '  ') + (pg.id || '?') + '  ' + pg.name);
}
out.push('--- boards on ' + penpot.currentPage.name + ' ---');
var ch = penpot.currentPage.root.children || [];
for (var j = 0; j < ch.length; j++) {
  if (ch[j].type === 'board') out.push('  ' + ch[j].id + '  ' + ch[j].name);
}
console.log(out.join('\n'));
