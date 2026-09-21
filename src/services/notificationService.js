// Layanan Notifikasi PWA & Browser untuk HADIRKAI8

/**
 * Memainkan suara lonceng stasiun KAI menggunakan Web Audio API.
 * Tidak membutuhkan file audio eksternal — disintesis langsung di browser.
 * Pola: DING — DONG — DING (lonceng stasiun kereta api)
 */
export const playKaiChime = (volume = 0.6) => {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext
    if (!AudioCtx) return
    const ctx = new AudioCtx()

    // Definisi nada lonceng stasiun: [frekuensi Hz, mulai detik, durasi detik, gain]
    const notes = [
      [880,  0.0,  0.8, volume],   // DING tinggi
      [659,  0.5,  0.8, volume],   // DONG rendah
      [880,  1.0,  1.0, volume],   // DING tinggi lagi (lebih panjang)
    ]

    notes.forEach(([freq, startTime, duration, gain]) => {
      // Oscillator utama (nada dasar)
      const osc = ctx.createOscillator()
      const gainNode = ctx.createGain()

      osc.connect(gainNode)
      gainNode.connect(ctx.destination)

      osc.type = 'sine'
      osc.frequency.setValueAtTime(freq, ctx.currentTime + startTime)
      // Tambah sedikit harmonik agar terdengar seperti lonceng metal
      osc.frequency.setValueAtTime(freq * 2.756, ctx.currentTime + startTime + 0.01)
      osc.frequency.setValueAtTime(freq, ctx.currentTime + startTime + 0.02)

      // Envelope: attack cepat, decay panjang (karakter lonceng)
      gainNode.gain.setValueAtTime(0, ctx.currentTime + startTime)
      gainNode.gain.linearRampToValueAtTime(gain, ctx.currentTime + startTime + 0.01)
      gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + startTime + duration)

      osc.start(ctx.currentTime + startTime)
      osc.stop(ctx.currentTime + startTime + duration)
    })

    // Tutup konteks setelah semua nada selesai
    setTimeout(() => ctx.close(), 2500)
  } catch (err) {
    console.warn('[KAI Chime] Gagal memutar suara:', err)
  }
}

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

  // Mainkan suara lonceng KAI saat notifikasi dikirim (jika app sedang terbuka)
  if (!options.silent) playKaiChime()

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
 * Pengecekan otomatis berkala jadwal presensi magang KAI Daop 8
 * 
 * Aturan Jam Kerja:
 * - Senin s.d Kamis: 08.00 - 16.00 WIB
 *   -> 07.45: Pengingat 15 menit sebelum masuk
 *   -> 08.15: Pengingat bagi yang BELUM presensi masuk
 *   -> 15.45: Pengingat 15 menit sebelum pulang (jika sudah masuk)
 *   -> 16.15: Pengingat bagi yang BELUM presensi pulang (jika sudah masuk)
 * 
 * - Jum'at: 07.30 - 15.00 WIB
 *   -> 07.15: Pengingat 15 menit sebelum masuk
 *   -> 07.45: Pengingat bagi yang BELUM presensi masuk
 *   -> 14.45: Pengingat 15 menit sebelum pulang (jika sudah masuk)
 *   -> 15.15: Pengingat bagi yang BELUM presensi pulang (jika sudah masuk)
 * 
 * - Sabtu & Minggu: Libur (Tidak ada pengingat)
 */
