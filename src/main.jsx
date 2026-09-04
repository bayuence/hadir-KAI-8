import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import { registerSW } from 'virtual:pwa-register'

// Auto-reload ketika ada update PWA dari Vercel
registerSW({
  onNeedRefresh() {
    // Service worker baru sudah siap → reload otomatis
    window.location.reload()
  },
  onOfflineReady() {
    // App siap digunakan offline
    console.log('App siap digunakan offline')
  }
})

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
