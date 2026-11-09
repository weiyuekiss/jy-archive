<template>
  <!-- 美化应用图标：白色底 + 深色线条调色盘。颜色取自 --icon-bg / --icon-fg，可随图标风格切换 -->
  <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <rect class="bg" width="100" height="100" />

    <!-- 调色盘轮廓 -->
    <path
      class="line"
      d="M50 27C35.6 27 25 37.4 25 50.5 25 63 34.8 73 46.5 73c4.1 0 6.1-2.4 6.1-5.4 0-2.2-1.2-3.3-1.2-5.3 0-2.7 2.2-4.7 4.9-4.7h5.2c8 0 13.5-5.3 13.5-12.4C75 34.9 63.8 27 50 27z"
    />

    <!-- 颜料点 -->
    <circle class="dot" cx="37.5" cy="50" r="3.4" />
    <circle class="dot" cx="42" cy="39" r="3.4" />
    <circle class="dot" cx="54" cy="35.5" r="3.4" />
    <circle class="dot soft" cx="64.5" cy="42.5" r="3.4" />

    <!-- 闪光 -->
    <path
      class="dot"
      d="M74 61c.8 5 2 6.2 7 7-5 .8-6.2 2-7 7-.8-5-2-6.2-7-7 5-.8 6.2-2 7-7z"
    />
  </svg>
</template>

<style scoped>
.bg {
  fill: var(--icon-art-bg, var(--icon-bg, #ffffff));
  stroke: none;
  transition: fill 0.3s ease;
}
.line {
  fill: none;
  stroke: var(--icon-fg, #2e2e33);
  stroke-width: 3.6;
  stroke-linejoin: round;
}
.dot {
  fill: var(--icon-fg, #2e2e33);
  stroke: none;
}
.dot.soft {
  opacity: 0.45;
}
</style>
