<script setup>
defineProps({ kind: { type: String, required: true } })
</script>

<template>
  <svg class="handheld-icon" viewBox="0 0 48 48" aria-hidden="true" focusable="false" shape-rendering="crispEdges">
    <template v-if="kind === 'dpad'">
      <path fill="#78638f" d="M17 3h14v3h3v11h11v3h2v12h-3v3H33v10h-3v2H17v-3h-3V34H3v-3H1V19h3v-3h10V6h3z"/>
      <path fill="#a48ac2" d="M18 4h12v3h3v11h11v12h-3v3H31v11H18V33H5v-3H3V19h14V7h1z"/>
      <path fill="#d7c6eb" d="M18 7h12v2H20v10H7v3H5v-3h12V9h1z"/>
      <path fill="#8d75ad" d="M30 11h2v8h10v3H30zm1 20h10v-2h2v3H32v10h-2V31zM7 30h11v11h2v2h-3V33H7z"/>
      <path fill="#bba5d5" d="M19 18h10v2h2v9h-2v2H19v-2h-2v-9h2z"/>
      <path fill="#88719f" d="M21 21h6v2h2v4h-2v2h-6v-2h-2v-4h2z"/>
      <path fill="#e8dbf5" d="M21 21h6v2h-6zM21 8h6v2h-6zM7 21h6v2H7z"/>
      <path fill="#9b83b6" d="M23 11h2v4h-2zm0 22h2v4h-2zM10 24h4v2h-4zm24 0h4v2h-4z"/>
    </template>
    <template v-else-if="kind === 'add'">
      <path fill="#a35e82" d="M15 3h18v2h5v3h3v4h3v5h2v16h-2v5h-3v4h-4v3h-5v2H16v-2h-5v-3H7v-4H4v-5H2V17h2v-5h3V8h4V5h4z"/>
      <path fill="#dc8fb2" d="M15 4h18v3h5v3h3v5h2v17h-2v5h-3v4h-5v2H16v-2h-5v-4H8v-5H5V16h3v-5h3V8h4z"/>
      <path fill="#f3bcd2" d="M15 7h17v2h5v3h3v5h2v11h-2v5h-3v3h-5v2H16v-2h-5v-3H8v-5H7V17h2v-5h3V9h3z"/>
      <path fill="#fff0f7" d="M15 9h16v2H16v2h-4v4h-2v-5h2V9zM11 19h2v5h-2z"/>
      <path fill="#fff8fc" d="M21 12h6v9h9v6h-9v9h-6v-9h-9v-6h9z"/>
      <path fill="#e4a8c3" d="M21 33h6v3h-6zm12-12h3v6h-3z"/>
    </template>
    <template v-else>
      <path fill="#9981ae" d="M7 3h33v3h4v34h-3v4H7v-3H4V7h3z"/>
      <path fill="#c2a9d4" d="M7 4h32v3h3v32h-3v3H8v-3H5V8h2z"/>
      <path fill="#fff4fb" d="M8 6h29v2h3v29h-3v2H9v-2H7V9h1z"/>
      <path fill="#fff" d="M9 8h27v2H11v3H9z"/>
      <path fill="#e8d7ed" d="M38 12h2v25h-3v2H11v-2h26v-3h1z"/>
      <g v-if="kind === 'studio'">
        <path fill="#9378ac" d="M13 13h19v3h3v17h-3v3H13v-3h-3V16h3z"/>
        <path fill="#eab5d2" d="M14 16h17v16H14z"/>
        <path fill="#fff4fb" d="M16 18h13v2H16z"/>
        <path fill="#9d83b7" d="M16 28h3v-3h3v-3h3v3h3v3h2v3H16z"/>
        <path fill="#fff4bb" d="M25 19h3v3h-3z"/>
      </g>
      <g v-else-if="kind === 'archive'">
        <path fill="#967bad" d="M12 12h20v3h3v20H12v-3H9V15h3z"/>
        <path fill="#c2add6" d="M13 14h18v18H13z"/>
        <path fill="#fff7fb" d="M16 16h13v14H16z"/>
        <path fill="#d499bb" d="M20 18h5v2h2v4h-2v2h3v2H17v-2h3v-2h-2v-4h2z"/>
        <path fill="#e9d6eb" d="M10 18h2v12h-2z"/>
      </g>
      <g v-else-if="kind === 'create'">
        <path fill="#9a80b0" d="M21 10h6v3h3v5h5v3h3v6h-3v3h-5v5h-3v3h-6v-3h-3v-5h-5v-3h-3v-6h3v-3h5v-5h3z"/>
        <path fill="#efb6d0" d="M21 13h6v8h8v6h-8v8h-6v-8h-8v-6h8z"/>
        <path fill="#fff6fb" d="M22 14h3v8h8v3h-8v8h-3v-8h-8v-3h8z"/>
      </g>
      <g v-else>
        <path fill="#957bad" d="M11 13h23v3h3v19H14v-3h-3z"/>
        <path fill="#d2b9dc" d="M14 15h19v17H14z"/>
        <path fill="#fff8fc" d="M16 17h15v3H16zm0 5h15v3H16zm0 5h10v3H16z"/>
        <path fill="#df9cbd" d="M28 27h3v3h-3z"/>
      </g>
    </template>
  </svg>
</template>

<style>
.pocket-controls .dpad,
.pocket-controls .pocket-add,
.pocket-controls .control-center button {
  padding: 0;
  border: 0;
  background: transparent;
  box-shadow: none;
  filter: none;
  line-height: 0;
}
.pocket-controls .dpad::before { content: none; }
.pocket-controls .handheld-icon { display: block; width: 100%; height: 100%; }
.pocket-controls button:active .handheld-icon { transform: translateY(2px); }
.pocket-controls button:focus-visible { outline: 2px solid #816daa; outline-offset: 3px; }
</style>
