const fs = require('fs');
let app = fs.readFileSync('App.tsx', 'utf8');

app = app.replace(/category:\s*'Dívidas',\s*paid:\s*false,\s*dueDate:\s*'2026-09-01',\s*group:\s*'MARCIA BISPO'/g, "category: 'Empréstimos',\n                    paid: false,\n                    dueDate: '2026-09-01',\n                    group: 'MARCIA BISPO'");

app = app.replace(/cat:\s*'Dívidas'\s*},\s*\{\s*match:\s*d\s*=>\s*d\.includes\('PRESENTE/g, "cat: 'Empréstimos' },\n                { match: d => d.includes('PRESENTE");
app = app.replace(/amount: 335.90, cat: 'Dívidas'/g, "amount: 335.90, cat: 'Empréstimos'");

app = app.replace(/amount: 0,\n                        category: "Dívidas"/g, "amount: 0,\n                        category: \"Empréstimos\"");

app = app.replace(/amount: 486.00, \/\/ 1944.00 \/ 4\n                        category: "Dívidas"/g, "amount: 486.00, // 1944.00 / 4\n                        category: \"Empréstimos\"");

app = app.replace(/amount: 486.00,\n                                category: "Dívidas"/g, "amount: 486.00,\n                                category: \"Empréstimos\"");

fs.writeFileSync('App.tsx', app, 'utf8');
