<script setup>
import { computed } from 'vue'
import SolidAppIcon from './icons/SolidAppIcon.vue'
import { openApp } from '@/stores/desktop'
import { theme } from '@/stores/theme'

const props = defineProps({
  // { id, name, icon, page? }
  app: { type: Object, required: true },
  // 是否启用液态玻璃质感（未传则跟随全局设置）
  glass: { type: Boolean, default: null },
  frosted: { type: Boolean, default: false }
})

const isGlass = computed(() => {
  return props.glass !== null ? props.glass : theme.iconGlass
})

const customIcon = computed(() => {
  return theme.customIcons?.[props.app.id] || null
})
</script>

<template>
  <button class="app" type="button" :data-app="app.id" :aria-label="app.pending ? `${app.name}，敬请期待` : app.name" :aria-disabled="app.pending || undefined" @click="openApp(app)">
    <div class="app-icon" :class="{ 'is-glass': isGlass && !frosted, 'is-frosted': frosted }">
      <SolidAppIcon v-if="frosted" :name="app.id" />
      <img
        v-else-if="customIcon"
        :src="customIcon"
        :alt="app.name"
        class="custom-icon-img"
      />
      <component :is="app.icon" v-else />
    </div>
    <span class="app-name" :class="{ 'glass-text': isGlass }">{{ app.name }}</span>
  </button>
</template>

<style scoped>
.app {
  border: 0;
  padding: 0;
  background: transparent;
  font: inherit;
  -webkit-tap-highlight-color: transparent;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  transition: transform 0.15s ease;
}
.app:active {
  transform: scale(0.92);
}

.app-icon {
  position: relative;
  width: var(--icon-size);
  height: var(--icon-size);
  border-radius: var(--icon-radius);
  overflow: hidden;
  background: var(--icon-bg, #ffffff);
  color: var(--icon-fg, #2e2e33);
  box-shadow: var(--icon-shadow, 0 4px 14px rgba(40, 40, 50, 0.08));
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.35s ease, color 0.3s ease, box-shadow 0.3s ease, border-color 0.3s ease, transform 0.2s ease;
}

/* ===== 液态玻璃质感化 ===== */
.app-icon.is-glass {
  background: var(--glass-icon-bg, linear-gradient(135deg, rgba(255, 255, 255, 0.68) 0%, rgba(255, 255, 255, 0.24) 100%));
  -webkit-backdrop-filter: blur(20px) saturate(190%) brightness(106%);
  backdrop-filter: blur(20px) saturate(190%) brightness(106%);
  border: 1px solid var(--glass-border, rgba(255, 255, 255, 0.82));
  box-shadow:
    0 10px 24px rgba(0, 0, 0, 0.07),
    inset 0 1.5px 2px rgba(255, 255, 255, 0.95),
    inset 0 -1.5px 2px rgba(255, 255, 255, 0.3);
  --icon-art-bg: transparent;
}

/* 顶部水润弧面反光 */
.app-icon.is-glass::before {
  content: '';
  position: absolute;
  top: 1px;
  left: 2px;
  right: 2px;
  height: 46%;
  border-radius: inherit;
  border-bottom-left-radius: 45% 60%;
  border-bottom-right-radius: 45% 60%;
  background: linear-gradient(180deg, var(--glass-sheen, rgba(255, 255, 255, 0.75)) 0%, rgba(255, 255, 255, 0.05) 100%);
  pointer-events: none;
  z-index: 2;
}

/* 底部微折射透光点 */
.app-icon.is-glass::after {
  content: '';
  position: absolute;
  bottom: 2px;
  left: 16%;
  right: 16%;
  height: 24%;
  border-radius: 50%;
  background: radial-gradient(ellipse at center, rgba(255, 255, 255, 0.45) 0%, rgba(255, 255, 255, 0) 70%);
  pointer-events: none;
  z-index: 2;
}

.app-icon :deep(svg) {
  width: 100%;
  height: 100%;
  display: block;
}

.app-icon.is-glass :deep(svg) {
  filter: drop-shadow(0 2px 5px rgba(40, 40, 50, 0.12));
}

.app-icon.is-frosted {
  background: linear-gradient(145deg, rgba(255, 255, 255, 0.72), rgba(255, 255, 255, 0.38));
  border: 1px solid rgba(255, 255, 255, 0.85);
  color: #454850;
  -webkit-backdrop-filter: blur(18px) saturate(130%);
  backdrop-filter: blur(18px) saturate(130%);
  box-shadow: 0 5px 18px rgba(55, 65, 80, 0.09), inset 0 1px 2px rgba(255, 255, 255, 0.95);
}
.app-icon.is-frosted :deep(svg) {
  width: 45%;
  height: 45%;
}

.custom-icon-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.app-name {
  font-size: 12px;
  color: #333333;
  line-height: 1.2;
  font-weight: 450;
  letter-spacing: 0.02em;
  transition: color 0.25s ease, text-shadow 0.25s ease;
}

.app-name.glass-text {
  color: #2b2b2e;
  text-shadow: 0 1px 2px rgba(255, 255, 255, 0.85);
}
</style>
