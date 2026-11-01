<script setup>
import { computed, ref, watch } from 'vue'
import HomeGrid from '@/components/HomeGrid.vue'
import AppDock from '@/components/AppDock.vue'
import { dockApps, homeApps } from '@/apps'
import { activeApp, closeApp } from '@/stores/desktop'
import { theme, wallpaperCss, iconStyleVars, glassVars } from '@/stores/theme'
import { checkForAppUpdate, reloadWithLatestVersion, updateAvailable } from '@/pwa'

const showWelcome = ref(true)
const entering = ref(false)
const showUpdatePrompt = ref(false)
let enterTimer
watch(showWelcome, (visible) => {
  if (!visible || !updateAvailable.value) return
  showUpdatePrompt.value = true
})
watch(() => updateAvailable.value, (available) => {
  if (available && showWelcome.value) showUpdatePrompt.value = true
})
function enterDesktop() {
  if (entering.value || showUpdatePrompt.value) return
  checkForAppUpdate()
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
  if (showWelcome.value) return '#17162c'
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
    <section v-if="showWelcome" class="welcome-screen" :class="{ entering }" :style="desktopStyle" aria-label="欢迎进入 JY Archive">
      <div class="pixel-scene" aria-hidden="true">
        <div class="pixel-sky"><i class="pixel-star star-a">✦</i><i class="pixel-star star-b">✧</i><i class="pixel-star star-c">✦</i></div>
        <div class="pixel-ground"></div>
        <div class="pixel-star-target">★</div>
        <div class="pixel-person">
          <svg viewBox="0 0 32 40" shape-rendering="crispEdges">
            <rect x="10" y="1" width="12" height="4" fill="#3e385d"/><rect x="6" y="5" width="20" height="12" fill="#f2c6a6"/><rect x="6" y="5" width="4" height="8" fill="#3e385d"/><rect x="22" y="5" width="4" height="8" fill="#3e385d"/><rect x="10" y="10" width="3" height="3" fill="#3e385d"/><rect x="20" y="10" width="3" height="3" fill="#3e385d"/><rect x="11" y="17" width="10" height="3" fill="#d88e9d"/><rect x="7" y="20" width="18" height="11" fill="#8298c8"/><rect x="2" y="21" width="5" height="4" fill="#f2c6a6"/><rect x="25" y="21" width="5" height="4" fill="#f2c6a6"/><rect x="10" y="31" width="5" height="7" fill="#3e385d"/><rect x="19" y="31" width="5" height="7" fill="#3e385d"/><path d="M16 20c-1-2-5-1-4 2 1 2 4 4 4 4s3-2 4-4c1-3-3-4-4-2" fill="#ed8292"/>
          </svg>
        </div>
        <div class="pixel-title"><span>JY ARCHIVE</span><small>YOUR LITTLE WORLD</small></div>
      </div>
      <div class="welcome-content">
        <span class="welcome-eyebrow">A LITTLE PLACE OF YOUR OWN</span>
        <h1>把日常，慢慢收进来。</h1>
        <p class="welcome-caption">一些喜欢的人，一些想记住的瞬间。</p>
        <button class="welcome-enter" type="button" aria-label="进入应用" @click="enterDesktop"><span>START</span></button>
      </div>
      <div v-if="showUpdatePrompt" class="update-backdrop" role="presentation">
        <section class="update-dialog" role="alertdialog" aria-modal="true" aria-labelledby="update-title">
          <span class="welcome-eyebrow">JY · ARCHIVE</span>
          <h2 id="update-title">发现应用更新</h2>
          <p>检测到新版程序已就绪。点击重新加载并清除旧版本缓存，进入最新应用。</p>
          <button type="button" class="update-reload" @click="reloadWithLatestVersion">重新加载并更新</button>
        </section>
      </div>
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
  <component :is="activeApp.page" v-if="activeApp" @close="closeApp" />
</template>

<style scoped>
.welcome-screen{position:fixed;inset:0;z-index:200;display:grid;place-items:center;overflow:hidden;color:#f8f0df;background:#17162c;font-family:ui-monospace,SFMono-Regular,Consolas,monospace}.welcome-screen:before{content:"";position:absolute;inset:0;background:radial-gradient(ellipse at 50% 42%,#37365b 0%,#20203a 43%,#141426 100%)}.pixel-scene{position:absolute;top:10%;left:0;width:100%;height:48%;overflow:hidden}.pixel-sky{position:absolute;inset:0}.pixel-star{position:absolute;color:#fff1a8;text-shadow:0 0 12px #ffe68b;font-style:normal;animation:twinkle 1.5s steps(2,end) infinite}.star-a{top:12%;left:18%;font-size:23px}.star-b{top:30%;right:18%;font-size:28px;animation-delay:.4s}.star-c{top:8%;right:33%;font-size:14px;animation-delay:.8s}.pixel-ground{position:absolute;bottom:12%;left:0;width:100%;height:7px;background:repeating-linear-gradient(90deg,#5c547f 0 12px,#77709a 12px 18px);box-shadow:0 9px 0 #292741}.pixel-person{position:absolute;left:calc(50% - 150px);bottom:calc(12% + 7px);width:38px;height:49px;animation:pixel-walk 3s steps(1,end) infinite}.pixel-person svg{width:100%;height:100%;image-rendering:pixelated;filter:drop-shadow(3px 4px 0 #17162c)}.pixel-star-target{position:absolute;left:calc(50% + 50px);bottom:calc(12% + 4px);color:#ffdc76;font-size:42px;line-height:1;text-shadow:0 0 14px #ffc85a;animation:star-impact 3s steps(1,end) infinite}.pixel-title{position:absolute;left:50%;bottom:2%;display:flex;flex-direction:column;align-items:center;gap:5px;opacity:0;transform:translate(-50%,12px) scale(.7);animation:title-appear 3s steps(1,end) infinite}.pixel-title span{color:#ffe19a;font-weight:900;font-size:clamp(21px,7vw,30px);letter-spacing:.12em;text-shadow:3px 3px 0 #5a416f,6px 6px 0 #111126}.pixel-title small{color:#aaa3d1;font-size:8px;letter-spacing:.3em}.welcome-content{position:absolute;z-index:1;bottom:10%;width:min(88vw,390px);display:flex;flex-direction:column;align-items:center;text-align:center;animation:welcome-rise .7s ease both}.welcome-eyebrow{color:#aaa3d1;font-size:8px;letter-spacing:.23em}.welcome-content h1{margin:0;color:#f5e9cf;font-size:clamp(20px,5vw,25px);font-weight:700;letter-spacing:.08em;text-shadow:2px 2px 0 #504873}.welcome-caption{margin:8px 0 17px;color:#b7b0ca;font-size:10px;letter-spacing:.04em}.welcome-enter{min-width:120px;height:42px;padding:0 20px;border:2px solid #e9cd81;border-radius:0;color:#26213d;background:#f3dc99;box-shadow:4px 4px 0 #695886;cursor:pointer;font:700 12px ui-monospace,monospace;letter-spacing:.14em;image-rendering:pixelated;animation:pixel-button 1s steps(2,end) infinite}.welcome-enter:active{transform:translate(3px,3px);box-shadow:1px 1px 0 #695886}.update-backdrop{position:absolute;inset:0;z-index:3;display:grid;place-items:center;padding:24px;background:#101020a8;backdrop-filter:blur(5px)}.update-dialog{width:min(100%,340px);padding:25px 22px;border:2px solid #e9cd81;border-radius:0;color:#f8f0df;background:#272641;box-shadow:6px 6px 0 #111126;text-align:center}.update-dialog h2{margin:12px 0 8px;font-size:20px}.update-dialog p{margin:0 0 19px;color:#c5bed8;font-size:12px;line-height:1.7}.update-reload{width:100%;height:42px;border:0;border-radius:0;color:#28223c;background:#f3dc99;font-weight:700;cursor:pointer}.welcome-screen.entering .welcome-content{animation:welcome-exit .58s steps(5,end) both}.welcome-screen-enter-active,.welcome-screen-leave-active{transition:opacity .45s steps(6,end)}.welcome-screen-leave-to{opacity:0}@keyframes welcome-rise{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}@keyframes welcome-exit{to{opacity:0;transform:translateY(-16px) scale(.95)}}@keyframes pixel-walk{0%,15%{transform:translateX(0) translateY(0)}20%{transform:translateX(65px) translateY(-8px)}40%{transform:translateX(130px) translateY(0)}60%{transform:translateX(195px) translateY(-8px)}72%{transform:translateX(225px) translateY(18px) rotate(70deg)}82%,100%{transform:translateX(225px) translateY(22px) rotate(90deg)}}@keyframes star-impact{0%,68%{transform:scale(1);filter:brightness(1)}72%{transform:scale(1.5);filter:brightness(1.8)}80%,100%{transform:scale(1.08);filter:brightness(1.2)}}@keyframes title-appear{0%,73%{opacity:0;transform:translate(-50%,12px) scale(.7)}80%,100%{opacity:1;transform:translate(-50%,0) scale(1)}}@keyframes twinkle{50%{opacity:.45;transform:scale(.75)}}@keyframes pixel-button{50%{box-shadow:4px 4px 0 #695886,0 0 12px #f3dc9940}}@media(prefers-reduced-motion:reduce){.welcome-content,.pixel-person,.pixel-star-target,.pixel-title,.pixel-star,.welcome-enter{animation:none!important}.welcome-screen-enter-active,.welcome-screen-leave-active{transition-duration:.01ms}}</style>

<style scoped>
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
