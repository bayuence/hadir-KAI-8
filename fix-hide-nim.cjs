const fs = require('fs');

// 1. Update Handlers.gs to NOT send nim to frontend
let handlers = fs.readFileSync('AppScript/Handlers.gs', 'utf8');
handlers = handlers.replace(/nim:\s*rows\[i\]\[5\] \|\| '',\r?\n/, "");
fs.writeFileSync('AppScript/Handlers.gs', handlers);

// 2. Update Login.jsx to remove nim from dropdown and search
let login = fs.readFileSync('src/pages/Login.jsx', 'utf8');

// revert search filter
login = login.replace(/ \|\|\s*\(p\.nim && String\(p\.nim\)\.toLowerCase\(\)\.includes\(namaCari\.toLowerCase\(\)\.trim\(\)\)\)/, "");
login = login.replace(/ \|\|\s*\(p\.nim && String\(p\.nim\)\.toLowerCase\(\)\.trim\(\) === namaCari\.trim\(\)\.toLowerCase\(\)\)/, "");

// revert placeholder & label
login = login.replace(/<label className=\"input-label\">Nama \/ NIM Kamu<\/label>/, "<label className=\"input-label\">Nama Kamu</label>");
login = login.replace(/'Cari nama atau ketik NIM\.\.\.'/g, "'Cari atau ketik namamu...'");

// revert dropdown item display
login = login.replace(/<div style=\{\{ display: 'flex', flexDirection: 'column' \}\}>\s*<span>\{p\.nama\}<\/span>\s*\{p\.nim && <span style=\{\{ fontSize: '11px', color: '#6b7280' \}\}>NIM: \{p\.nim\}<\/span>\}\s*<\/div>/g, "<span>{p.nama}</span>");

// hide NIM input characters (like a password)
login = login.replace(/type=\"text\"\s*placeholder=\"Masukkan NIM kamu\.\.\.\"/, "type=\"password\"\n              placeholder=\"Masukkan NIM kamu...\"");

fs.writeFileSync('src/pages/Login.jsx', login);
console.log('done');
