<template>
  <!-- 查手机应用图标：浅灰白底，手机轮廓加一个对勾，线条风格与设置图标统一 -->
  <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <rect class="bg" width="100" height="100" />

    <!-- 手机外框 -->
    <rect class="line" x="34" y="18" width="32" height="64" rx="7" />
    <!-- 听筒与底部按钮 -->
    <path class="line" d="M45 25h10" stroke-linecap="round" />
    <circle class="dot" cx="50" cy="75" r="2.6" />

    <!-- 屏幕里的对勾 -->
    <path class="check" d="M42 50l6 6 11-12" />
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
  stroke-width: 3.4;
  stroke-linejoin: round;
  transition: stroke 0.3s ease;
}
.check {
  fill: none;
  stroke: var(--icon-fg, #2e2e33);
  stroke-width: 3.4;
  stroke-linecap: round;
  stroke-linejoin: round;
  transition: stroke 0.3s ease;
}
.dot {
  fill: var(--icon-fg, #2e2e33);
  transition: fill 0.3s ease;
}
</style>
