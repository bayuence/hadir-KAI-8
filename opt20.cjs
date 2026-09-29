const fs = require('fs');
let code = fs.readFileSync('src/pages/FaceTest.jsx', 'utf8');

// Replace all occurrences of literal backslash followed by a backtick
code = code.replace(/\\`/g, "`");
// Replace all occurrences of literal backslash followed by a dollar sign
code = code.replace(/\\\$/g, "$");

fs.writeFileSync('src/pages/FaceTest.jsx', code);
console.log('Cleaned up literal backslashes from template literals');
