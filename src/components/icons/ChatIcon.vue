<template>
  <!-- 聊天应用图标：柔和线条对话气泡与小爱心 -->
  <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <rect class="bg" width="100" height="100" />
    <path class="bubble" d="M25 31a9 9 0 0 1 9-9h34a9 9 0 0 1 9 9v23a9 9 0 0 1-9 9H48L34 75v-12a9 9 0 0 1-9-9V31z" />
    <path class="heart" d="M50 51s-10-6.2-10-12.2a5.6 5.6 0 0 1 10-3.4 5.6 5.6 0 0 1 10 3.4C60 44.8 50 51 50 51z" />
    <circle class="dot" cx="37" cy="43" r="2" />
    <circle class="dot" cx="63" cy="43" r="2" />
  </svg>
</template>

<style scoped>
.bg { fill: var(--icon-art-bg, var(--icon-bg, #ffffff)); }
.bubble { fill: none; stroke: var(--icon-fg, #2e2e33); stroke-width: 3.2; stroke-linecap: round; stroke-linejoin: round; }
.heart { fill: var(--icon-fg, #2e2e33); }
.dot { fill: var(--icon-fg, #2e2e33); opacity: .42; }
</style>
