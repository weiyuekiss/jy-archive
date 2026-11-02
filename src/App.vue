<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import HomeGrid from '@/components/HomeGrid.vue'
import AppDock from '@/components/AppDock.vue'
import { dockApps, homeApps } from '@/apps'
import { activeApp, closeApp } from '@/stores/desktop'
import { theme, wallpaperCss, iconStyleVars, glassVars } from '@/stores/theme'
import { checkForAppUpdate, reloadWithLatestVersion, updateAvailable } from '@/pwa'

const showWelcome = ref(true)
const showUpdatePrompt = computed(() => updateAvailable.value)
let enterTimer

onMounted(() => {
  void checkForAppUpdate()
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  enterTimer = window.setTimeout(() => { showWelcome.value = false }, reducedMotion ? 150 : 1000)
})
onUnmounted(() => window.clearTimeout(enterTimer))

// 桌面壁纸与全局图标风格、液态玻璃质感 CSS 变量
const desktopStyle = computed(() => {
  return {
    background: wallpaperCss(theme.wallpaper, theme.customImage),
    ...iconStyleVars(theme.iconStyle),
    ...glassVars(theme.glassTint)
  }
})

const statusThemeColor = computed(() => {
  if (showWelcome.value) return '#f7f8fa'
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
  </main>
  <component :is="activeApp.page" v-if="activeApp" @close="closeApp" />
  <div v-if="showUpdatePrompt && !showWelcome" class="update-backdrop">
    <section class="update-dialog" role="alertdialog" aria-modal="true" aria-labelledby="update-title" aria-describedby="update-description">
      <h2 id="update-title">发现应用更新</h2>
      <p id="update-description">新版本已就绪，重新加载即可更新。</p>
      <button type="button" class="update-reload" @click="reloadWithLatestVersion">重新加载并更新</button>
    </section>
  </div>
</template>

<style scoped>
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
  padding-top: calc(env(safe-area-inset-top) + 5vh);
  padding-bottom: calc(env(safe-area-inset-bottom) + 12px);
  background: #ffffff;
  transition: background-image 0.3s ease, background-color 0.3s ease;
}

.desktop.has-open-app {
  background: #fbfaf8;
}
</style>
