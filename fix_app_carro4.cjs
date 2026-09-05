const fs = require('fs');
let app = fs.readFileSync('App.tsx', 'utf8');

// I also need to make sure SEGUNDO CARRO ALUGADO has Viagens in the overrides
app = app.replace(/desc: 'SEGUNDO CARRO ALUGADO', amount: 78.57, cat: 'Iago'/g, "desc: 'SEGUNDO CARRO ALUGADO', amount: 78.57, cat: 'Viagens'");

app = app.replace(/desc: 'PRIMEIRO CARRO ALUGADO', amount: 63.17, cat: 'Iago'/g, "desc: 'PRIMEIRO CARRO ALUGADO', amount: 63.17, cat: 'Viagens'");
app = app.replace(/desc: 'PASSAGENS PARA SALVADOR', amount: 216.94, cat: 'Iago'/g, "desc: 'PASSAGENS PARA SALVADOR', amount: 216.94, cat: 'Viagens'");


app = app.replace(/desc: 'AIRBNB \(HMT3Q9TBYB\)', amount: 190.74, cat: 'Iago'/g, "desc: 'AIRBNB (HMT3Q9TBYB)', amount: 190.74, cat: 'Estadias'");
app = app.replace(/desc: 'AIRBNB \(hm2ydd2j9t\)', amount: 52.17, cat: 'Iago'/g, "desc: 'AIRBNB (hm2ydd2j9t)', amount: 52.17, cat: 'Estadias'");
app = app.replace(/desc: 'AIRBNB \(hmepqps338\)', amount: 63.33, cat: 'Iago'/g, "desc: 'AIRBNB (hmepqps338)', amount: 63.33, cat: 'Estadias'");
app = app.replace(/desc: 'AIRBNB \(hm5kaqjy4j\)', amount: 27.17, cat: 'Iago'/g, "desc: 'AIRBNB (hm5kaqjy4j)', amount: 27.17, cat: 'Estadias'");
app = app.replace(/desc: 'AIRBNB \(hmjhtc29yf\)', amount: 69.64, cat: 'Iago'/g, "desc: 'AIRBNB (hmjhtc29yf)', amount: 69.64, cat: 'Estadias'");

fs.writeFileSync('App.tsx', app, 'utf8');
