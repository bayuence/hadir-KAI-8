import React, { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import './Onboarding.css'

/* ─── Ilustrasi SVG inline ─── */
const IllustrationLogo = () => (
  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 220 }}>
    <img src="/logo-kai.png" alt="Logo KAI" style={{ width: 180, height: 180, objectFit: 'contain' }} />
  </div>
)

const IllustrationCheckin = () => (
  <svg viewBox="0 0 280 220" fill="none" xmlns="http://www.w3.org/2000/svg" className="onboard-svg">
    <rect x="90" y="20" width="100" height="170" rx="18" fill="#f3f4f6" stroke="#e5e7eb" strokeWidth="1.5"/>
    <rect x="98" y="34" width="84" height="120" rx="8" fill="white"/>
    <circle cx="140" cy="72" r="22" fill="#e5e7eb"/>
    <circle cx="140" cy="58" r="11" fill="#d1d5db"/>
    <path d="M118 90 Q140 108 162 90" stroke="#d1d5db" strokeWidth="2" fill="none" strokeLinecap="round"/>
    <circle cx="162" cy="44" r="14" fill="#16a34a"/>
    <path d="M155 44 L160 49 L169 38" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
    <rect x="108" y="110" width="64" height="22" rx="6" fill="#f3f4f6"/>
    <text x="140" y="125" textAnchor="middle" fill="#6b7280" fontSize="10" fontFamily="monospace" fontWeight="600">08:02:47</text>
    <path d="M127 148 L140 130 L153 148 Q140 160 127 148Z" fill="#ea580c" opacity="0.15"/>
    <circle cx="140" cy="142" r="6" fill="#ea580c"/>
    <circle cx="140" cy="105" r="85" stroke="#16a34a" strokeWidth="1" strokeDasharray="4 6" opacity="0.3"/>
    <circle cx="60" cy="80" r="4" fill="#e5e7eb"/>
    <circle cx="50" cy="110" r="3" fill="#e5e7eb"/>
    <circle cx="220" cy="75" r="4" fill="#e5e7eb"/>
    <circle cx="228" cy="108" r="3" fill="#e5e7eb"/>
  </svg>
)

const IllustrationLocation = () => (
  <svg viewBox="0 0 280 220" fill="none" xmlns="http://www.w3.org/2000/svg" className="onboard-svg">
    <rect x="40" y="40" width="200" height="140" rx="16" fill="#f9f9f9" stroke="#e5e7eb" strokeWidth="1.5"/>
    <line x1="40" y1="110" x2="240" y2="110" stroke="#e5e7eb" strokeWidth="8"/>
    <line x1="140" y1="40" x2="140" y2="180" stroke="#e5e7eb" strokeWidth="8"/>
    <path d="M140 55 C122 55 110 68 110 82 C110 102 140 130 140 130 C140 130 170 102 170 82 C170 68 158 55 140 55Z" fill="#ea580c"/>
    <circle cx="140" cy="82" r="10" fill="white"/>
    <circle cx="140" cy="82" r="38" stroke="#ea580c" strokeWidth="1.5" strokeDasharray="5 4" opacity="0.5"/>
    <circle cx="175" cy="55" r="12" fill="#16a34a"/>
    <path d="M169 55 L174 60 L181 48" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <rect x="82" y="145" width="116" height="22" rx="8" fill="white" stroke="#e5e7eb" strokeWidth="1"/>
    <text x="140" y="160" textAnchor="middle" fill="#6b7280" fontSize="10" fontFamily="Inter, sans-serif" fontWeight="500">Kantor Daop · 45m</text>
    <circle cx="58" cy="58" r="5" fill="#fef3c7"/>
    <circle cx="222" cy="162" r="5" fill="#dcfce7"/>
  </svg>
)

const IllustrationHistory = () => (
  <svg viewBox="0 0 280 220" fill="none" xmlns="http://www.w3.org/2000/svg" className="onboard-svg">
    <rect x="55" y="30" width="170" height="160" rx="14" fill="white" stroke="#e5e7eb" strokeWidth="1.5"/>
    <rect x="55" y="30" width="170" height="36" rx="14" fill="#f3f4f6"/>
    <rect x="55" y="48" width="170" height="18" fill="#f3f4f6"/>
    <text x="140" y="53" textAnchor="middle" fill="#6b7280" fontSize="11" fontFamily="Inter, sans-serif" fontWeight="600">Riwayat Presensi</text>
    {[0,1,2].map((i) => (
      <g key={i} transform={`translate(0, ${i * 38})`}>
        <rect x="68" y="78" width="144" height="30" rx="8" fill="#f9f9f9"/>
        <rect x="76" y="85" width="40" height="8" rx="3" fill="#e5e7eb"/>
        <rect x="76" y="96" width="28" height="6" rx="3" fill="#e5e7eb"/>
        <rect x={i === 1 ? "156" : "160"} y="86" width={i === 2 ? "34" : "38"} height="16" rx="8"
          fill={i === 0 ? "#dcfce7" : i === 1 ? "#fef3c7" : "#fee2e2"}/>
        <text x={i === 0 ? "179" : i === 1 ? "175" : "177"} y="98" textAnchor="middle"
          fill={i === 0 ? "#16a34a" : i === 1 ? "#b45309" : "#dc2626"}
          fontSize="9" fontFamily="Inter, sans-serif" fontWeight="700">
          {i === 0 ? "Hadir" : i === 1 ? "Izin" : "Alfa"}
        </text>
      </g>
    ))}
    <rect x="68" y="175" width="144" height="7" rx="3" fill="#e5e7eb"/>
    <circle cx="52" cy="50" r="6" fill="#dcfce7"/>
    <circle cx="228" cy="170" r="6" fill="#fef3c7"/>
  </svg>
)

