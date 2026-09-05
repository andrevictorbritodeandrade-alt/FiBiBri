const fs = require('fs');
let app = fs.readFileSync('App.tsx', 'utf8');

// The lines like: { match: ..., cat: 'Dívidas' }
app = app.replace(/desc: 'EMPRÉSTIMO PARA PAGAR AS CONTAS DE JUNHO', current: 3, total: 4, amount: 486.00, cat: 'Dívidas' /g, `desc: 'EMPRÉSTIMO PARA PAGAR AS CONTAS DE JUNHO', current: 3, total: 4, amount: 486.00, cat: 'Empréstimos' `);
app = app.replace(/desc: 'EMPRÉSTIMO COM LILI', current: 3, total: 5, amount: 800.00, cat: 'Dívidas' /g, `desc: 'EMPRÉSTIMO COM LILI', current: 3, total: 5, amount: 800.00, cat: 'Empréstimos' `);
app = app.replace(/desc: 'EMPRÉSTIMO VIAGEM NORDESTE \\(LILI\\)', current: 2, total: 6, amount: 335.90, cat: 'Dívidas' /g, `desc: 'EMPRÉSTIMO VIAGEM NORDESTE (LILI)', current: 2, total: 6, amount: 335.90, cat: 'Empréstimos' `);
app = app.replace(/desc: 'EMPRÉSTIMO PARA VIAJAR', amount: 416.66, cat: 'Iago'/g, `desc: 'EMPRÉSTIMO PARA VIAJAR', amount: 416.66, cat: 'Empréstimos'`);

// What about category: 'Dívidas' etc.?
app = app.replace(/category: "Dívidas"/g, 'category: "Dívidas"'); // no wait
// Need to find instances of category: '...' for EMPRÉSTIMO
fs.writeFileSync('App.tsx', app, 'utf8');
