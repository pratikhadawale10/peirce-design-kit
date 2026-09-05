var ch = penpot.currentPage.root.children || [];
var names = [];
for (var i = 0; i < ch.length; i++) names.push(ch[i].type + ':' + ch[i].name);
console.log(names.join(' | '));
