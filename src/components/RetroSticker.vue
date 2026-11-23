<script setup>
defineProps({ kind: { type: String, default: 'network' } })
</script>

<template>
  <svg class="retro-sticker" viewBox="0 0 48 48" fill="none" shape-rendering="crispEdges" aria-hidden="true">
    <path d="M9 5h30v3h4v4h3v26h-4v5H8v-4H3V12h3V8h3z" fill="#fff"/>
    <g v-if="kind === 'network'">
      <path d="M20 27h8v8h12v4H8v-4h12z" fill="#585666"/><path d="M10 9h28v21H10z" fill="#424559"/><path d="M12 11h24v17H12z" fill="#e5e3dc"/><path d="M15 14h18v11H15z" fill="#739eae"/><path d="M17 14h14v3H17zM15 19h18v2H15zM23 14h2v11h-2z" fill="#b8f0d5"/><path d="M7 32h9v8H7zM32 32h9v8h-9z" fill="#535a79"/><path d="M9 34h5v3H9zM34 34h5v3h-5z" fill="#c0b9ed"/><path d="M27 9h9v3h-9z" fill="#fff"/>
    </g>
    <g v-else-if="kind === 'profile'">
      <path d="M10 8h28v33H10z" fill="#595266"/><path d="M12 10h24v28H12z" fill="#f5e8ed"/><path d="M14 12h20v4H14z" fill="#b8add4"/><path d="M19 20h10v9H19zM16 29h16v6H16z" fill="#aa7c91"/><path d="M21 19h6v3h-6zM21 23h6v5h-6z" fill="#f7cabb"/><path d="M18 31h12v4H18z" fill="#a0abc8"/><path d="M14 39h20v3H14z" fill="#c9c5bc"/><path d="M7 18h6v3H7zM7 26h6v3H7zM7 34h6v3H7z" fill="#92949e"/>
    </g>
    <g v-else-if="kind === 'disk'">
      <path d="M10 7h26v4h4v30H8V7z" fill="#4d5069"/><path d="M11 9h24v29H11z" fill="#aaa4ce"/><path d="M15 9h17v13H15z" fill="#dddde0"/><path d="M25 11h5v9h-5z" fill="#686b7a"/><path d="M14 26h20v12H14z" fill="#fff5e7"/><path d="M17 29h14v2H17zM17 33h10v2H17z" fill="#aea7b8"/><path d="M10 37h3v2h-3zM35 37h3v2h-3z" fill="#ddd"/>
    </g>
    <g v-else-if="kind === 'folder'">
      <path d="M7 13h15v4h19v22H7z" fill="#806a43"/><path d="M9 11h12v5h18v20H9z" fill="#f3d98e"/><path d="M10 18h30v4H10z" fill="#fff0bc"/><path d="M12 23h30l-5 14H8z" fill="#d8b76e"/><path d="M13 24h26v3H12z" fill="#ffe5a5"/><path d="M20 27h10v2H20z" fill="#9a7d4e"/>
    </g>
    <g v-else-if="kind === 'globe'">
      <path d="M14 8h20v4h4v4h3v20h-3v4h-4v4H14v-4h-4v-4H7V16h3v-4h4z" fill="#3e6fa8"/><path d="M16 10h16v4h3v4h2v16h-2v4h-3v3H16v-3h-3v-4h-2V18h2v-4h3z" fill="#8cc4ee"/><path d="M20 14h4v3h-4zM29 17h3v5h-3zM18 27h5v4h-5zM25 30h4v4h-4z" fill="#3e8f5a"/><path d="M14 13h4v3h-4zM11 19h2v3h-2z" fill="#d9f0ff"/>
    </g>
    <g v-else-if="kind === 'pointer'">
      <path d="M12 6h4v4h4v4h4v4h4v4h4v-4h4v4h-4v4h-4v4h-4v4h-4v-4h-4v-4h-4v-4h-4z" fill="#22252e"/><path d="M14 9h2v16h-2zM16 9h8v4h-8zM18 14h6v4h-6zM16 18h6v8h-6zM22 22h4v4h-4zM24 26h4v4h-4z" fill="#ffffff"/>
    </g>
    <g v-else>
      <path d="M15 8h18v4h5v25h-5v4H15v-4h-5V12h5z" fill="#50526a"/><path d="M15 11h18v26H15zM12 16h24v16H12z" fill="#b9bfcd"/><path d="M19 16h10v15H19z" fill="#6e83a8"/><path d="M21 18h6v4h-6zM21 25h2v4h-2zM25 25h2v4h-2z" fill="#e2f1db"/><path d="M7 20h5v3H7zM36 20h5v3h-5zM19 5h3v6h-3zM27 5h3v6h-3z" fill="#9392a7"/>
    </g>
    <path d="M37 5h3v3h3v3h-3v3h-3v-3h-3V8h3z" fill="#b8a8d3"/>
  </svg>
</template>

<style scoped>
.retro-sticker{display:block;width:52px;height:52px;flex:none;image-rendering:pixelated;filter:drop-shadow(2px 3px 0 #50506033)}
</style>
