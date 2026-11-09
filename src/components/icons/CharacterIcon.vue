<template>
  <!-- 人物应用图标：柔和线条头像与肩部轮廓 -->
  <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <rect class="bg" width="100" height="100" />
    <circle class="line" cx="50" cy="39" r="14" />
    <path class="line" d="M23 77c2.5-14 12.7-22 27-22s24.5 8 27 22" />
    <path class="accent" d="M69 25c.7 4.4 1.8 5.5 6.2 6.2-4.4.7-5.5 1.8-6.2 6.2-.7-4.4-1.8-5.5-6.2-6.2 4.4-.7 5.5-1.8 6.2-6.2z" />
  </svg>
</template>

<style scoped>
.bg { fill: var(--icon-art-bg, var(--icon-bg, #ffffff)); }
.line { fill: none; stroke: var(--icon-fg, #2e2e33); stroke-width: 3.4; stroke-linecap: round; }
.accent { fill: var(--icon-fg, #2e2e33); opacity: .48; }
</style>
