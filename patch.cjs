const fs = require('fs');
let code = fs.readFileSync('components/Header.tsx', 'utf8');
code = code.replace(
    /                 <\/div>\r?\n\r?\n            <\/div>\r?\n        <\/header>/,
    '                 </div>\n                 )}\n            </div>\n        </header>'
);
fs.writeFileSync('components/Header.tsx', code);