/* ─── Slide data ─── */
const slides = [
  {
    id: 0,
    illustration: <IllustrationLogo />,
    title: 'Sistem Presensi Digital',
    desc: 'KAI Daop 8 Unit Operasi',
  },
  {
    id: 1,
    illustration: <IllustrationCheckin />,
    title: 'Presensi dengan Foto',
    desc: 'Absen masuk & pulang cukup pakai kamera HP. Foto tersimpan otomatis ke sistem.',
  },
  {
    id: 2,
    illustration: <IllustrationLocation />,
    title: 'Validasi Lokasi Otomatis',
    desc: 'GPS memastikan kamu presensi dari area yang tepat. Di luar area? Tinggal ajukan izin.',
  },
  {
    id: 3,
    illustration: <IllustrationHistory />,
    title: 'Pantau Riwayat Hadir',
    desc: 'Lihat rekap kehadiran harian, total jam kerja, dan status izin dalam satu halaman.',
  },
]

export default function Onboarding() {
  const navigate = useNavigate()
  const [current, setCurrent] = useState(0)
  const [exiting, setExiting] = useState(false)
  
  // Swipe & Pause state
  const [isInteracting, setIsInteracting] = useState(false)
  const [touchStart, setTouchStart] = useState(null)
  const [touchEnd, setTouchEnd] = useState(null)
  const resumeTimeoutRef = useRef(null)

  // Auto advance logic
  useEffect(() => {
    if (isInteracting) return // Jangan gerakkan kalau user sedang sentuh/swipe
    
    const t = setTimeout(() => {
      goNext()
    }, 4000)
    
    return () => clearTimeout(t)
  }, [current, isInteracting])

  const goNext = () => {
    setExiting(true)
    setTimeout(() => {
      setCurrent(c => (c + 1) % slides.length)
      setExiting(false)
    }, 280)
  }

  const goPrev = () => {
    setExiting(true)
    setTimeout(() => {
      setCurrent(c => (c === 0 ? slides.length - 1 : c - 1))
      setExiting(false)
    }, 280)
  }

  const goTo = (idx) => {
    if (idx === current) return
    pauseAutoPlay()
    setExiting(true)
    setTimeout(() => {
      setCurrent(idx)
      setExiting(false)
      resumeAutoPlay()
    }, 280)
  }

  // --- SWIPE LOGIC ---
  const minSwipeDistance = 50

  const onTouchStart = (e) => {
    setTouchEnd(null)
    setTouchStart(e.targetTouches[0].clientX)
    pauseAutoPlay()
  }

  const onTouchMove = (e) => {
    setTouchEnd(e.targetTouches[0].clientX)
  }

  const onTouchEndHandler = () => {
    if (!touchStart || !touchEnd) {
      resumeAutoPlay()
      return
    }
    const distance = touchStart - touchEnd
    const isLeftSwipe = distance > minSwipeDistance
    const isRightSwipe = distance < -minSwipeDistance

    if (isLeftSwipe) {
      goNext()
    } else if (isRightSwipe) {
      goPrev()
    }
    
    resumeAutoPlay()
  }

  // --- PAUSE/RESUME LOGIC ---
  const pauseAutoPlay = () => {
    setIsInteracting(true)
    if (resumeTimeoutRef.current) clearTimeout(resumeTimeoutRef.current)
  }

  const resumeAutoPlay = () => {
    if (resumeTimeoutRef.current) clearTimeout(resumeTimeoutRef.current)
    // Tunggu 2 detik setelah user tidak menyentuh layar, lalu jalankan animasi lagi
    resumeTimeoutRef.current = setTimeout(() => {
      setIsInteracting(false)
    }, 2000)
  }

  return (
    <div className="app-shell">
      <div 
        className="onboard-wrap" 
        style={{ paddingTop: '10vh' }}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEndHandler}
        onMouseDown={pauseAutoPlay} // Pause kalau di-klik dari PC
        onMouseUp={resumeAutoPlay}
      >
        
        {/* ── Slide area ── */}
        <div className={`onboard-slide ${exiting ? 'slide-exit' : 'slide-enter'}`} key={current}>
          <div className="onboard-illustration">
            {slides[current].illustration}
          </div>
          <div className="onboard-text">
            <h2 className="onboard-title" style={current === 0 ? { fontSize: 26, letterSpacing: '-0.04em' } : {}}>
              {slides[current].title}
            </h2>
            <p className="onboard-desc" style={current === 0 ? { fontSize: 16, fontWeight: 500 } : {}}>
              {slides[current].desc}
            </p>
          </div>
        </div>

        {/* ── Dots ── */}
        <div className="onboard-dots">
          {slides.map((_, i) => (
            <button
              key={i}
              className={`onboard-dot ${i === current ? 'active' : ''}`}
              onClick={() => goTo(i)}
              aria-label={`Slide ${i + 1}`}
            />
          ))}
        </div>

        {/* ── Actions (Selalu terlihat) ── */}
        <div className="onboard-actions animate-fade-up">
          <button className="btn btn-primary" onClick={() => navigate('/login')} style={{ width: '100%', padding: '16px' }}>
            Mulai Sekarang →
          </button>
        </div>

        {/* ── Footer label ── */}
        <p className="onboard-footer animate-fade-in">
          Sistem Presensi Digital Magang — KAI Daop 8 Unit Operasi
        </p>

      </div>
    </div>
  )
}
