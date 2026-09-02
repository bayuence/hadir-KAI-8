import { useState, useEffect } from 'react'
import { getDistance } from '../utils/geo'

export function useGeo(targetLat, targetLong, maxRadius = 100) {
  const [loc, setLoc] = useState({ lat: null, lng: null, err: null, distance: null })

  useEffect(() => {
    if (!navigator.geolocation) {
      setLoc(l => ({ ...l, err: 'Browser tidak mendukung GPS.' }))
      return
    }

    const getPos = (highAcc) => {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat = pos.coords.latitude
          const lng = pos.coords.longitude
          let distance = 0
          if (targetLat && targetLong) {
             distance = getDistance(lat, lng, targetLat, targetLong)
          }
          setLoc({ lat, lng, err: null, distance: Math.round(distance) })
        },
        (err) => {
          // Jika gagal pakai highAccuracy (sering terjadi di PC/Laptop), coba tanpa highAccuracy
          if (highAcc) {
            getPos(false)
          } else {
            let errMsg = 'GPS tidak aktif atau akses ditolak.'
            if (err.code === 1) errMsg = 'Akses lokasi ditolak browser/perangkat.'
            else if (err.code === 2) errMsg = 'Sinyal GPS tidak ditemukan (Lokasi perangkat mati).'
            else if (err.code === 3) errMsg = 'Mencari lokasi terlalu lama (Timeout).'
            
            setLoc(l => ({ ...l, err: errMsg }))
          }
        },
        { enableHighAccuracy: highAcc, timeout: 15000, maximumAge: 0 }
      )
    }

    // Pertama kali coba dengan High Accuracy (untuk HP)
    getPos(true)

  }, [targetLat, targetLong])

  const isDiLuarArea = loc.distance !== null && loc.distance > maxRadius

  return { ...loc, isDiLuarArea, maxRadius }
}
