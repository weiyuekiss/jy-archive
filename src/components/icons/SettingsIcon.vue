<template>
  <!-- 设置应用图标：低饱和韩系极简齿轮与调节几何线条。颜色取自 --icon-bg / --icon-fg，随图标风格动态切换 -->
  <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <rect class="bg" width="100" height="100" />

    <!-- 极简韩风柔和外轮廓齿轮 -->
    <path
      class="line"
      d="M50 32a18 18 0 1 0 0 36 18 18 0 0 0 0-36z"
    />

    <!-- 外圈 8 个温润刻度微齿 -->
    <path
      class="line"
      d="M50 21v5 M50 74v5 M21 50h5 M74 50h5 M29.5 29.5l3.5 3.5 M67 67l3.5 3.5 M70.5 29.5l-3.5 3.5 M33 67l-3.5 3.5"
      stroke-linecap="round"
    />

    <!-- 中心极简同心圆心与温润光斑点 -->
    <circle class="dot" cx="50" cy="50" r="5.5" />
    <circle class="dot soft" cx="69" cy="31" r="2.2" />
    <circle class="dot soft" cx="31" cy="69" r="2.2" />
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
.dot {
  fill: var(--icon-fg, #2e2e33);
  stroke: none;
  transition: fill 0.3s ease;
}
.dot.soft {
  opacity: 0.35;
}
</style>
