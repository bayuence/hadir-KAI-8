const fs = require('fs');
let code = fs.readFileSync('AppScript/Handlers.gs', 'utf8');

// Replace getDisplayValues in handleLogin
code = code.replace(/var rows = sheet\.getDataRange\(\)\.getDisplayValues\(\);([\s\S]*?)for \(var i = 1; i < rows\.length; i\+\+\) \{/m,
  "var rows = sheet.getDataRange().getValues();$1for (var i = 1; i < rows.length; i++) {");

fs.writeFileSync('AppScript/Handlers.gs', code);
console.log('done');
