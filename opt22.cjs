const fs = require('fs');
let code = fs.readFileSync('src/pages/FaceTest.jsx', 'utf8');

// Add import
code = code.replace(/import \{ useAuth \} from '\.\.\/context\/AuthContext'/, "import { useAuth } from '../context/AuthContext'\nimport { driveAvatarUrl } from '../utils/driveImage'");

// Change getDescriptorFromUrl(user.foto) to getDescriptorFromUrl(driveAvatarUrl(user.foto))
code = code.replace(/const desc = await getDescriptorFromUrl\(user\.foto\)/, 'const finalUrl = driveAvatarUrl(user.foto);\n        const desc = await getDescriptorFromUrl(finalUrl)');

// Change <img src={user?.foto || ...} to use driveAvatarUrl
code = code.replace(/<img \s*src=\{user\?\.foto \|\| 'https:\/\/via\.placeholder\.com\/100'\}/, "<img \n              src={user?.foto ? driveAvatarUrl(user.foto) : 'https://via.placeholder.com/100'}");

fs.writeFileSync('src/pages/FaceTest.jsx', code);
console.log('Fixed Google Drive URL extraction issue');
