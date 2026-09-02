import { useState, useEffect, useRef } from 'react'
import { getDistance } from '../utils/geo'

export function useGeo(targetLat, targetLong, maxRadius = 100) {
  const [loc, setLoc] = useState({ lat: null, lng: null, err: null, distance: null, accuracy: null })
  const watchId = useRef(null)

  useEffect(() => {
    if (!navigator.geolocation) {
      setLoc(l => ({ ...l, err: 'Browser tidak mendukung GPS.' }))
      return
    }

    const onSuccess = (pos) => {
      const lat = pos.coords.latitude
      const lng = pos.coords.longitude
      const accuracy = Math.round(pos.coords.accuracy) // meter

      let distance = 0
      if (targetLat && targetLong) {
        distance = getDistance(lat, lng, targetLat, targetLong)
      }

      setLoc({ lat, lng, err: null, distance: Math.round(distance * 100) / 100, accuracy })
    }

    const onError = (err) => {
      let errMsg = 'GPS tidak aktif atau akses ditolak.'
      if (err.code === 1) errMsg = 'Akses lokasi ditolak browser/perangkat.'
      else if (err.code === 2) errMsg = 'Sinyal GPS tidak ditemukan.'
      else if (err.code === 3) errMsg = 'Waktu pencarian lokasi habis.'
      setLoc(l => ({ ...l, err: errMsg }))
    }

    const opts = { enableHighAccuracy: true, timeout: 15000, maximumAge: 2000 }

    // Pertama langsung ambil posisi sekali
    navigator.geolocation.getCurrentPosition(onSuccess, (err) => {
      // Kalau highAccuracy gagal (PC/laptop), coba tanpa
      navigator.geolocation.getCurrentPosition(onSuccess, onError, { enableHighAccuracy: false, timeout: 15000, maximumAge: 5000 })
    }, opts)

    // Lalu pantau terus secara realtime
    watchId.current = navigator.geolocation.watchPosition(onSuccess, onError, opts)

    return () => {
      if (watchId.current !== null) {
        navigator.geolocation.clearWatch(watchId.current)
      }
    }
  }, [targetLat, targetLong])

  // Faktorkan akurasi GPS: jika GPS melaporkan akurasi 50m, tambahkan toleransi
  // Toleransi max dibatasi 30m agar tidak terlalu longgar
  const gpsToleranse = Math.min((loc.accuracy || 0) * 0.5, 30)
  const isDiLuarArea = loc.distance !== null && loc.distance > (maxRadius + gpsToleranse)

  return { ...loc, isDiLuarArea, maxRadius }
}
