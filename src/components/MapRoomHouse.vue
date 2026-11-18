<script setup>
const props = defineProps({ kind: { type: Number, default: 0 } })
const roofs = ['#d796b2', '#8fb4ce', '#dca6bd', '#a59bc8', '#dfae8f', '#8fbdb4']
const walls = ['#fff1ed', '#eff8fa', '#fff2f5', '#f3effb', '#fff3e8', '#eff8ef']
</script>

<template>
  <svg viewBox="0 0 64 64" shape-rendering="crispEdges" aria-hidden="true" focusable="false">
    <path fill="#b9a3c2" opacity=".3" d="M7 57h50v3H7z"/>
    <path fill="#846f91" d="M9 26h46v29H9z"/>
    <path :fill="walls[props.kind]" d="M11 27h42v26H11z"/>
    <path fill="#dfcbd9" d="M49 28h4v25h-4zM11 50h42v3H11z"/>
    <path v-if="kind === 0 || kind === 2" fill="#846f91" d="M6 25h4v-4h4v-4h5v-4h7V9h12v4h7v4h5v4h4v4h4v4H6z"/>
    <path v-if="kind === 0 || kind === 2" :fill="roofs[kind]" d="M10 25h4v-4h5v-4h7v-4h12v4h7v4h5v4h4v2H10z"/>
    <path v-if="kind === 1 || kind === 4" fill="#846f91" d="M7 17h50v12H7z"/>
    <path v-if="kind === 1 || kind === 4" :fill="roofs[kind]" d="M9 19h46v8H9z"/>
    <path v-if="kind === 3 || kind === 5" fill="#846f91" d="M8 23h5v-6h5v-5h28v5h5v6h5v6H8z"/>
    <path v-if="kind === 3 || kind === 5" :fill="roofs[kind]" d="M11 24h5v-5h5v-4h22v4h5v5h5v3H11z"/>
    <path fill="#fff8f4" opacity=".7" d="M16 24h5v1h-5zm8 0h5v1h-5zm8 0h5v1h-5zm8 0h5v1h-5zM20 20h4v1h-4zm8 0h4v1h-4zm8 0h4v1h-4z"/>
    <path fill="#947f9a" d="M14 32h10v10H14zm26 0h10v10H40zM27 37h10v16H27z"/>
    <path fill="#c3e3e9" d="M15 33h8v8h-8zm26 0h8v8h-8z"/>
    <path fill="#fffafa" d="M18 33h1v8h-1zm-3 3h8v1h-8zm29-3h1v8h-1zm-3 3h8v1h-8z"/>
    <path :fill="roofs[kind]" d="M28 38h8v15h-8z"/><path fill="#fff1e7" d="M29 39h6v5h-6z"/><path fill="#947f9a" d="M34 46h1v2h-1zM25 53h14v2H25z"/>
    <path fill="#b9d3b6" d="M13 44h12v3H13zm26 0h12v3H39z"/><path fill="#df9db3" d="M14 43h2v2h-2zm5 0h2v2h-2zm4 0h2v2h-2zm17 0h2v2h-2zm5 0h2v2h-2zm4 0h2v2h-2z"/>
    <path fill="#fff" opacity=".7" d="M12 29h2v2h-2zm36 0h2v2h-2zm-34 5h1v3h-1zm27 0h1v3h-1z"/>
    <g v-if="kind === 0"><path fill="#fbe1b2" d="M25 17h14v5H25z"/><path fill="#d78c9e" d="M27 18h2v2h-2zm4 0h2v2h-2zm4 0h2v2h-2z"/></g>
    <g v-if="kind === 1"><path fill="#f9f3dd" d="M25 20h14v5H25z"/><path fill="#8ea9bd" d="M27 21h3v3h-3zm4 0h3v3h-3zm4 0h3v3h-3z"/></g>
    <g v-if="kind === 2"><path fill="#f8d7e3" d="M28 17h3v2h2v-2h3v4h-2v2h-4v-2h-2z"/></g>
    <g v-if="kind === 3"><path fill="#f8e1b1" d="M30 16h4v2h3v3h-3v2h-4v-2h-3v-3h3z"/></g>
    <g v-if="kind === 4"><path fill="#fff1dc" d="M25 20h14v5H25z"/><path fill="#e4a1a3" d="M27 21h3v2h-3z"/><path fill="#9ebfc7" d="M31 21h3v2h-3z"/><path fill="#c0a6cd" d="M35 21h2v2h-2z"/></g>
    <g v-if="kind === 5"><path fill="#fbe6d3" d="M25 19h14v5H25z"/><path fill="#8db7ac" d="M28 20h8v2h-8zM30 22h4v1h-4z"/></g>
  </svg>
</template>
