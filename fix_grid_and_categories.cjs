const fs = require('fs');
let app = fs.readFileSync('App.tsx', 'utf8');

// Change layout to 3 columns
app = app.replace(/<div className="grid grid-cols-1 gap-4">/g, '<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">');

// Add colors/icons for new categories
app = app.replace(/if \(c === 'Alimentação'\) return \{ bg: 'bg-orange-50', text: 'text-orange-600', bar: 'bg-orange-500', icon: ShoppingBag \};/g, 
"if (c === 'Alimentação') return { bg: 'bg-orange-50', text: 'text-orange-600', bar: 'bg-orange-500', icon: ShoppingBag };\n                                                        if (c === 'Estadias') return { bg: 'bg-cyan-50', text: 'text-cyan-600', bar: 'bg-cyan-500', icon: HomeIcon };\n                                                        if (c === 'Viagens') return { bg: 'bg-sky-50', text: 'text-sky-600', bar: 'bg-sky-500', icon: Plane };");

// Fix specific AIRBNB categories in App.tsx to "Estadias"
app = app.replace(/cat: 'Iago'/g, "cat: 'Iago'"); // not targeted enough
// Let's replace specifically the AIRBNB items
app = app.replace(/desc: 'AIRBNB \(HMT3Q9TBYB\)', amount: 190.74, cat: 'Iago'/g, "desc: 'AIRBNB (HMT3Q9TBYB)', amount: 190.74, cat: 'Estadias'");
app = app.replace(/desc: 'AIRBNB \(hm2ydd2j9t\)', amount: 52.17, cat: 'Iago'/g, "desc: 'AIRBNB (hm2ydd2j9t)', amount: 52.17, cat: 'Estadias'");
app = app.replace(/desc: 'AIRBNB \(hmepqps338\)', amount: 63.33, cat: 'Iago'/g, "desc: 'AIRBNB (hmepqps338)', amount: 63.33, cat: 'Estadias'");
app = app.replace(/desc: 'AIRBNB \(hm5kaqjy4j\)', amount: 27.17, cat: 'Iago'/g, "desc: 'AIRBNB (hm5kaqjy4j)', amount: 27.17, cat: 'Estadias'");
app = app.replace(/desc: 'AIRBNB \(hmjhtc29yf\)', amount: 69.64, cat: 'Iago'/g, "desc: 'AIRBNB (hmjhtc29yf)', amount: 69.64, cat: 'Estadias'");
app = app.replace(/desc: 'JUL AIRBNB', amount: 190.75, cat: 'Lazer'/g, "desc: 'JUL AIRBNB', amount: 190.75, cat: 'Estadias'");

// Fix PASSAGENS PARA SALVADOR to Viagens
app = app.replace(/desc: 'PASSAGENS PARA SALVADOR', amount: 216.94, cat: 'Iago'/g, "desc: 'PASSAGENS PARA SALVADOR', amount: 216.94, cat: 'Viagens'");
// Fix SEGUNDO CARRO ALUGADO / PRIMEIRO CARRO ALUGADO
app = app.replace(/desc: 'PRIMEIRO CARRO ALUGADO', amount: 63.17, cat: 'Iago'/g, "desc: 'PRIMEIRO CARRO ALUGADO', amount: 63.17, cat: 'Viagens'");

fs.writeFileSync('App.tsx', app, 'utf8');

// Now utils/financeUtils.ts
let utils = fs.readFileSync('utils/financeUtils.ts', 'utf8');

utils = utils.replace(/desc: "AIRBNB \(HMT3Q9TBYB\)", totalAmount: 1144.44, cat: "Iago"/g, "desc: \"AIRBNB (HMT3Q9TBYB)\", totalAmount: 1144.44, cat: \"Estadias\"");
utils = utils.replace(/desc: "AIRBNB \(hm2ydd2j9t\)", totalAmount: 313.02, cat: "Iago"/g, "desc: \"AIRBNB (hm2ydd2j9t)\", totalAmount: 313.02, cat: \"Estadias\"");
utils = utils.replace(/desc: "AIRBNB \(hmepqps338\)", totalAmount: 379.98, cat: "Iago"/g, "desc: \"AIRBNB (hmepqps338)\", totalAmount: 379.98, cat: \"Estadias\"");
utils = utils.replace(/desc: "AIRBNB \(hm5kaqjy4j\)", totalAmount: 163.02, cat: "Iago"/g, "desc: \"AIRBNB (hm5kaqjy4j)\", totalAmount: 163.02, cat: \"Estadias\"");
utils = utils.replace(/desc: "AIRBNB \(hmjhtc29yf\)", totalAmount: 417.84, cat: "Iago"/g, "desc: \"AIRBNB (hmjhtc29yf)\", totalAmount: 417.84, cat: \"Estadias\"");

utils = utils.replace(/desc: "PASSAGENS PARA SALVADOR", totalAmount: 1301.64, cat: "Iago"/g, "desc: \"PASSAGENS PARA SALVADOR\", totalAmount: 1301.64, cat: \"Viagens\"");

// Others that might make sense for Estadias/Viagens
utils = utils.replace(/desc: "ESTADIA DE IDA EM SAO PAULO", totalAmount: 289.44, cat: "Lazer"/g, "desc: \"ESTADIA DE IDA EM SAO PAULO\", totalAmount: 289.44, cat: \"Estadias\"");
utils = utils.replace(/desc: "ESTADIA DE VOLTA EM SP", totalAmount: 319.46, cat: "Lazer"/g, "desc: \"ESTADIA DE VOLTA EM SP\", totalAmount: 319.46, cat: \"Estadias\"");
utils = utils.replace(/desc: "PRIMEIRA ESTADIA EM SALVADOR", totalAmount: 2470.80, cat: "Lazer"/g, "desc: \"PRIMEIRA ESTADIA EM SALVADOR\", totalAmount: 2470.80, cat: \"Estadias\"");
utils = utils.replace(/desc: "SEGUNDA ESTADIA EM SALVADOR", totalAmount: 647.28, cat: "Lazer"/g, "desc: \"SEGUNDA ESTADIA EM SALVADOR\", totalAmount: 647.28, cat: \"Estadias\"");

utils = utils.replace(/desc: "PASSAGENS AÉREAS JOBURG X CAPE TOWN", totalAmount: 1560.00, cat: "Lazer"/g, "desc: \"PASSAGENS AÉREAS JOBURG X CAPE TOWN\", totalAmount: 1560.00, cat: \"Viagens\"");
utils = utils.replace(/desc: "PASSAGENS AÉREAS SP X JOBURG", totalAmount: 4038.96, cat: "Lazer"/g, "desc: \"PASSAGENS AÉREAS SP X JOBURG\", totalAmount: 4038.96, cat: \"Viagens\"");
utils = utils.replace(/desc: "PASSAGENS DE ONIBUS RIO x SP", totalAmount: 438.00, cat: "Transporte"/g, "desc: \"PASSAGENS DE ONIBUS RIO x SP\", totalAmount: 438.00, cat: \"Viagens\"");

fs.writeFileSync('utils/financeUtils.ts', utils, 'utf8');

