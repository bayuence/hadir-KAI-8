const fs = require('fs');
let code = fs.readFileSync('src/hooks/useFaceRecognition.js', 'utf8');

const proxyLogic = `  const getDescriptorFromUrl = useCallback(async (imageUrl) => {
    if (!modelsLoaded) return null;
    
    const tryExtract = (url) => new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = async () => {
        try {
          const detection = await faceapi
            .detectSingleFace(img, new faceapi.TinyFaceDetectorOptions({ scoreThreshold: 0.1, inputSize: 416 }))
            .withFaceLandmarks()
            .withFaceDescriptor();
          resolve(detection ? detection.descriptor : null);
        } catch (e) {
          resolve(null);
        }
      };
      img.onerror = () => resolve(null);
      img.src = url;
    });

    let desc = await tryExtract(imageUrl);
    if (!desc && imageUrl.includes('http')) {
      // Try with cors proxy
      desc = await tryExtract('https://api.allorigins.win/raw?url=' + encodeURIComponent(imageUrl));
    }
    return desc;
  }, [])`;

code = code.replace(/const getDescriptorFromUrl = useCallback\(async \(imageUrl\) => \{[\s\S]*?\}, \[\]\)/, proxyLogic);

fs.writeFileSync('src/hooks/useFaceRecognition.js', code);
console.log('Added proxy fallback for CORS bypass');
