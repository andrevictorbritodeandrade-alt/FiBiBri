const fs = require('fs');

let content = fs.readFileSync('utils/financeUtils.ts', 'utf8');

content = content.replace(/cat: "Dívidas", day: 4, installments: 5, sY: 2026, sM: 7, group: 'LILI TORRES''/g, `cat: "Dívidas", day: 4, installments: 5, sY: 2026, sM: 7, group: 'LILI TORRES'`);

// Revert that specific line first if it was messed up
content = content.replace(/cat: "Empréstimos", day: 4, installments: 5, sY: 2026, sM: 7, group: 'LILI TORRES''/g, `cat: "Empréstimos", day: 4, installments: 5, sY: 2026, sM: 7, group: 'LILI TORRES'`);

// Now apply proper changes to financeUtils.ts
content = content.replace(/desc: "EMPRÉSTIMO COM LILI", totalAmount: 4000.00, cat: "([^"]+)"/g, `desc: "EMPRÉSTIMO COM LILI", totalAmount: 4000.00, cat: "Empréstimos"`);
content = content.replace(/desc: "EMPRÉSTIMO COM MARCIA BISPO", totalAmount: 400.00, cat: "([^"]+)"/g, `desc: "EMPRÉSTIMO COM MARCIA BISPO", totalAmount: 400.00, cat: "Empréstimos"`);
content = content.replace(/desc: "EMPRÉSTIMO PARA PAGAR AS CONTAS DE ABRIL \(MARCIA BISPO\)", totalAmount: 1000.00, cat: "([^"]+)"/g, `desc: "EMPRÉSTIMO PARA PAGAR AS CONTAS DE ABRIL (MARCIA BISPO)", totalAmount: 1000.00, cat: "Empréstimos"`);
content = content.replace(/desc: "EMPRÉSTIMO PARA PAGAR AS CONTAS DE JUNHO", totalAmount: 1944.00, cat: "([^"]+)"/g, `desc: "EMPRÉSTIMO PARA PAGAR AS CONTAS DE JUNHO", totalAmount: 1944.00, cat: "Empréstimos"`);
content = content.replace(/desc: "EMPRÉSTIMO PARA PAGAR AS CONTAS DE SETEMBRO", totalAmount: 1500.00, cat: "([^"]+)"/g, `desc: "EMPRÉSTIMO PARA PAGAR AS CONTAS DE SETEMBRO", totalAmount: 1500.00, cat: "Empréstimos"`);
content = content.replace(/desc: "EMPRÉSTIMO PARA VIAGEM DE SALVADOR", totalAmount: 1185.78, cat: "([^"]+)"/g, `desc: "EMPRÉSTIMO PARA VIAGEM DE SALVADOR", totalAmount: 1185.78, cat: "Empréstimos"`);
content = content.replace(/desc: "EMPRÉSTIMO PARA VIAJAR", totalAmount: 2499.96, cat: "([^"]+)"/g, `desc: "EMPRÉSTIMO PARA VIAJAR", totalAmount: 2499.96, cat: "Empréstimos"`);
content = content.replace(/desc: "EMPRÉSTIMO VIAGEM NORDESTE \(LILI\)", totalAmount: 2015.40, cat: "([^"]+)"/g, `desc: "EMPRÉSTIMO VIAGEM NORDESTE (LILI)", totalAmount: 2015.40, cat: "Empréstimos"`);
fs.writeFileSync('utils/financeUtils.ts', content, 'utf8');

let appContent = fs.readFileSync('App.tsx', 'utf8');

// Also update App.tsx hardcoded loans
appContent = appContent.replace(/cat: 'Dívidas'/g, function(match, offset, str) {
    return match; // will do targeted
});

fs.writeFileSync('App.tsx', appContent, 'utf8');
