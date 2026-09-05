const fs = require('fs');
let utils = fs.readFileSync('utils/financeUtils.ts', 'utf8');

utils = utils.replace(/desc: "PRIMEIRO CARRO ALUGADO", totalAmount: 379.02, cat: "Iago"/g, "desc: \"PRIMEIRO CARRO ALUGADO\", totalAmount: 379.02, cat: \"Viagens\"");
utils = utils.replace(/desc: "SEGUNDO CARRO ALUGADO", totalAmount: 471.42, cat: "Iago"/g, "desc: \"SEGUNDO CARRO ALUGADO\", totalAmount: 471.42, cat: \"Viagens\"");

fs.writeFileSync('utils/financeUtils.ts', utils, 'utf8');
