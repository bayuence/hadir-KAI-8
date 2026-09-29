const fs = require('fs');
let code = fs.readFileSync('AppScript/EmailPengingat.gs', 'utf8');

const regex = /var dayOfWeek = new Date\(\)\.getDay\(\);\s*if \(dayOfWeek === 0 \|\| dayOfWeek === 6\) return; \/\/ Skip weekend/g;
const replacement = `var dayName = Utilities.formatDate(new Date(), 'Asia/Jakarta', 'EEEE');
  if (dayName === 'Saturday' || dayName === 'Sunday') return; // Skip weekend (Timezone Safe)`;

code = code.replace(regex, replacement);
fs.writeFileSync('AppScript/EmailPengingat.gs', code);
console.log('done');
