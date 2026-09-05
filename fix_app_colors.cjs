const fs = require('fs');
let app = fs.readFileSync('App.tsx', 'utf8');

app = app.replace(/CreditCard, Shirt } from 'lucide-react';/g, "CreditCard, Shirt, Landmark } from 'lucide-react';");

app = app.replace(/if \(cn\.includes\('DÍVIDAS'\) \|\| cn\.includes\('DIVIDAS'\)\) return \{ bg: 'bg-rose-50', text: 'text-rose-600', bar: 'bg-rose-500', icon: ShoppingCart \};/g, "if (cn.includes('DÍVIDAS') || cn.includes('DIVIDAS') || cn.includes('EMPRÉSTIMOS') || cn.includes('EMPRESTIMOS')) return { bg: 'bg-rose-50', text: 'text-rose-600', bar: 'bg-rose-500', icon: Landmark };");

fs.writeFileSync('App.tsx', app, 'utf8');
