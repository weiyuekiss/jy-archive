<script setup>
import { computed } from 'vue'

const props = defineProps({ kind: { type: String, default: 'home' } })
const buildings = ['home', 'cafe', 'studio', 'library', 'tower']
const isBuilding = computed(() => buildings.includes(props.kind))
const roof = computed(() => ({ home: '#d996b5', cafe: '#aa9bcd', studio: '#db9ab1', library: '#87b8cc', tower: '#b6a0d1' }[props.kind]))
</script>

<template>
  <svg viewBox="0 0 64 64" fill="none" shape-rendering="crispEdges" aria-hidden="true" focusable="false">
    <template v-if="isBuilding">
      <path fill="#b6a4c2" opacity=".22" d="M9 55h47v3H9zM14 58h36v2H14z"/>
      <template v-if="kind === 'tower'">
        <path fill="#75658e" d="M28 5h8v4h4v7h4v37h5v3H18v-3h5V16h4V9h1z"/>
        <path fill="#f9f0f5" d="M26 20h15v32H26z"/>
        <path :fill="roof" d="M30 8h4v4h4v6H27v-6h3z"/>
        <path fill="#dac9e3" d="M37 20h4v32h-4zM26 28h15v2H26zM26 41h15v2H26z"/>
        <path fill="#84769d" d="M30 22h7v7h-7zM30 33h7v7h-7zM30 45h7v8h-7z"/>
        <path fill="#b6dfe9" d="M31 23h5v4h-5zM31 34h5v4h-5z"/>
        <path fill="#f1c5d5" d="M31 46h5v7h-5z"/>
        <path fill="#fffaf4" d="M32 12h2v4h-2zM23 18h21v2H23zM22 52h23v2H22z"/>
        <path fill="#dfaac2" d="M42 7h8v5h-8z"/><path fill="#8c799e" d="M41 5h1v13h-1z"/>
      </template>
      <template v-else>
        <path fill="#77688b" d="M12 28h40v26H12z"/>
        <path fill="#fff6ef" d="M14 29h36v23H14z"/>
        <path fill="#ebd9e4" d="M45 29h5v23h-5zM14 48h36v4H14z"/>
        <path fill="#877292" d="M10 25h4v-4h5v-4h5v-4h16v4h5v4h5v4h4v5H10z"/>
        <path :fill="roof" d="M13 26h4v-4h5v-4h5v-3h10v3h5v4h5v4h4v2H13z"/>
        <path fill="#fff5f5" opacity=".55" d="M22 21h20v1H22zM17 25h30v1H17zM27 17h10v1H27z"/>
        <path fill="#b888a5" d="M43 10h5v12h-5z"/><path fill="#f7d9df" d="M42 9h7v3h-7z"/>
        <path fill="#8f819d" d="M18 33h9v10h-9zM37 33h9v10h-9zM29 37h7v15h-7z"/>
        <path fill="#bedee9" d="M19 34h7v7h-7zM38 34h7v7h-7z"/>
        <path fill="#fffaf4" d="M22 34h1v7h-1zM19 37h7v1h-7zM41 34h1v7h-1zM38 37h7v1h-7z"/>
        <path fill="#d8bbd5" d="M30 38h5v14h-5z"/><path fill="#fff4ed" d="M31 39h3v5h-3z"/>
        <path fill="#9a829f" d="M33 46h1v2h-1zM27 52h11v2H27z"/>
        <path fill="#b8cbb4" d="M15 45h9v3h-9zM40 45h9v3h-9z"/>
        <path fill="#db9eb7" d="M16 44h2v2h-2zM21 44h2v2h-2zM41 44h2v2h-2zM46 44h2v2h-2z"/>
        <path fill="#c395b0" d="M16 48h7v3h-7zM41 48h7v3h-7z"/>
        <template v-if="kind === 'cafe'">
          <path fill="#8b789b" d="M12 29h40v6H12z"/><path fill="#ead5ec" d="M13 29h38v4H13z"/>
          <path fill="#b29dca" d="M14 29h4v5h-4zM23 29h4v5h-4zM32 29h4v5h-4zM41 29h4v5h-4z"/>
          <path fill="#faf1e7" d="M27 20h8v4h-8zM35 20h3v3h-3z"/>
        </template>
        <template v-if="kind === 'studio'">
          <path fill="#f4dfc4" d="M24 21h16v6H24z"/><path fill="#d092a9" d="M27 23h3v2h-3z"/><path fill="#a4bbc9" d="M32 23h3v2h-3z"/>
        </template>
        <template v-if="kind === 'library'">
          <path fill="#eaf0ed" d="M24 20h16v7H24z"/><path fill="#9ba9ba" d="M27 21h4v4h-4zM33 21h4v4h-4zM31 22h2v4h-2z"/>
        </template>
      </template>
      <path fill="#a9c4b5" d="M6 51h2v-4h2v7H5v-2h1zM55 49h2v-3h2v7h-5v-2h1z"/>
      <path fill="#e6afc5" d="M7 45h3v3H7zM56 44h3v3h-3z"/>
    </template>
    <template v-else-if="kind === 'tea'">
      <path fill="#fffdf6" d="M14 25h34v3h6v16h-7v7H16v-5h-3V25zM9 51h43v5H9z"/>
      <path fill="#8f819e" d="M16 27h28v3h8v12h-8v6h-3v3H22v-3h-4v-5h-2z"/>
      <path fill="#f3dce7" d="M18 29h24v14h-3v5H23v-3h-3v-4h-2z"/>
      <path fill="#a9bd9b" d="M19 29h22v4H19z"/><path fill="#d2ddbe" d="M20 29h19v2H20z"/>
      <path fill="#fff9f5" d="M44 32h5v7h-5zM20 35h2v7h-2z"/>
      <path fill="#d7c6dd" d="M12 52h38v2H12zM18 55h26v2H18z"/>
      <path fill="#b7a7c7" d="M25 12h2v5h-2v5h-2v-6h2zM35 9h2v6h-2v6h-2v-7h2z"/>
      <path fill="#ad9ab9" d="M33 32h1v9h-1z"/><path fill="#e4b4c5" d="M30 40h7v7h-7z"/><path fill="#fff6ef" d="M32 42h3v3h-3z"/>
    </template>
    <template v-else-if="kind === 'bandage'">
      <path fill="#fffdf6" d="M7 24h5v-5h40v5h5v18h-5v5H12v-5H7z"/>
      <path fill="#b8999f" d="M10 26h4v-4h36v4h4v14h-4v4H14v-4h-4z"/>
      <path fill="#efd4bc" d="M12 27h4v-3h32v3h4v12h-4v3H16v-3h-4z"/>
      <path fill="#f8e4ce" d="M24 25h16v16H24z"/><path fill="#dfabae" d="M28 29h3v2h2v-2h3v5h-2v2h-4v-2h-2z"/>
      <path fill="#c7a88f" d="M17 28h2v2h-2zM17 35h2v2h-2zM45 28h2v2h-2zM45 35h2v2h-2z"/>
    </template>
    <template v-else-if="kind === 'apple'">
      <path fill="#fffdf6" d="M29 9h7v4h13v8h5v7h3v17h-5v7h-7v4H20v-4h-7v-7H9V28h4v-7h12v-5h4z"/>
      <path fill="#8a7881" d="M30 12h3v12h-3z"/><path fill="#96b898" d="M35 15h12v4h-4v3h-9z"/>
      <path fill="#b56e85" d="M17 24h10v2h10v-2h10v4h4v4h3v11h-4v6h-6v4H22v-3h-6v-6h-4V31h5z"/>
      <path fill="#e9a0ac" d="M18 26h9v2h11v-2h8v5h5v12h-4v5h-5v3H23v-3h-5v-6h-4V32h4z"/>
      <path fill="#f4b5bc" d="M19 29h7v3h-5v6h-4v-5h2z"/><path fill="#fff0df" d="M20 30h3v4h-3z"/>
      <path fill="#d78a9e" d="M45 34h5v9h-4v5h-6v2h-7v-3h8v-5h4z"/>
      <path fill="#926d80" d="M26 40h2v3h-2zM38 40h2v3h-2zM30 45h6v2h-6z"/>
    </template>
    <template v-else-if="kind === 'banana'">
      <path fill="#fffdf6" d="M43 9h9v7h3v17h-4v10h-6v6h-8v5H21v-4h-8v-6H8V33h8v5h9v-4h8v-7h5v-9h5z"/>
      <path fill="#a29378" d="M45 12h5v6h-5z"/><path fill="#bfaa75" d="M44 18h7v14h-4v10h-6v5h-8v4H22v-4h-7v-5h-4v-7h3v5h11v-3h9v-7h5v-7h5z"/>
      <path fill="#f3d990" d="M45 21h4v10h-4v9h-6v5h-7v3H23v-3h-7v-3h10v-3h9v-7h6v-8h4z"/>
      <path fill="#fff0ba" d="M46 22h2v8h-4v8h-6v5h-7v2H21v-2h9v-3h6v-5h5v-7h5z"/>
      <path fill="#9c886e" d="M11 35h3v5h-3z"/>
    </template>
    <template v-else-if="kind === 'candy'">
      <path fill="#fffdf8" d="M3 19h14v5h30v-5h14v26H47v-5H17v5H3z"/><path fill="#a995bf" d="M6 23h8v4h6v-5h24v5h6v-4h8v18h-8v-4h-6v5H20v-5h-6v4H6z"/><path fill="#efbfd8" d="M8 26h5v4h9v-5h20v5h9v-4h5v12h-5v-4h-9v5H22v-5h-9v4H8z"/><path fill="#fff0f5" d="M26 25h5v14h-5zM36 25h3v14h-3z"/>
    </template>
    <template v-else-if="kind === 'star'">
      <path fill="#fffdf8" d="M27 5h10v12h6v6h15v10H48v9h-5v14H32v-7h-8v7H13V40H6V25h15v-8h6z"/><path fill="#c6ae81" d="M29 9h6v13h7v4h12v5H44v10h-5v10h-5v-7H23v7h-6V37H10v-8h14v-7h5z"/><path fill="#f5df9f" d="M30 14h3v11h8v4h8v1h-8v10h-5v5h-1v-4H22v5h-2V35h-6v-3h13v-7h3z"/><path fill="#9f8ca5" d="M26 30h2v4h-2zM36 30h2v4h-2zM30 36h5v2h-5z"/>
    </template>
    <template v-else-if="kind === 'kitten'">
      <path fill="#fffdf8" d="M10 8h10v6h24V8h10v39h-6v9H16v-9h-6z"/><path fill="#9e8db7" d="M13 12h5v7h28v-7h5v32h-6v9H19v-9h-6z"/><path fill="#dfd4ef" d="M16 20h5v4h22v-4h5v22h-6v8H22v-8h-6z"/><path fill="#f3c8da" d="M16 16h3v7h-3zM45 16h3v7h-3zM19 37h8v3h-8zM37 37h8v3h-8z"/><path fill="#8b7a9d" d="M23 30h3v5h-3zM38 30h3v5h-3zM30 37h4v3h-4z"/><path fill="#fff9f8" d="M27 43h10v7H27z"/>
    </template>
    <template v-else-if="kind === 'kiwi'">
      <path fill="#fffdf8" d="M19 6h26v5h8v8h5v26h-5v8h-8v5H19v-5h-8v-8H6V19h5v-8h8z"/><path fill="#b19c80" d="M21 9h22v5h7v7h5v22h-5v7h-7v5H21v-5h-7v-7H9V21h5v-7h7z"/><path fill="#c1d49d" d="M22 13h20v4h6v6h4v18h-4v6h-6v4H22v-4h-6v-6h-4V23h4v-6h6z"/><path fill="#f5f1d0" d="M28 23h9v5h5v8h-6v6h-9v-6h-5v-8h6z"/><path fill="#7f9170" d="M22 20h2v4h-2zM39 19h2v4h-2zM44 29h3v2h-3zM42 40h2v4h-2zM30 45h2v3h-2zM19 38h3v2h-3zM17 28h3v2h-3z"/>
    </template>
    <template v-else-if="kind === 'mango'">
      <path fill="#fffdf8" d="M29 5h18v6h8v10h4v20h-5v9h-9v7H22v-4H12v-8H7V28h6v-9h8v-8h8z"/><path fill="#c6a075" d="M30 9h15v5h7v9h4v16h-5v9h-8v6H23v-4H15v-7h-5V30h6v-9h8v-7h6z"/><path fill="#f4ce81" d="M30 13h13v4h6v8h4v13h-5v8h-7v5H24v-4h-7v-6h-4v-9h6v-9h8v-6h3z"/><path fill="#ffe9b3" d="M22 27h6v-6h6v-3h7v4h-9v7h-6v7h-7v-3h3z"/><path fill="#9fb895" d="M34 9V5h16v4h-6v5h-9z"/>
    </template>
    <template v-else-if="kind === 'cloud'">
      <path fill="#dfcfe6" d="M9 32h6v-8h9v-5h14v5h8v7h8v11H9z"/>
      <path fill="#fffcfc" d="M7 29h7v-7h9v-5h14v5h8v7h8v10H7z"/>
      <path fill="#f4e9f3" d="M10 36h40v3H10z"/>
    </template>
  </svg>
</template>
