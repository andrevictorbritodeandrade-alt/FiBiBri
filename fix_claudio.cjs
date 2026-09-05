const fs = require('fs');
let app = fs.readFileSync('App.tsx', 'utf8');

app = app.replace(/claudioLoan.category = 'Claudio Silva';/g, "claudioLoan.category = 'Empréstimos';");

app = app.replace(/jadyLoan.category = 'Jady';/g, "jadyLoan.category = 'Empréstimos';");

fs.writeFileSync('App.tsx', app, 'utf8');
