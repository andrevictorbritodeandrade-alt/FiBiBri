const fs = require('fs');
let app = fs.readFileSync('App.tsx', 'utf8');
app = app.replace(/<div className="grid grid-cols-1 gap-4">\s*\{\(\(\) => \{/g, '<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">\n                                            {(() => {');
fs.writeFileSync('App.tsx', app, 'utf8');
