<script setup>
import { computed } from 'vue'
import { openApp } from '@/stores/desktop'
import { theme } from '@/stores/theme'

const props = defineProps({
  // { id, name, icon, page? }
  app: { type: Object, required: true },
  // 是否启用液态玻璃质感（未传则跟随全局设置）
  glass: { type: Boolean, default: null }
})

const isGlass = computed(() => {
  return props.glass !== null ? props.glass : theme.iconGlass
})

const customIcon = computed(() => {
  return theme.customIcons?.[props.app.id] || null
})
</script>

<template>
  <div class="app" :data-app="app.id" @click="openApp(app)">
    <div class="app-icon" :class="{ 'is-glass': isGlass }">
      <img
        v-if="customIcon"
        :src="customIcon"
        :alt="app.name"
        class="custom-icon-img"
      />
      <component :is="app.icon" v-else />
    </div>
    <span class="app-name" :class="{ 'glass-text': isGlass }">{{ app.name }}</span>
  </div>
</template>

<style scoped>
.app {
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
