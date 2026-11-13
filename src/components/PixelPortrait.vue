<script setup>
defineProps({ variant: { type: String, default: 'blue' } })
</script>

<template>
  <svg viewBox="0 0 96 144" fill="none" shape-rendering="crispEdges" aria-hidden="true" :class="`portrait-${variant}`">
    <path fill="#c9bedb" opacity=".3" d="M20 134h58v4H20zM28 138h42v2H28z"/>
    <path fill="#93829f" d="M33 12h29v5h8v8h5v36h-6v12H26V61h-5V28h5V18h7z"/>
    <path fill="#c1aed6" d="M34 15h26v5h8v10h4v29h-6V36H29v24h-5V30h5V21h5z"/>
    <path fill="#f6dacd" d="M31 32h33v28h-5v8H37v-8h-6z"/><path fill="#ffe9dc" d="M34 35h27v23h-5v7H39v-7h-5z"/>
    <path fill="#bca6d1" d="M30 29h36v9H54v-7h-4v12h-7V32h-4v9h-9z"/><path fill="#e1cdeb" d="M32 23h27v3H32z"/>
    <path fill="#847493" d="M37 45h3v5h-3zM55 45h3v5h-3zM45 57h6v2h-6z"/><path fill="#edb8c5" d="M33 52h8v3h-8zM55 52h8v3h-8z"/>
    <path fill="#f4ccda" d="M64 25h9v4h4v6h-5v5h-8v-5h-5v-6h5z"/><path fill="#fff1bd" d="M65 29h6v6h-6z"/>
    <path class="outfit-line" d="M32 69h32v6h7v9h5v22H65v13H31v-13H20V84h5v-9h7z"/><path class="outfit" d="M34 72h28v6h7v8h4v16H62v13H34v-13H23V86h5v-8h6z"/>
    <path fill="#fff8ed" d="M36 70h24v7h-5v6H41v-6h-5zM28 99h8v7h-8zM60 99h8v7h-8z"/><path fill="#d6b6d9" d="M45 79h6v10h-6zM39 82h6v4h-6zM51 82h6v4h-6z"/>
    <path fill="#f5d9ce" d="M24 104h9v8h-9zM63 104h9v8h-9z"/><path fill="#fff9f3" d="M32 114h32v6H32zM36 120h8v9h-8zM53 120h8v9h-8z"/>
    <path fill="#9d8bad" d="M33 129h12v6H30v-3h3zM53 129h11v3h4v3H53z"/><path fill="#d4bfdc" d="M33 130h9v2h-9zM56 130h8v2h-8z"/>
    <path fill="#fffaf0" d="M52 93h9v8h-9z"/><path fill="#e7b5cc" d="M55 94h3v4h-3z"/>
    <path fill="#e5c897" d="M12 56h3v5h5v3h-5v5h-3v-5H7v-3h5zM81 86h2v4h4v2h-4v4h-2v-4h-4v-2h4z"/>
  </svg>
</template>

<style scoped>
svg{--dress:#c9e2f0;--line:#93afc6;width:100%;height:100%;overflow:visible}.portrait-pink{--dress:#efd0df;--line:#be9ab6}.outfit{fill:var(--dress)}.outfit-line{fill:var(--line)}
</style>
