const fs = require('fs');
let constants = fs.readFileSync('constants.ts', 'utf8');

constants = constants.replace(/'Lazer': '🎉',/g, "'Lazer': '🎉',\n    'Estadias': '🏨',\n    'Viagens': '✈️',");
fs.writeFileSync('constants.ts', constants, 'utf8');
