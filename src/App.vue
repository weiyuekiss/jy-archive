<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import HomeGrid from '@/components/HomeGrid.vue'
import AppDock from '@/components/AppDock.vue'
import { dockApps, homeApps } from '@/apps'
import { activeApp, closeApp } from '@/stores/desktop'
import { theme, wallpaperCss, glassVars } from '@/stores/theme'
import { chatErrorDialog } from '@/stores/chatErrors'
import { checkForAppUpdate, reloadWithLatestVersion, updateAvailable, appVersion, appBuildTime } from '@/pwa'

async function copyChatError() {
  const text = chatErrorDialog.value?.details
  if (!text) return
  try {
    await navigator.clipboard.writeText(text)
    chatErrorDialog.value = { ...chatErrorDialog.value, copied: true }
    window.setTimeout(() => {
      if (chatErrorDialog.value) chatErrorDialog.value = { ...chatErrorDialog.value, copied: false }
    }, 1800)
  } catch {
    const area = document.createElement('textarea')
    area.value = text
    area.style.position = 'fixed'
    area.style.opacity = '0'
    document.body.appendChild(area)
    area.select()
    const copied = document.execCommand('copy')
    area.remove()
    if (copied && chatErrorDialog.value) chatErrorDialog.value = { ...chatErrorDialog.value, copied: true }
  }
}

const showWelcome = ref(true)
const showUpdatePrompt = computed(() => updateAvailable.value)
const showBuildInfo = ref(true)
let enterTimer
let buildInfoTimer

onMounted(() => {
  void checkForAppUpdate()
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  enterTimer = window.setTimeout(() => {
    showWelcome.value = false
    buildInfoTimer = window.setTimeout(() => { showBuildInfo.value = false }, 5000)
  }, reducedMotion ? 150 : 1000)
})
onUnmounted(() => {
  window.clearTimeout(enterTimer)
  window.clearTimeout(buildInfoTimer)
})

// 桌面壁纸与全局图标风格、液态玻璃质感 CSS 变量
const desktopStyle = computed(() => {
  return {
    background: wallpaperCss(theme.wallpaper, theme.customImage),
    ...glassVars(theme.glassTint)
  }
})

const statusThemeColor = computed(() => {
  if (showWelcome.value) return '#f7f8fa'
  if (activeApp.value?.id === 'chat') return '#fffdf7'
  if (activeApp.value?.id === 'beautify') return '#ffffff'
  if (activeApp.value?.id === 'chat') return '#f0f0f0'
  if (activeApp.value?.id === 'character') return '#fbfaf8'
  if (activeApp.value?.id === 'settings') return '#fafafa'
  return '#ffffff'
})

watch(statusThemeColor, (color) => {
  document.querySelectorAll('meta[name="theme-color"]').forEach((meta) => meta.setAttribute('content', color))
}, { immediate: true })
</script>

<template>
  <transition name="welcome-screen">
    <section v-if="showWelcome" class="welcome-screen" aria-label="JY Archive 正在启动" role="status">
      <svg class="welcome-mark" viewBox="0 0 88 72" fill="none" aria-hidden="true">
        <path class="mark-j" d="M16 15H37V45C37 54 32 59 24 59C16 59 11 54 11 47" />
        <path class="mark-y" d="M48 15L62 36L76 15M62 36V59" />
      </svg>
    </section>
  </transition>
  <main
    class="desktop"
    :inert="showWelcome || showUpdatePrompt"
    :class="{
      'glass-widgets-on': theme.widgetGlass,
      'glass-icons-on': theme.iconGlass,
      'has-open-app': Boolean(activeApp)
    }"
    :style="desktopStyle"
  >
    <HomeGrid :apps="homeApps" />
    <AppDock :apps="dockApps" />
    <footer v-if="showBuildInfo" class="app-build-info" aria-label="应用版本信息">版本 {{ appVersion }} · 构建于 {{ new Date(appBuildTime).toLocaleString('zh-CN') }}</footer>
  </main>
  <component :is="activeApp.page" v-if="activeApp" @close="closeApp" />
  <div v-if="chatErrorDialog" class="chat-error-backdrop" role="presentation" @click.self="chatErrorDialog = null"><section class="chat-error-card" role="alertdialog" aria-modal="true" aria-labelledby="chat-error-title"><div class="chat-error-mark" aria-hidden="true">!</div><div class="chat-error-eyebrow">CHAT REPLY FAILED</div><h2 id="chat-error-title">这次回复没有成功</h2><p class="chat-error-context">{{ chatErrorDialog.chatName }} · {{ chatErrorDialog.time }}</p><div class="chat-error-field"><span>错误码</span><strong>{{ chatErrorDialog.code }}</strong></div><div class="chat-error-field chat-error-message"><span>错误信息</span><pre>{{ chatErrorDialog.message }}</pre></div><div class="chat-error-actions"><button type="button" class="chat-error-close" @click="chatErrorDialog = null">关闭</button><button type="button" class="chat-error-copy" @click="copyChatError">{{ chatErrorDialog.copied ? '已复制' : '复制错误详情' }}</button></div><p class="chat-error-footnote">复制内容包含错误码、错误信息、聊天对象和发生时间，可直接发给 AI 协助排查。</p></section></div>
  <div v-if="showUpdatePrompt && !showWelcome" class="update-backdrop">
    <section class="update-dialog" role="alertdialog" aria-modal="true" aria-labelledby="update-title" aria-describedby="update-description">
      <h2 id="update-title">发现应用更新</h2>
      <p id="update-description">当前版本 {{ appVersion }}（{{ new Date(appBuildTime).toLocaleString('zh-CN') }}）发现新版本已就绪。点击后将激活新代码并重新加载应用。</p>
      <button type="button" class="update-reload" @click="reloadWithLatestVersion">重新加载并更新</button>
    </section>
  </div>
