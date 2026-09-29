const fs = require('fs');
let code = fs.readFileSync('src/pages/FaceTest.jsx', 'utf8');

// Fix border template literal
code = code.replace(/border: \\`1px solid \\\$\{result\.match \? '#bbf7d0' : '#fecaca'\\\}\\`/g, "border: result.match ? '1px solid #bbf7d0' : '1px solid #fecaca'");

// Fix width template literal
code = code.replace(/width: \\`\\\$\{result\.confidence\}%\\`/g, "width: result.confidence + '%'");

fs.writeFileSync('src/pages/FaceTest.jsx', code);
console.log('Fixed syntax errors in FaceTest.jsx');
