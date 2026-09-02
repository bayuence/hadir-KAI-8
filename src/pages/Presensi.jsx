import React, { useState, useRef, useCallback, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Webcam from 'react-webcam'
import { useAuth } from '../context/AuthContext'
import { api } from '../services/api'
import { useGeo } from '../hooks/useGeo'
import './Presensi.css'

export default function Presensi({ type = 'masuk' }) {
  const navigate = useNavigate()
  const webcamRef = useRef(null)
  
  const { user } = useAuth()
  const geo = useGeo(user?.lat, user?.long, user?.radius || 100) // radius per lokasi dari admin
  
  const [foto, setFoto] = useState(null)
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [jam, setJam] = useState(new Date().toLocaleTimeString('id-ID', { hour12: false }))

  useEffect(() => {
    const t = setInterval(() => setJam(new Date().toLocaleTimeString('id-ID', { hour12: false })), 1000)
    return () => clearInterval(t)
  }, [])

  const ambilFoto = useCallback(() => {
    const imageSrc = webcamRef.current.getScreenshot()
    setFoto(imageSrc)
  }, [webcamRef])

  const submitPresensi = async () => {
    if (!foto) return setErrorMsg('Silakan ambil foto terlebih dahulu.')
    if (geo.err) return setErrorMsg(geo.err)
    if (geo.isDiLuarArea) return setErrorMsg(`Di luar area penugasan (${geo.distance}m). Toleransi ${geo.maxRadius}m.`)

    setLoading(true)
    setErrorMsg('')
    try {
      const payload = {
        idPeserta: user.id,
        foto: foto.split(',')[1],
        latitude: geo.lat,
        longitude: geo.lng,
        timestamp: new Date().toISOString()
      }
      
      const data = type === 'masuk' ? await api.checkIn(payload) : await api.checkOut(payload)
      
      if (data.success) {
         navigate('/dashboard', { replace: true })
      } else {
         setErrorMsg(data.message || 'Gagal menyimpan presensi.')
      }
    } catch (e) {
      setErrorMsg('Gagal menghubungi server.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="app-shell bg-white">
      <div className="cam-header animate-fade-in">
        {geo.err ? (
           <div className="gps-badge badge-red">{geo.err}</div>
        ) : geo.distance === null ? (
           <div className="gps-badge badge-grey">Mencari lokasi...</div>
        ) : (
           <div className={`gps-badge ${geo.isDiLuarArea ? 'badge-amber' : 'badge-green'}`}>
             {geo.isDiLuarArea ? 'Di Luar Area' : 'Dalam Area'} · {user?.lokasi} · {geo.distance}m
           </div>
        )}
        <div className="cam-clock">{jam}</div>
      </div>

      <div className="cam-view-wrap animate-scale-in">
        {!foto ? (
          <div className="cam-container">
             <Webcam
                audio={false}
                ref={webcamRef}
                screenshotFormat="image/jpeg"
                videoConstraints={{ facingMode: "user" }}
                className="cam-video"
             />
             <div className="cam-overlay"><div className="cam-frame"></div></div>
          </div>
        ) : (
          <div className="cam-container">
             <img src={foto} alt="Preview" className="cam-preview" />
          </div>
        )}
      </div>
      
      <p className="cam-hint text-grey text-sm animate-fade-in">
        {!foto ? 'Posisikan wajah di dalam bingkai' : 'Preview foto presensi'}
      </p>

      {errorMsg && (
        <div className="login-error animate-fade-in" style={{margin:'0 24px 16px'}}>
           {errorMsg}
        </div>
      )}

      <div className="cam-actions animate-fade-up">
         {!foto ? (
           <>
            <button className="btn btn-primary" onClick={ambilFoto}>Ambil Foto</button>
            <button className="btn-ghost cam-cancel" onClick={() => navigate('/dashboard')}>Batal</button>
           </>
         ) : (
           <>
            <button className={`btn btn-primary ${loading ? 'loading' : ''}`} onClick={submitPresensi} disabled={loading || geo.isDiLuarArea}>
              {loading ? <span className="spinner"/> : 'Kirim Presensi'}
            </button>
            <button className="btn-outline cam-cancel mt-4" style={{width:'100%'}} onClick={() => setFoto(null)} disabled={loading}>
              Ulangi Foto
            </button>
           </>
         )}
      </div>
    </div>
  )
}
