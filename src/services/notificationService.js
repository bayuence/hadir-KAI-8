// Layanan Notifikasi PWA & Browser untuk HADIRKAI8

export const isNotificationSupported = () => {
  return typeof window !== 'undefined' && 'Notification' in window
}

export const isServiceWorkerSupported = () => {
  return typeof window !== 'undefined' && 'serviceWorker' in navigator
}

export const isIos = () => {
  if (typeof window === 'undefined') return false
  const ua = window.navigator.userAgent.toLowerCase()
  return /iphone|ipad|ipod/.test(ua) || (window.navigator.platform === 'MacIntel' && window.navigator.maxTouchPoints > 1)
}

export const isStandalone = () => {
  if (typeof window === 'undefined') return false
  return (
    window.navigator.standalone === true ||
    window.matchMedia('(display-mode: standalone)').matches
  )
}

export const getNotificationPermission = () => {
  if (!isNotificationSupported()) return 'unsupported'
  return Notification.permission // 'default' | 'granted' | 'denied'
}

export const requestNotificationPermission = async () => {
  if (!isNotificationSupported()) {
    return { success: false, permission: 'unsupported', message: 'Browser tidak mendukung notifikasi web.' }
  }

  try {
    const permission = await Notification.requestPermission()
    if (permission === 'granted') {
      localStorage.setItem('kai_notif_enabled', 'true')
      return { success: true, permission }
    } else {
      localStorage.setItem('kai_notif_enabled', 'false')
      return { success: false, permission, message: 'Izin notifikasi ditolak oleh pengguna.' }
    }
  } catch (err) {
    console.error('Error request notification permission:', err)
    return { success: false, message: err.message }
  }
}

export const sendNotification = async (title, options = {}) => {
  if (!isNotificationSupported()) return false
  if (Notification.permission !== 'granted') return false

  const defaultOptions = {
    body: 'Mengingatkan untuk segera melakukan presensi hari ini.',
    icon: '/logo-kai-notif.png',
    badge: '/logo-kai-notif.png',
    vibrate: [200, 100, 200],
    tag: 'kai-presensi-notif',
    renotify: true,
    data: { url: window.location.origin + '/' },
    ...options
  }

  try {
    // Prioritaskan lewat Service Worker Registration (standar PWA untuk Android & iOS)
    if (isServiceWorkerSupported()) {
      const reg = await navigator.serviceWorker.ready
      if (reg && reg.showNotification) {
        await reg.showNotification(title, defaultOptions)
        return true
      }
    }
    // Fallback ke Notification biasa
    new Notification(title, defaultOptions)
    return true
  } catch (err) {
    console.warn('Gagal memicu showNotification SW, fallback:', err)
    try {
      new Notification(title, defaultOptions)
      return true
    } catch (_) {
      return false
    }
  }
}

/**
 * Pengecekan otomatis saat aplikasi dibuka di pagi hari (07.00 - 08.30 WIB)
 * Jika peserta belum absen hari ini, kirimkan notifikasi pengingat lokal
 */
export const checkMorningReminder = (sudahMasuk) => {
  if (sudahMasuk) return
  if (!isNotificationSupported() || Notification.permission !== 'granted') return

  const now = new Date()
  const day = now.getDay()
  // Hanya hari kerja: Senin (1) sampai Jumat (5)
  if (day === 0 || day === 6) return

  const hours = now.getHours()
  const minutes = now.getMinutes()
  const totalMinutes = hours * 60 + minutes

  // Antara pukul 07.00 (420 menit) sampai 08.30 (510 menit)
  if (totalMinutes >= 420 && totalMinutes <= 510) {
    const todayStr = now.toISOString().slice(0, 10)
    const key = `kai_morning_reminder_sent_${todayStr}`
    if (!localStorage.getItem(key)) {
      sendNotification('HADIRKAI8 — Pengingat Presensi', {
        body: 'Selamat pagi! Jangan lupa melakukan presensi masuk magang hari ini sebelum pukul 08.00 WIB.',
        tag: 'kai-morning-reminder'
      })
      localStorage.setItem(key, 'true')
    }
  }
}
