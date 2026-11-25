<script setup>
import PhoneIcon from '@/components/phone/PhoneIcon.vue'
// 仿 iOS 相机：黑色界面、取景框、变焦、模式条、快门。网页没有真实取景，画面是示意图。
// 左下角缩略图是相册里最新的一张，点它打开相册。
import { computed, ref } from 'vue'
import { tileOf } from '@/components/phone/photoTile'

const props = defineProps({
  // 角色手机相册里的照片，和相册页用同一份数据
  photos: { type: Array, default: () => [] }
})
const emit = defineEmits(['back', 'open-photos'])

const MODES = ['慢动作', '延时', '照片', '视频', '人像']
const mode = ref('照片')
const flash = ref(false)
let flashTimer = 0

const latestIndex = computed(() => props.photos.length - 1)
const latest = computed(() => (latestIndex.value >= 0 ? props.photos[latestIndex.value] : null))

function shoot() {
  flash.value = true
  window.clearTimeout(flashTimer)
  flashTimer = window.setTimeout(() => { flash.value = false }, 160)
}
</script>

<template>
  <div class="cam">
    <header class="cam-top">
      <button type="button" class="cam-back" aria-label="返回" @click="emit('back')"><PhoneIcon name="back" :size="28" /></button>
      <span class="cam-flash"><PhoneIcon name="flash" :size="20" /></span>
      <span class="cam-live"><PhoneIcon name="live" :size="22" /></span>
    </header>

    <div class="cam-view">
      <div class="cam-scene"></div>
      <div class="cam-grid" aria-hidden="true"><span></span><span></span></div>
      <span class="cam-zoom">1×</span>
      <div class="cam-flash-layer" :class="{ 'is-on': flash }" aria-hidden="true"></div>
    </div>

    <div class="cam-modes" role="tablist">
      <button
        v-for="m in MODES"
        :key="m"
        type="button"
        class="cam-mode"
        :class="{ 'is-on': mode === m }"
        @click="mode = m"
      >{{ m }}</button>
    </div>

    <footer class="cam-bottom">
      <button
        type="button"
        class="cam-thumb"
        :class="{ 'is-empty': !latest }"
        :disabled="!latest"
        :aria-label="latest ? `打开相册，最新照片：${latest.title}` : '相册还是空的'"
        :style="latest ? { background: tileOf(latestIndex) } : {}"
        @click="emit('open-photos')"
      >
        <span v-if="!latest" class="cam-thumb-empty"></span>
      </button>
      <button type="button" class="cam-shutter" aria-label="拍照" @click="shoot"><span></span></button>
      <span class="cam-flip"><PhoneIcon name="flip" :size="26" /></span>
    </footer>
  </div>
</template>

<style scoped>
.cam { height: 100%; display: flex; flex-direction: column; background: #000; color: #fff; font-family: -apple-system, BlinkMacSystemFont, 'PingFang SC', sans-serif; overflow: hidden; }
.cam-top { flex: none; display: flex; align-items: center; justify-content: space-between; min-height: 44px; padding: 0 16px; }
.cam-back { border: 0; background: none; color: #ffd60a; font-size: 30px; line-height: 1; cursor: pointer; padding: 0; }
.cam-flash, .cam-live { color: #ffd60a; font-size: 18px; }
.cam-view { position: relative; flex: 1; margin: 0 10px; border-radius: 18px; overflow: hidden; background: #111; }
.cam-scene { position: absolute; inset: 0; background: linear-gradient(180deg, #6b7a8f 0%, #b8c2cf 45%, #d8d1c4 60%, #7d7468 100%); }
.cam-grid { position: absolute; inset: 0; pointer-events: none; }
.cam-grid span { position: absolute; background: rgba(255, 255, 255, .25); }
.cam-grid span:nth-child(1) { left: 33.3%; top: 0; bottom: 0; width: 1px; }
.cam-grid span:nth-child(2) { top: 33.3%; left: 0; right: 0; height: 1px; }
.cam-zoom { position: absolute; left: 50%; bottom: 14px; transform: translateX(-50%); padding: 4px 10px; border-radius: 999px; background: rgba(0, 0, 0, .35); color: #ffd60a; font-size: 13px; }
.cam-flash-layer { position: absolute; inset: 0; background: #fff; opacity: 0; pointer-events: none; transition: opacity .16s; }
.cam-flash-layer.is-on { opacity: .85; }
.cam-modes { flex: none; display: flex; justify-content: center; gap: 16px; padding: 14px 0 6px; }
.cam-mode { border: 0; background: none; color: rgba(255, 255, 255, .6); font: inherit; font-size: 13px; cursor: pointer; padding: 4px 2px; }
.cam-mode.is-on { color: #ffd60a; font-weight: 600; }
.cam-bottom { flex: none; display: grid; grid-template-columns: 1fr auto 1fr; align-items: center; padding: 10px 28px calc(env(safe-area-inset-bottom) + 22px); }
/* 缩略图：相册最新一张的渐变色，点开相册 */
.cam-thumb { justify-self: start; width: 44px; height: 44px; padding: 0; border: 2px solid #fff; border-radius: 8px; cursor: pointer; overflow: hidden; background: #3a3a3c; }
.cam-thumb:disabled { cursor: default; }
.cam-thumb.is-empty { border-color: #3a3a3c; }
.cam-thumb-empty { display: block; width: 100%; height: 100%; }
.cam-flip { justify-self: end; font-size: 26px; color: #fff; }
.cam-shutter { width: 74px; height: 74px; border: 4px solid #fff; border-radius: 50%; background: none; padding: 0; cursor: pointer; display: grid; place-items: center; box-sizing: border-box; }
.cam-shutter span { width: 60px; height: 60px; border-radius: 50%; background: #fff; }
.cam-shutter:active span { background: #d1d1d6; }
</style>
