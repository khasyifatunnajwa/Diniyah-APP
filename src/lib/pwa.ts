export async function requestNotificationPermission(): Promise<boolean> {
  if (!('Notification' in window)) return false
  if (Notification.permission === 'granted') return true
  if (Notification.permission === 'denied') return false
  const result = await Notification.requestPermission()
  return result === 'granted'
}

export async function sendLocalNotification(title: string, body: string, link?: string) {
  if (!('Notification' in window) || Notification.permission !== 'granted') return
  const reg = await navigator.serviceWorker.getRegistration()
  if (reg) {
    reg.showNotification(title, {
      body,
      icon: '/icon.svg',
      badge: '/icon.svg',
      tag: 'sim-kbm',
      data: { link: link || '/' },
    })
  } else {
    new Notification(title, { body, icon: '/icon.svg' })
  }
}

export async function registerBackgroundSync() {
  if (!('serviceWorker' in navigator) || !('SyncManager' in window)) return
  try {
    const reg = await navigator.serviceWorker.ready
    await (reg as any).sync.register('sim-kbm-sync')
  } catch {}
}

export function isPWA(): boolean {
  return window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone === true
}

export async function installPromptAvailable(): Promise<boolean> {
  return new Promise((resolve) => {
    let resolved = false
    const handler = () => {
      if (!resolved) {
        resolved = true
        resolve(true)
      }
    }
    window.addEventListener('beforeinstallprompt', handler, { once: true })
    setTimeout(() => {
      if (!resolved) {
        resolved = true
        resolve(false)
      }
    }, 3000)
  })
}
