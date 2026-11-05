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
      <AppIcon v-if="props.apps[i - 1]" :app="props.apps[i - 1]" frosted />
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
  background: rgba(245, 246, 248, 0.24);
  -webkit-backdrop-filter: blur(28px) saturate(140%);
  backdrop-filter: blur(28px) saturate(140%);
  border: 0;
  box-shadow: 0 8px 24px rgba(35, 42, 52, 0.06);
}

.dock-slot {
  display: flex;
  justify-content: center;
  align-items: center;
}
</style>
