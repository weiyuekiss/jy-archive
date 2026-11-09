<script setup>
defineProps({ name: { type: String, required: true } })
</script>

<template>
  <svg viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <path v-if="name === 'beautify'" d="m12 2 2.7 6.8L22 12l-7.3 3.2L12 22l-2.7-6.8L2 12l7.3-3.2L12 2Zm7 0 .9 2.1L22 5l-2.1.9L19 8l-.9-2.1L16 5l2.1-.9L19 2Z" />
    <path v-else-if="name === 'chat'" fill-rule="evenodd" d="M4 3a3 3 0 0 0-3 3v10a3 3 0 0 0 3 3h2v4l5-4h9a3 3 0 0 0 3-3V6a3 3 0 0 0-3-3H4Zm3 7a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3Zm5 0a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3Zm5 0a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3Z" />
    <g v-else-if="name === 'character'"><circle cx="12" cy="7" r="5" /><path d="M3 21a9 9 0 0 1 18 0v1H3v-1Z" /></g>
    <path v-else-if="name === 'settings'" fill-rule="evenodd" d="m9 1-.6 3-2 .9-2.6-1.1-3 5.2L3 11v2L.8 15l3 5.2L6.4 19l2 .9L9 23h6l.6-3.1 2-.9 2.6 1.2 3-5.2-2.2-2v-2l2.2-2-3-5.2-2.6 1.1-2-.9L15 1H9Zm3 6a5 5 0 1 0 0 10 5 5 0 0 0 0-10Z" />
    <path v-else-if="name === 'pending-1'" fill-rule="evenodd" d="M3 2h18v20H3V2Zm4 5v2h10V7H7Zm0 5v2h10v-2H7Zm0 5v2h6v-2H7Z" />
    <path v-else-if="name === 'pending-2'" fill-rule="evenodd" d="M4 3h16a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Zm12 3a2 2 0 1 0 0 4 2 2 0 0 0 0-4ZM5 18h14l-4-5-3 3-4-5-3 7Z" />
    <path v-else-if="name === 'pending-3'" d="M9 3v12.3a4 4 0 1 0 2 3.5V7l9-2v8.3a4 4 0 1 0 2 3.5V0L9 3Z" />
    <path v-else d="m12 2 3.1 6.3 7 .9-5.1 5 1.2 7-6.2-3.3L5.8 21l1.2-7-5.1-4.8 7-.9L12 2Z" />
  </svg>
</template>
