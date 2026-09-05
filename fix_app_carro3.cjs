const fs = require('fs');
let app = fs.readFileSync('App.tsx', 'utf8');

// replace addOrUpdateIagoExpense
app = app.replace(/addOrUpdateIagoExpense\("PRIMEIRO CARRO ALUGADO", 63.17, "primeiro_carro_alugado", \{ current: 2, total: 6 \}, "Iago", "PRIMEIRO CARRO ALUGADO"\);/g, 
"addOrUpdateIagoExpense(\"PRIMEIRO CARRO ALUGADO\", 63.17, \"primeiro_carro_alugado\", { current: 2, total: 6 }, \"Viagens\", \"PRIMEIRO CARRO ALUGADO\");");
app = app.replace(/addOrUpdateIagoExpense\("PRIMEIRO CARRO ALUGADO", 63.17, "primeiro_carro_alugado", \{ current: targetInst10, total: 6 \}, "Iago", "PRIMEIRO CARRO ALUGADO"\);/g, 
"addOrUpdateIagoExpense(\"PRIMEIRO CARRO ALUGADO\", 63.17, \"primeiro_carro_alugado\", { current: targetInst10, total: 6 }, \"Viagens\", \"PRIMEIRO CARRO ALUGADO\");");


app = app.replace(/addOrUpdateIagoExpense\("SEGUNDO CARRO ALUGADO", 78.57, "segundo_carro_alugado", \{ current: 2, total: 6 \}, "Iago", "SEGUNDO CARRO ALUGADO"\);/g, 
"addOrUpdateIagoExpense(\"SEGUNDO CARRO ALUGADO\", 78.57, \"segundo_carro_alugado\", { current: 2, total: 6 }, \"Viagens\", \"SEGUNDO CARRO ALUGADO\");");
app = app.replace(/addOrUpdateIagoExpense\("SEGUNDO CARRO ALUGADO", 78.57, "segundo_carro_alugado", \{ current: targetInst11, total: 6 \}, "Iago", "SEGUNDO CARRO ALUGADO"\);/g, 
"addOrUpdateIagoExpense(\"SEGUNDO CARRO ALUGADO\", 78.57, \"segundo_carro_alugado\", { current: targetInst11, total: 6 }, \"Viagens\", \"SEGUNDO CARRO ALUGADO\");");


app = app.replace(/addOrUpdateIagoExpense\("PASSAGENS PARA SALVADOR", 216.94, "passagens_salvador", \{ current: 1, total: 6 \}, "Iago", "PASSAGENS PARA SALVADOR"\);/g, 
"addOrUpdateIagoExpense(\"PASSAGENS PARA SALVADOR\", 216.94, \"passagens_salvador\", { current: 1, total: 6 }, \"Viagens\", \"PASSAGENS PARA SALVADOR\");");
app = app.replace(/addOrUpdateIagoExpense\("PASSAGENS PARA SALVADOR", 216.94, "passagens_salvador", \{ current: targetInst9, total: 6 \}, "Iago", "PASSAGENS PARA SALVADOR"\);/g, 
"addOrUpdateIagoExpense(\"PASSAGENS PARA SALVADOR\", 216.94, \"passagens_salvador\", { current: targetInst9, total: 6 }, \"Viagens\", \"PASSAGENS PARA SALVADOR\");");


// Airbnb updates
const hmt = 'addOrUpdateIagoExpense("AIRBNB (HMT3Q9TBYB)", 190.74, "airbnb_hmt3q9tbyb"';
const hm2 = 'addOrUpdateIagoExpense("AIRBNB (hm2ydd2j9t)", 52.17, "airbnb_hm2ydd2j9t"';
const hmep = 'addOrUpdateIagoExpense("AIRBNB (hmepqps338)", 63.33, "airbnb_hmepqps338"';
const hm5 = 'addOrUpdateIagoExpense("AIRBNB (hm5kaqjy4j)", 27.17, "airbnb_hm5kaqjy4j"';
const hmj = 'addOrUpdateIagoExpense("AIRBNB (hmjhtc29yf)", 69.64, "airbnb_hmjhtc29yf"';

app = app.replace(new RegExp(hmt.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ', \\{ current: 2, total: 6 \\}, "Iago", "HMT3Q9TBYB"\\);', 'g'), hmt + ', { current: 2, total: 6 }, "Estadias", "HMT3Q9TBYB");');
app = app.replace(new RegExp(hmt.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ', \\{ current: targetInst8, total: 6 \\}, "Iago", "HMT3Q9TBYB"\\);', 'g'), hmt + ', { current: targetInst8, total: 6 }, "Estadias", "HMT3Q9TBYB");');

app = app.replace(new RegExp(hm2.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ', \\{ current: 2, total: 6 \\}, "Iago", "HM2YDD2J9T"\\);', 'g'), hm2 + ', { current: 2, total: 6 }, "Estadias", "HM2YDD2J9T");');
app = app.replace(new RegExp(hm2.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ', \\{ current: targetInst8, total: 6 \\}, "Iago", "HM2YDD2J9T"\\);', 'g'), hm2 + ', { current: targetInst8, total: 6 }, "Estadias", "HM2YDD2J9T");');

app = app.replace(new RegExp(hmep.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ', \\{ current: 2, total: 6 \\}, "Iago", "HMEPQPS338"\\);', 'g'), hmep + ', { current: 2, total: 6 }, "Estadias", "HMEPQPS338");');
app = app.replace(new RegExp(hmep.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ', \\{ current: targetInst8, total: 6 \\}, "Iago", "HMEPQPS338"\\);', 'g'), hmep + ', { current: targetInst8, total: 6 }, "Estadias", "HMEPQPS338");');

app = app.replace(new RegExp(hm5.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ', \\{ current: 2, total: 6 \\}, "Iago", "HM5KAQJY4J"\\);', 'g'), hm5 + ', { current: 2, total: 6 }, "Estadias", "HM5KAQJY4J");');
app = app.replace(new RegExp(hm5.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ', \\{ current: targetInst8, total: 6 \\}, "Iago", "HM5KAQJY4J"\\);', 'g'), hm5 + ', { current: targetInst8, total: 6 }, "Estadias", "HM5KAQJY4J");');

app = app.replace(new RegExp(hmj.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ', \\{ current: 2, total: 6 \\}, "Iago", "HMJHTC29YF"\\);', 'g'), hmj + ', { current: 2, total: 6 }, "Estadias", "HMJHTC29YF");');
app = app.replace(new RegExp(hmj.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ', \\{ current: targetInst8, total: 6 \\}, "Iago", "HMJHTC29YF"\\);', 'g'), hmj + ', { current: targetInst8, total: 6 }, "Estadias", "HMJHTC29YF");');

app = app.replace(/addOrUpdateIagoExpense\("JUL AIRBNB", 190.75, "airbnb", null, "Lazer", "JUL AIRBNB"\);/g, 'addOrUpdateIagoExpense("JUL AIRBNB", 190.75, "airbnb", null, "Estadias", "JUL AIRBNB");');

fs.writeFileSync('App.tsx', app, 'utf8');

