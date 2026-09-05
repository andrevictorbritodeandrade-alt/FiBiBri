const fs = require('fs');
let app = fs.readFileSync('App.tsx', 'utf8');

app = app.replace(/category: "Dívidas"/g, 'category: "Empréstimos"');
// wait, if I do this, it will replace all `category: "Dívidas"`. Are there other legitimate Dívidas?
