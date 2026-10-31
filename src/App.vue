<script setup>
import { computed, ref, watch } from 'vue'
import HomeGrid from '@/components/HomeGrid.vue'
import AppDock from '@/components/AppDock.vue'
import { dockApps, homeApps } from '@/apps'
import { activeApp, closeApp } from '@/stores/desktop'
import { theme, wallpaperCss, iconStyleVars, glassVars } from '@/stores/theme'

const showWelcome = ref(true)
const entering = ref(false)
let enterTimer
function enterDesktop() {
  if (entering.value) return
  entering.value = true
  enterTimer = window.setTimeout(() => { showWelcome.value = false }, 620)
}

// 桌面壁纸与全局图标风格、液态玻璃质感 CSS 变量
const desktopStyle = computed(() => {
  return {
    background: wallpaperCss(theme.wallpaper, theme.customImage),
    ...iconStyleVars(theme.iconStyle),
    ...glassVars(theme.glassTint)
  }
})

const statusThemeColor = computed(() => {
  if (showWelcome.value || activeApp.value?.id === 'beautify') return '#f8f7f2'
  if (activeApp.value?.id === 'chat') return '#f0f0f0'
  if (activeApp.value?.id === 'character') return '#fbfaf8'
  if (activeApp.value?.id === 'settings') return '#ffffff'
  return '#ffffff'
})

watch(statusThemeColor, (color) => {
  document.querySelectorAll('meta[name="theme-color"]').forEach((meta) => meta.setAttribute('content', color))
}, { immediate: true })
</script>

<template>
  <transition name="welcome-screen">
    <section v-if="showWelcome" class="welcome-screen" :class="{ entering }" :style="desktopStyle" aria-label="欢迎进入 JY Archive">
      <div class="welcome-wash" />
      <div class="welcome-content">
        <span class="welcome-eyebrow">A LITTLE PLACE OF YOUR OWN</span>
        <div class="welcome-mark" aria-hidden="true"><span>j.</span><i /></div>
        <p class="welcome-kicker">JY · ARCHIVE</p>
        <h1>把日常，<br />慢慢收进来。</h1>
        <p class="welcome-caption">一些喜欢的人，一些想记住的瞬间。</p>
        <button class="welcome-enter" type="button" aria-label="进入应用" @click="enterDesktop">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M13 5l7 7-7 7" /></svg>
        </button>
        <span class="welcome-enter-label">点击进入</span>
      </div>
      <span class="welcome-footer">YOUR DAYS, KEPT GENTLY</span>
    </section>
  </transition>
  <main
    v-show="!showWelcome"
    class="desktop"
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
  <transition name="app-open">
    <component :is="activeApp.page" v-if="activeApp" @close="closeApp" />
  </transition>
</template>

<style scoped>
.welcome-screen{position:fixed;inset:0;z-index:200;display:grid;place-items:center;overflow:hidden;color:#373733;background-position:center;background-size:cover;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI","PingFang SC",sans-serif}.welcome-screen:before{content:"";position:absolute;inset:-24px;background:inherit;filter:blur(22px) saturate(.72);transform:scale(1.08)}.welcome-wash{position:absolute;inset:0;background:linear-gradient(155deg,#f8f7f2 0%,#eeece6 52%,#e5e2d9 100%)}.welcome-content{position:relative;z-index:1;width:min(84vw,390px);display:flex;flex-direction:column;align-items:center;text-align:center;animation:welcome-rise .75s cubic-bezier(.2,.75,.25,1) both}.welcome-eyebrow,.welcome-footer{color:#9d988e;font-size:8px;letter-spacing:.23em}.welcome-mark{width:75px;height:75px;position:relative;display:grid;place-items:center;margin:43px 0 25px;border:1px solid #ffffffd9;border-radius:25px;color:#747366;background:linear-gradient(145deg,#ffffffb8,#f0eee8a8);box-shadow:0 16px 45px #615d4b14;rotate:-5deg}.welcome-mark span{font-family:Georgia,serif;font-size:37px;font-style:italic;letter-spacing:-.12em;translate:-2px 0}.welcome-mark i{width:7px;height:7px;position:absolute;right:16px;top:17px;border-radius:50%;background:#c8a899}.welcome-kicker{margin:0 0 15px;color:#aaa397;font-size:9px;letter-spacing:.22em}.welcome-content h1{margin:0;color:#47463f;font-size:clamp(31px,8vw,40px);font-weight:550;line-height:1.38;letter-spacing:.08em}.welcome-caption{margin:13px 0 35px;color:#98948b;font-size:11px;letter-spacing:.04em}.welcome-enter{width:54px;height:54px;display:grid;place-items:center;border:1px solid #ffffffed;border-radius:50%;color:#55564f;background:#ffffffb8;box-shadow:0 8px 25px #625c4e15;cursor:pointer;animation:enter-breathe 2.2s ease-in-out infinite}.welcome-enter svg{width:21px;fill:none;stroke:currentColor;stroke-width:1.6;stroke-linecap:round;stroke-linejoin:round}.welcome-enter:active{transform:scale(.92)}.welcome-enter:focus-visible{outline:2px solid #999486;outline-offset:4px}.welcome-enter-label{margin-top:10px;color:#918c82;font-size:10px;letter-spacing:.08em}.welcome-footer{position:absolute;z-index:1;bottom:calc(env(safe-area-inset-bottom) + 24px)}.welcome-screen.entering .welcome-content{animation:welcome-exit .58s cubic-bezier(.55,0,.8,.3) both}.welcome-screen-enter-active,.welcome-screen-leave-active{transition:opacity .62s ease}.welcome-screen-leave-to{opacity:0}@keyframes welcome-rise{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}@keyframes welcome-exit{to{opacity:0;transform:translateY(-22px) scale(.97)}}@keyframes enter-breathe{0%,100%{box-shadow:0 8px 25px #625c4e15}50%{box-shadow:0 8px 30px #625c4e2c}}@media(prefers-reduced-motion:reduce){.welcome-content,.welcome-enter{animation:none!important}.welcome-screen-enter-active,.welcome-screen-leave-active{transition-duration:.01ms}}
.app-open-enter-active,
.app-open-leave-active {
  transition: opacity 0.25s cubic-bezier(0.16, 1, 0.3, 1), transform 0.25s cubic-bezier(0.16, 1, 0.3, 1);
}
.app-open-enter-from,
.app-open-leave-to {
  opacity: 0;
  transform: scale(0.96);
}
</style>

<style scoped>
/* 桌面整体：无边框，铺满屏幕 */
.desktop {
  position: fixed;
  inset: 0;
  display: flex;
  flex-direction: column;
  height: 100dvh;
  padding-top: calc(env(safe-area-inset-top) + 5vh);
  padding-bottom: calc(env(safe-area-inset-bottom) + 12px);
  background: #ffffff;
  transition: background-image 0.3s ease, background-color 0.3s ease;
}

.desktop.has-open-app {
  background: #fbfaf8;
}
</style>
