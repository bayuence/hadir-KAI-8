const fs = require('fs');
let code = fs.readFileSync('src/pages/FaceTest.jsx', 'utf8');

// Replace lok-container with app-shell wrap
code = code.replace(/<div className="lok-container">/g, 
  `<div className="app-shell" style={{ backgroundColor: '#f8fafc', minHeight: '100vh' }}>
      <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '20px' }}>`
);

// We need to add the closing </div> for the inner wrap we just created before every root closing div
// Since we have multiple returns, let's just do a manual replace for the specific returns.
// A safer way is to just replace lok-container with app-shell, and add padding to it directly.
code = fs.readFileSync('src/pages/FaceTest.jsx', 'utf8');
code = code.replace(/className="lok-container"/g, 'className="app-shell" style={{ backgroundColor: "#f8fafc", minHeight: "100vh", padding: "20px" }}');

// Replace lok-header with something that looks good inside app-shell
code = code.replace(/<div className="lok-header">/g, '<div style={{ display: "flex", alignItems: "center", gap: "15px", marginBottom: "20px" }}>');

// Replace lok-card with standard card styling
code = code.replace(/className="lok-card"/g, 'className="profil-card" style={{ padding: "20px" }}');

// Use btn btn-primary and btn btn-outline from main app instead of lok-btn-save/lok-btn-cancel
code = code.replace(/className="lok-btn-save"/g, 'className="btn btn-primary"');
code = code.replace(/className="lok-btn-cancel"/g, 'className="btn btn-outline"');

fs.writeFileSync('src/pages/FaceTest.jsx', code);
console.log('Fixed UI to match app-shell styling.');
