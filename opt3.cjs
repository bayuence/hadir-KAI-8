const fs = require('fs');
let code = fs.readFileSync('src/pages/Presensi.jsx', 'utf8');

const oldCode = `        if (data.success) {
           if (type === 'masuk') {
             sendNotification('HADIR KAI 8', {
               body: 'Terima kasih sudah melakukan presensi masuk hari ini. Selamat beraktivitas!',
               tag: 'kai-success-masuk'
             })
           } else {
             sendNotification('HADIR KAI 8', {
               body: 'Terima kasih sudah melakukan presensi pulang hari ini. Hati-hati di jalan!',
               tag: 'kai-success-pulang'
             })
           }
           navigate('/dashboard', { replace: true })
        } else {`;

const newCode = `        if (data.success) {
           if (type === 'masuk') {
             try {
                const today = new Date().toISOString().slice(0, 10);
                const cacheStr = localStorage.getItem(\`kai_status_\${user.id}\`);
                let status = cacheStr ? JSON.parse(cacheStr).data : { sudahMasuk: false, sudahPulang: false };
                status.sudahMasuk = true;
                status.jamMasuk = data.jamMasuk || new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
                localStorage.setItem(\`kai_status_\${user.id}\`, JSON.stringify({ date: today, data: status }));
             } catch(e) {}
             
             sendNotification('HADIR KAI 8', {
               body: 'Terima kasih sudah melakukan presensi masuk hari ini. Selamat beraktivitas!',
               tag: 'kai-success-masuk'
             })
           } else {
             try {
                const today = new Date().toISOString().slice(0, 10);
                const cacheStr = localStorage.getItem(\`kai_status_\${user.id}\`);
                let status = cacheStr ? JSON.parse(cacheStr).data : { sudahMasuk: true, sudahPulang: false };
                status.sudahPulang = true;
                status.jamPulang = data.jamPulang || new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
                localStorage.setItem(\`kai_status_\${user.id}\`, JSON.stringify({ date: today, data: status }));
             } catch(e) {}

             sendNotification('HADIR KAI 8', {
               body: 'Terima kasih sudah melakukan presensi pulang hari ini. Hati-hati di jalan!',
               tag: 'kai-success-pulang'
             })
           }
           navigate('/dashboard', { replace: true })
        } else {`;

code = code.replace(oldCode, newCode);
fs.writeFileSync('src/pages/Presensi.jsx', code);
console.log('done');
