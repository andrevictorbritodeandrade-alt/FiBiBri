const fs = require('fs');
let code = fs.readFileSync('components/Header.tsx', 'utf8');
code = code.replace(
    '                     </div>\n                 </div>\n            </div>\n        </header>',
    '                     </div>\n                 </div>\n                 )}\n            </div>\n        </header>'
);
fs.writeFileSync('components/Header.tsx', code);
