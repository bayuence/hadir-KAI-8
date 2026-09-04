/**
 * driveImage.js
 * Helper terpusat untuk konversi URL Google Drive ke format
 * yang kompatibel di semua browser termasuk Safari/iOS.
 *
 * Masalah Safari: ITP (Intelligent Tracking Prevention) memblokir
 * request cross-origin ke drive.google.com/uc?id= dan thumbnail?id=
 * karena dianggap tracking cookie. Solusi: pakai lh3.googleusercontent.com
 * yang merupakan CDN Google — tidak butuh cookie/redirect, Safari-safe.
 */

/**
 * Ekstrak File ID dari berbagai format URL Google Drive.
 * Handle format:
 *  - https://drive.google.com/uc?id=FILE_ID
 *  - https://drive.google.com/open?id=FILE_ID
 *  - https://drive.google.com/file/d/FILE_ID/view
 *  - https://drive.google.com/thumbnail?id=FILE_ID
 *  - https://lh3.googleusercontent.com/d/FILE_ID (sudah converted)
 */
export function extractDriveFileId(url) {
  if (!url || typeof url !== 'string') return null

  // Sudah format lh3 → ekstrak dari path
  const lh3Match = url.match(/lh3\.googleusercontent\.com\/d\/([^/?&]+)/)
  if (lh3Match) return lh3Match[1]

  // Format ?id= atau &id=
  const idParam = url.match(/[?&]id=([^&]+)/)
  if (idParam) return idParam[1]

  // Format /file/d/FILE_ID/
  const fileD = url.match(/\/file\/d\/([^/?]+)/)
  if (fileD) return fileD[1]

  return null
}

/**
 * Convert URL Google Drive ke format lh3.googleusercontent.com
 * yang bisa diload di Safari tanpa error.
 *
 * @param {string} url - URL Google Drive (format apapun)
 * @param {number} size - ukuran thumbnail (default 200)
 * @returns {string|null} - URL yang siap dipakai di <img src>
 */
export function driveImageUrl(url, size = 200) {
  const fileId = extractDriveFileId(url)
  if (!fileId) return url || null
  // lh3.googleusercontent.com/d/ adalah CDN Google yang tidak memerlukan
  // autentikasi cookie → bekerja di Safari, iOS, dan semua browser
  return `https://lh3.googleusercontent.com/d/${fileId}=s${size}`
}

/**
 * Alias untuk foto profil (ukuran lebih besar)
 */
export function driveAvatarUrl(url) {
  return driveImageUrl(url, 400)
}

/**
 * Alias untuk thumbnail di riwayat (ukuran kecil)
 */
export function driveThumbUrl(url) {
  return driveImageUrl(url, 120)
}
