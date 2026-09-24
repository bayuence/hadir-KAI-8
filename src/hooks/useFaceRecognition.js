import { useRef, useState, useCallback } from 'react'
import * as faceapi from 'face-api.js'

const MODEL_URL = '/models'
const MATCH_THRESHOLD = 0.45

let modelsLoaded = false

export function useFaceRecognition() {
  const [modelReady, setModelReady] = useState(false)
  const [loadingModel, setLoadingModel] = useState(false)
  const [modelError, setModelError] = useState(null)

  const loadModels = useCallback(async () => {
    if (modelsLoaded) { setModelReady(true); return }
    setLoadingModel(true)
    setModelError(null)
    try {
      await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
        faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
        faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
      ])
      modelsLoaded = true
      setModelReady(true)
    } catch (e) {
      console.error('Face API model load error:', e)
      setModelError('Gagal memuat model AI. Periksa koneksi internet.')
    } finally {
      setLoadingModel(false)
    }
  }, [])

  const getDescriptor = useCallback(async (mediaEl) => {
    if (!modelsLoaded) return null
    try {
      const detection = await faceapi
        .detectSingleFace(mediaEl, new faceapi.TinyFaceDetectorOptions({ scoreThreshold: 0.5 }))
        .withFaceLandmarks()
        .withFaceDescriptor()
      return detection ? detection.descriptor : null
    } catch (e) {
      console.error('getDescriptor error:', e)
      return null
    }
  }, [])

  const getDescriptorFromUrl = useCallback(async (imageUrl) => {
    if (!modelsLoaded) return null
    return new Promise((resolve) => {
      const img = new Image()
      img.crossOrigin = 'anonymous'
      img.onload = async () => {
        try {
          const detection = await faceapi
            .detectSingleFace(img, new faceapi.TinyFaceDetectorOptions({ scoreThreshold: 0.4 }))
            .withFaceLandmarks()
            .withFaceDescriptor()
          resolve(detection ? detection.descriptor : null)
        } catch (e) {
          resolve(null)
        }
      }
      img.onerror = () => resolve(null)
      img.src = imageUrl
    })
  }, [])

  const compareDescriptors = useCallback((d1, d2) => {
    if (!d1 || !d2) return { match: false, distance: 1 }
    const distance = faceapi.euclideanDistance(d1, d2)
    return { match: distance < MATCH_THRESHOLD, distance: parseFloat(distance.toFixed(3)) }
  }, [])

  const serializeDescriptor = (descriptor) => {
    if (!descriptor) return null
    return JSON.stringify(Array.from(descriptor))
  }

  const deserializeDescriptor = (str) => {
    if (!str) return null
    try { return new Float32Array(JSON.parse(str)) } catch { return null }
  }

  return {
    modelReady, loadingModel, modelError,
    loadModels, getDescriptor, getDescriptorFromUrl,
    compareDescriptors, serializeDescriptor, deserializeDescriptor,
    MATCH_THRESHOLD
  }
}
