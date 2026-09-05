/* Read before you write. This reports what is on the page and what is unbound,
   which is how you decide what to fix rather than guessing.

     peirce-run examples/02-audit.js
*/
var ch = penpot.currentPage.root.children || [], kinds = {};
for (var i = 0; i < ch.length; i++) kinds[ch[i].type] = (kinds[ch[i].type] || 0) + 1;
var n = 0;
(function walk(x) { var c = x.children || []; for (var i = 0; i < c.length; i++) { n++; walk(c[i]); } })(penpot.currentPage.root);
console.log('page=' + penpot.currentPage.name + ' top-level=' + JSON.stringify(kinds) + ' shapes=' + n);