</template>

<style scoped>
.chat-error-backdrop{position:fixed;inset:0;z-index:300;display:grid;place-items:center;padding:20px;box-sizing:border-box;background:rgba(34,42,37,.28);backdrop-filter:blur(11px);-webkit-backdrop-filter:blur(11px);animation:chat-error-fade .18s ease-out}.chat-error-card{width:min(520px,100%);max-height:calc(100dvh - 40px);overflow:auto;box-sizing:border-box;padding:32px;border:1px solid rgba(255,255,255,.9);border-radius:28px;background:#fff;color:#28312c;box-shadow:0 28px 90px rgba(25,40,31,.2);animation:chat-error-rise .24s cubic-bezier(.2,.8,.2,1)}.chat-error-mark{width:42px;height:42px;display:grid;place-items:center;border-radius:15px;background:#fff1ed;color:#dc775c;font-size:24px;font-weight:700}.chat-error-eyebrow{margin-top:19px;color:#98a79d;font-size:10px;font-weight:700;letter-spacing:.18em}.chat-error-card h2{margin:7px 0 0;font-size:25px;letter-spacing:-.04em}.chat-error-context{margin:8px 0 23px;color:#8a968e;font-size:13px}.chat-error-field{margin-top:12px;padding:14px 16px;border:1px solid #edf0ed;border-radius:15px;background:#fafcfb}.chat-error-field>span{display:block;margin-bottom:7px;color:#8d9991;font-size:11px}.chat-error-field strong{display:block;overflow-wrap:anywhere;color:#49574e;font:600 14px/1.5 ui-monospace,SFMono-Regular,Consolas,monospace}.chat-error-message pre{max-height:190px;overflow:auto;margin:0;white-space:pre-wrap;overflow-wrap:anywhere;color:#4e5a52;font:13px/1.65 ui-monospace,SFMono-Regular,Consolas,monospace}.chat-error-actions{display:flex;gap:10px;margin-top:22px}.chat-error-actions button{flex:1;min-height:46px;border:1px solid #e8ece9;border-radius:15px;background:#fff;color:#59665e;font-size:14px;font-weight:600;cursor:pointer}.chat-error-actions .chat-error-copy{border-color:#bcd1c3;background:#eaf3ed;color:#385747}.chat-error-footnote{margin:13px 0 0;color:#9aa49d;font-size:11px;line-height:1.6}@keyframes chat-error-fade{from{opacity:0}to{opacity:1}}@keyframes chat-error-rise{from{opacity:0;transform:translateY(10px) scale(.98)}to{opacity:1;transform:translateY(0) scale(1)}}@media(max-width:520px){.chat-error-backdrop{padding:14px}.chat-error-card{padding:25px 21px;border-radius:24px}}
.welcome-screen {
  position: fixed;
  inset: 0;
  z-index: 200;
  display: grid;
  place-items: center;
  background: #f7f8fa;
}

.welcome-mark {
  width: 76px;
  height: auto;
  overflow: visible;
  stroke-width: 4;
  stroke-linecap: round;
  stroke-linejoin: round;
  animation: mark-arrive 450ms cubic-bezier(.22, 1, .36, 1) 180ms both;
}

.mark-j { stroke: #565c65; }
.mark-y { stroke: #8d9eaf; }

.welcome-screen-leave-active {
  transition: opacity 250ms ease-out;
}

.welcome-screen-leave-to {
  opacity: 0;
}

@keyframes mark-arrive {
  from { opacity: 0; transform: translateY(4px); }
  to { opacity: 1; transform: translateY(0); }
}

.app-build-info {
  position: fixed;
  right: 10px;
  bottom: calc(env(safe-area-inset-bottom, 0px) + 3px);
  z-index: 2;
  color: #8b919a;
  font-size: 10px;
  line-height: 1.3;
  pointer-events: none;
}

.update-backdrop {
  position: fixed;
  inset: 0;
  z-index: 210;
  display: grid;
  place-items: center;
  padding: 24px;
  background: #343b482e;
  backdrop-filter: blur(5px);
}

.update-dialog {
  width: min(100%, 340px);
  padding: 28px 24px 24px;
  border: 1px solid #e8ebef;
  border-radius: 20px;
  color: #565c65;
  background: #f7f8fa;
  box-shadow: 0 12px 48px #343b4814;
  text-align: center;
}

.update-dialog h2 { margin: 0 0 10px; font-size: 18px; font-weight: 600; }
.update-dialog p { margin: 0 0 24px; color: #727983; font-size: 13px; line-height: 1.7; }
.update-reload {
  width: 100%;
  min-height: 44px;
  border: 0;
  border-radius: 12px;
  color: #fff;
  background: #565f6c;
  font: inherit;
  font-size: 14px;
  cursor: pointer;
}
.update-reload:focus-visible { outline: 2px solid #8d9eaf; outline-offset: 4px; }

@media (prefers-reduced-motion: reduce) {
  .welcome-mark { animation: none; }
  .welcome-screen-leave-active { transition: none; }
}

/* 桌面整体：无边框，铺满屏幕 */
.desktop {
  position: fixed;
  inset: 0;
  display: flex;
  flex-direction: column;
  height: 100vh;
  min-height: 100vh;
  box-sizing: border-box;
  padding-top: calc(env(safe-area-inset-top, 0px) + 5vh);
  padding-bottom: calc(env(safe-area-inset-bottom, 0px) + 12px);
  background: #ffffff;
  transition: background-image 0.3s ease, background-color 0.3s ease;
}

.desktop.has-open-app {
  background: #fbfaf8;
}


</style>