export const checkAutomatedReminders = (status = {}) => {
  if (!isNotificationSupported() || Notification.permission !== 'granted') return

  const now = new Date()
  const day = now.getDay() // 0 = Minggu, 1 = Senin, ..., 5 = Jumat, 6 = Sabtu
  if (day === 0 || day === 6) return // Libur weekend

  const isFriday = day === 5
  const hours = now.getHours()
  const minutes = now.getMinutes()
  const totalMinutes = hours * 60 + minutes

  const todayStr = now.toISOString().slice(0, 10)
  const sendOncePerDay = (type, title, body, tag) => {
    const key = `kai_notif_${type}_${todayStr}`
    if (!localStorage.getItem(key)) {
      sendNotification(title, { body, tag })
      localStorage.setItem(key, 'true')
    }
  }

  // 1. Pengingat Sebelum Masuk (15 Menit Sebelum Jam Masuk)
  // Senin-Kamis: 07.45 (465 mnt) | Jumat: 07.15 (435 mnt)
  const preMasukStart = isFriday ? 435 : 465
  const preMasukEnd = isFriday ? 449 : 479
  if (totalMinutes >= preMasukStart && totalMinutes <= preMasukEnd) {
    if (!status.sudahMasuk) {
      sendOncePerDay(
        'pre_masuk',
        'HADIR KAI 8',
        'Selamat pagi! Waktu presensi masuk akan dimulai 15 menit lagi. Segera persiapkan presensi Anda.',
        'kai-pre-masuk'
      )
    }
  }

  // 2. Pengingat Terlambat / Belum Presensi Masuk (15 Menit Setelah Jam Masuk)
  // Senin-Kamis: 08.15 (495 mnt) | Jumat: 07.45 (465 mnt)
  const lateMasukStart = isFriday ? 465 : 495
  const lateMasukEnd = isFriday ? 495 : 525
  if (totalMinutes >= lateMasukStart && totalMinutes <= lateMasukEnd) {
    if (!status.sudahMasuk) {
      sendOncePerDay(
        'late_masuk',
        'HADIR KAI 8',
        'Peringatan: Anda belum melakukan presensi masuk hari ini. Mohon segera melakukan presensi!',
        'kai-late-masuk'
      )
    }
  }

  // 3. Pengingat Mulai Istirahat (Tepat Waktu)
  // Senin-Kamis: 12.00 (720 mnt) | Jumat: 11.30 (690 mnt)
  const breakStartMin = isFriday ? 690 : 720
  const breakStartEnd = breakStartMin + 14
  if (totalMinutes >= breakStartMin && totalMinutes <= breakStartEnd) {
    const msg = isFriday
      ? 'Waktu istirahat telah tiba (11.30 - 13.00 WIB). Selamat beristirahat & menunaikan ibadah Sholat Jum\'at!'
      : 'Waktu istirahat telah tiba (12.00 - 13.00 WIB). Selamat beristirahat dan makan siang!'
    sendOncePerDay('break_start', 'HADIR KAI 8', msg, 'kai-break-start')
  }

  // 4. Pengingat Selesai Istirahat (Tepat Waktu: 13.00 WIB)
  // Senin s.d Jumat: 13.00 (780 mnt)
  if (totalMinutes >= 780 && totalMinutes <= 794) {
    sendOncePerDay(
      'break_end',
      'HADIR KAI 8',
      'Waktu istirahat telah selesai (13.00 WIB). Selamat kembali melanjutkan aktivitas magang!',
      'kai-break-end'
    )
  }

  // 5. Pengingat Sebelum Pulang (15 Menit Sebelum Jam Pulang)
  // Senin-Kamis: 15.45 (945 mnt) | Jumat: 14.45 (885 mnt)
  const prePulangStart = isFriday ? 885 : 945
  const prePulangEnd = isFriday ? 899 : 959
  if (totalMinutes >= prePulangStart && totalMinutes <= prePulangEnd) {
    if (status.sudahMasuk && !status.sudahPulang) {
      sendOncePerDay(
        'pre_pulang',
        'HADIR KAI 8',
        'Selamat sore! 15 menit lagi waktu jam pulang kerja. Persiapkan diri Anda untuk presensi pulang.',
        'kai-pre-pulang'
      )
    }
  }

  // 4. Pengingat Belum Presensi Pulang (15 Menit Setelah Jam Pulang)
  // Senin-Kamis: 16.15 (975 mnt) | Jumat: 15.15 (915 mnt)
  const latePulangStart = isFriday ? 915 : 975
  const latePulangEnd = isFriday ? 945 : 1005
  if (totalMinutes >= latePulangStart && totalMinutes <= latePulangEnd) {
    if (status.sudahMasuk && !status.sudahPulang) {
      sendOncePerDay(
        'late_pulang',
        'HADIR KAI 8',
        'Peringatan: Anda belum melakukan presensi pulang hari ini. Jangan sampai lupa untuk presensi pulang!',
        'kai-late-pulang'
      )
    }
  }
}

// Backward compatibility alias
export const checkMorningReminder = checkAutomatedReminders
