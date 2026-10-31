import { registerSW } from 'virtual:pwa-register'

const UPDATE_CHECK_KEY = 'jy-os-last-update-check'
const UPDATE_CHECK_INTERVAL = 60 * 1000

export const updateAvailable = { value: false }

let updateServiceWorker
let updatePromptShown = false

function requestUpdateCheck() {
  const now = Date.now()
  const lastCheck = Number(localStorage.getItem(UPDATE_CHECK_KEY) || 0)
  if (now - lastCheck < UPDATE_CHECK_INTERVAL) return

  localStorage.setItem(UPDATE_CHECK_KEY, String(now))
  updateServiceWorker?.(true)
}

export function checkForAppUpdate() {
  requestUpdateCheck()
}

export async function reloadWithLatestVersion() {
  if (!updateServiceWorker) {
    window.location.reload()
    return
  }

  try {
    await updateServiceWorker(true)
  } finally {
    window.location.reload()
  }
}

if ('serviceWorker' in navigator) {
  updateServiceWorker = registerSW({
    immediate: true,
    onNeedRefresh() {
      updateAvailable.value = true
    },
    onRegisteredSW(_swUrl, registration) {
      if (!registration) return

      requestUpdateCheck()
      window.addEventListener('online', requestUpdateCheck)
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') requestUpdateCheck()
      })
    },
    onRegisterError(error) {
      console.error('Service worker registration failed:', error)
    }
  })
}
