const fs = require('fs');
let code = fs.readFileSync('src/pages/FaceTest.jsx', 'utf8');

// 1. Add getDescriptorFromUrl
code = code.replace(
  /const \{ modelReady, loadingModel, modelError, loadModels, serializeDescriptor, deserializeDescriptor \} = useFaceRecognition\(\)/,
  'const { modelReady, loadingModel, modelError, loadModels, serializeDescriptor, deserializeDescriptor, getDescriptorFromUrl } = useFaceRecognition()'
);

// 2. Add state
code = code.replace(
  /const \[errorMsg, setErrorMsg\] = useState\(''\)/,
  `const [errorMsg, setErrorMsg] = useState('')
  const [extractingProfile, setExtractingProfile] = useState(false)`
);

// 3. Add handleUseProfilePhoto
const handleUseProfilePhotoStr = `
  const handleUseProfilePhoto = async () => {
    if (!user?.foto) {
      alert('Foto profil tidak tersedia.');
      return;
    }
    setExtractingProfile(true);
    const desc = await getDescriptorFromUrl(user.foto);
    setExtractingProfile(false);
    
    if (desc) {
      const serialized = serializeDescriptor(desc);
      localStorage.setItem('kai_face_descriptor', serialized);
      localStorage.setItem('kai_face_photo', user.foto);
      setSavedDescriptor(desc);
      setSavedPhoto(user.foto);
      alert('Berhasil! Wajah dari foto profil berhasil diekstrak dan didaftarkan.');
    } else {
      alert('Gagal! Wajah tidak terdeteksi dengan jelas pada foto profil. Silakan gunakan kamera untuk mendaftar wajah secara langsung.');
    }
  }
`;
code = code.replace(/\/\/ ⏳ UI Loading Model/, handleUseProfilePhotoStr + '\n  // ⏳ UI Loading Model');

// 4. Add the button in UI
const buttonHtml = `
          {user?.foto && !savedDescriptor && (
            <button className="btn btn-outline" onClick={handleUseProfilePhoto} disabled={extractingProfile} style={{ borderColor: '#3b82f6', color: '#3b82f6', marginTop: '10px' }}>
              {extractingProfile ? '⏳ Mengekstrak...' : '🖼️ Gunakan Foto Profil'}
            </button>
          )}
`;
code = code.replace(
  /<button className="btn btn-primary" onClick=\{\(\) => setStep\('register'\)\} style=\{\{ backgroundColor: savedDescriptor \? '#64748b' : '#3b82f6' \}\}>/,
  buttonHtml + '\n          <button className="btn btn-primary" onClick={() => setStep(\'register\')} style={{ backgroundColor: savedDescriptor ? \'#64748b\' : \'#3b82f6\' }}>'
);

fs.writeFileSync('src/pages/FaceTest.jsx', code);
console.log('Added profile photo extraction feature!');
