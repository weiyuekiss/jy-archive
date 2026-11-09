import { ref } from 'vue'
import { registerSW } from 'virtual:pwa-register'

export const updateAvailable = ref(false)
export const appVersion = __APP_VERSION__
export const appBuildTime = __APP_BUILD_TIME__

let updateServiceWorker
let updateCheckPromise
let reloadRequested = false

export function checkForAppUpdate() {
  if (updateCheckPromise) return updateCheckPromise
  if (!updateServiceWorker) return Promise.resolve(false)

  // false 检查并通知新版本，但不跳过等待/自动刷新，保留用户确认按钮。
  updateCheckPromise = updateServiceWorker(false)
    .then(() => true)
    .catch((error) => {
      console.error('检查应用更新失败：', error)
      return false
    })
    .finally(() => { updateCheckPromise = undefined })
  return updateCheckPromise
}

export async function reloadWithLatestVersion() {
  if (reloadRequested) return
  reloadRequested = true
  try {
    // vite-plugin-pwa 的回调会等待新 Service Worker 激活后再返回。
    await updateServiceWorker?.(true)
  } catch (error) {
    console.error('应用更新失败，将尝试重新加载：', error)
  } finally {
    // 添加版本查询参数，避免手机浏览器或中间缓存继续返回旧入口 HTML。
    const url = new URL(window.location.href)
    url.searchParams.set('_app_reload', String(Date.now()))
    window.location.replace(url.toString())
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
      const check = () => { void checkForAppUpdate() }
      window.addEventListener('online', check)
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') check()
      })
    },
    onRegisterError(error) {
      console.error('Service worker registration failed:', error)
    }
  })
}
