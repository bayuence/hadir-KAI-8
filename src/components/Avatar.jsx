import React, { useState, useEffect, useRef } from 'react'
import { extractDriveFileId } from '../utils/driveImage'

/**
 * Buat daftar URL kandidat untuk dicoba satu per satu.
 * Urutan: lh3 (paling reliable) → drive thumbnail → original → null
 */
function buildUrlCandidates(src) {
  if (!src || typeof src !== 'string') return []

  const fileId = extractDriveFileId(src)
  const candidates = []

  if (fileId) {
    // Format lh3 — CDN Google, tidak perlu cookie, Safari-safe
    candidates.push(`https://lh3.googleusercontent.com/d/${fileId}=s400`)
    // Format thumbnail Drive — alternatif jika lh3 blocked
    candidates.push(`https://drive.google.com/thumbnail?id=${fileId}&sz=w400-h400`)
  }

  // Jika URL asli bukan Drive (misal sudah direct URL), pakai langsung
  if (!fileId && src.startsWith('http')) {
    candidates.push(src)
  }

  return candidates
}

/**
 * Avatar — komponen foto profil yang robust dengan multi-fallback URL.
 *
 * Fitur:
 * - Coba beberapa format URL Google Drive secara berurutan
 * - Gunakan React state (bukan DOM manipulation)
 * - Fallback ke inisial nama jika semua URL gagal
 * - Placeholder inisial muncul selama foto loading
 * - Tidak stuck saat navigasi bolak-balik
 */
export default function Avatar({
  src,
  name = '',
  size = 40,
  className = '',
  style = {},
  onClick,
}) {
  const candidates      = useRef(buildUrlCandidates(src))
  const candidateIdx    = useRef(0)

  const firstUrl = candidates.current[0] || null

  const [imgSrc, setImgSrc]     = useState(firstUrl)
  const [hasError, setHasError] = useState(!firstUrl)
  const [loaded, setLoaded]     = useState(false)

  // Reset saat src berubah (misal setelah background sync update foto)
  useEffect(() => {
    const newCandidates = buildUrlCandidates(src)
    candidates.current  = newCandidates
    candidateIdx.current = 0
    const newFirst = newCandidates[0] || null
    setImgSrc(newFirst)
    setHasError(!newFirst)
    setLoaded(false)
  }, [src])

  const handleError = () => {
    const next = candidateIdx.current + 1
    if (next < candidates.current.length) {
      // Coba URL berikutnya
      candidateIdx.current = next
      setImgSrc(candidates.current[next])
      setLoaded(false)
    } else {
      // Semua URL gagal → tampilkan inisial
      setHasError(true)
    }
  }

  const handleLoad = () => {
    setLoaded(true)
    setHasError(false)
  }

  const initial = name ? name.charAt(0).toUpperCase() : '?'

  const baseStyle = {
    width: size,
    height: size,
    borderRadius: '50%',
    flexShrink: 0,
    cursor: onClick ? 'pointer' : undefined,
    ...style,
  }

  const fallbackStyle = {
    ...baseStyle,
    background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
    color: '#fff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: size * 0.38,
    fontWeight: 700,
    letterSpacing: '-0.02em',
    userSelect: 'none',
  }

  // Tidak ada src atau semua URL gagal → tampilkan inisial
  if (!imgSrc || hasError) {
    return (
      <div
        className={className}
        style={fallbackStyle}
        onClick={onClick}
        aria-label={name}
      >
        {initial}
      </div>
    )
  }

  return (
    <div
      style={{ ...baseStyle, position: 'relative', overflow: 'hidden' }}
      className={className}
      onClick={onClick}
    >
      {/* Placeholder inisial selama foto loading */}
      {!loaded && (
        <div style={{
          ...fallbackStyle,
          position: 'absolute', inset: 0,
          width: '100%', height: '100%',
          cursor: onClick ? 'pointer' : undefined,
        }}>
          {initial}
        </div>
      )}
      <img
        src={imgSrc}
        alt={name}
        onError={handleError}
        onLoad={handleLoad}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          objectPosition: 'top',
          borderRadius: baseStyle.borderRadius,
          display: 'block',
          opacity: loaded ? 1 : 0,
          transition: 'opacity 0.3s ease',
          position: 'absolute',
          inset: 0,
        }}
      />
    </div>
  )
}

