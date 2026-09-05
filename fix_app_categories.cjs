const fs = require('fs');
let app = fs.readFileSync('App.tsx', 'utf8');

app = app.replace(/description:\s*'EMPRÉSTIMO PARA PAGAR AS CONTAS DE JUNHO',\s*amount:\s*486\.00,\s*category:\s*'Dívidas'/g, 
"description: 'EMPRÉSTIMO PARA PAGAR AS CONTAS DE JUNHO',\n                    amount: 486.00,\n                    category: 'Empréstimos'");
                    
app = app.replace(/description:\s*"EMPRÉSTIMO PARA PAGAR AS CONTAS DE JUNHO",\s*amount:\s*486\.00,\s*category:\s*"Dívidas"/g, 
"description: \"EMPRÉSTIMO PARA PAGAR AS CONTAS DE JUNHO\",\n                        amount: 486.00,\n                        category: \"Empréstimos\"");

app = app.replace(/description:\s*'EMPRÉSTIMO PARA VIAGEM DE SALVADOR',\s*amount:\s*395\.26,\s*category:\s*'Jady'/g,
"description: 'EMPRÉSTIMO PARA VIAGEM DE SALVADOR',\n                    amount: 395.26,\n                    category: 'Empréstimos'");
                    
app = app.replace(/description:\s*'EMPRÉSTIMO PARA PAGAR AS CONTAS DE SETEMBRO',\s*amount:\s*300\.00,\s*category:\s*'Claudio Silva'/g,
"description: 'EMPRÉSTIMO PARA PAGAR AS CONTAS DE SETEMBRO',\n                    amount: 300.00,\n                    category: 'Empréstimos'");
                    
app = app.replace(/description:\s*'EMPRÉSTIMO COM LILI',\s*amount:\s*800\.00,\s*category:\s*'Dívidas'/g,
"description: 'EMPRÉSTIMO COM LILI',\n                    amount: 800.00,\n                    category: 'Empréstimos'");
                    
app = app.replace(/description:\s*'EMPRÉSTIMO DE JULHO \(MARCIA BISPO\)',\s*amount:\s*400\.00,\s*category:\s*'Dívidas'/g,
"description: 'EMPRÉSTIMO DE JULHO (MARCIA BISPO)',\n                    amount: 400.00,\n                    category: 'Empréstimos'");
                    
fs.writeFileSync('App.tsx', app, 'utf8');
