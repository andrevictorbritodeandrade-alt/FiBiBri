const fs = require('fs');
let app = fs.readFileSync('App.tsx', 'utf8');

// I also need to make sure SEGUNDO CARRO ALUGADO has Viagens
app = app.replace(/desc: 'SEGUNDO CARRO ALUGADO', amount: 78.57, cat: 'Iago'/g, "desc: 'SEGUNDO CARRO ALUGADO', amount: 78.57, cat: 'Viagens'");

fs.writeFileSync('App.tsx', app, 'utf8');
