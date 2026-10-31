<script setup>
import AppIcon from './AppIcon.vue'
import { GRID_COLS } from '@/apps'

const props = defineProps({
  apps: { type: Array, default: () => [] }
})
</script>

<template>
  <!-- 底部 Dock 栏：4 个位置 -->
  <nav class="dock">
    <div v-for="i in GRID_COLS" :key="i" class="dock-slot">
      <AppIcon v-if="props.apps[i - 1]" :app="props.apps[i - 1]" />
    </div>
  </nav>
</template>

<style scoped>
.dock {
  margin: 0 4vw;
  padding: 12px calc(var(--side-pad) - 4vw);
  display: grid;
  grid-template-columns: repeat(var(--cols), 1fr);
  border-radius: 30px;
  background: rgba(240, 240, 245, 0.72);
  -webkit-backdrop-filter: blur(24px) saturate(190%);
  backdrop-filter: blur(24px) saturate(190%);
  border: 1px solid rgba(255, 255, 255, 0.65);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.04), inset 0 1px 1.5px rgba(255, 255, 255, 0.9);
}

.dock-slot {
  display: flex;
  justify-content: center;
  align-items: center;
}
</style>
