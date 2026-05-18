const fs = require('fs');
const file = '.github/workflows/ci.yml';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(/node-version: "20"/g, 'node-version: "22"');

fs.writeFileSync(file, content);
