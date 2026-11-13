<script setup>
import AnimalAvatar from './AnimalAvatar.vue'
import { animalFrames } from './animalFrames'
defineProps({ modelValue: { type: String, default: 'bunny' } })
defineEmits(['update:modelValue'])
</script>

<template>
  <fieldset class="animal-picker">
    <legend>小动物头像框 <small>挑一位陪伴故事的小伙伴</small></legend>
    <div class="animal-options">
      <button v-for="animal in animalFrames" :key="animal.id" type="button" :aria-label="`${animal.name}头像框`" :aria-pressed="modelValue === animal.id" :class="{ selected: modelValue === animal.id }" @click="$emit('update:modelValue', animal.id)">
        <AnimalAvatar :animal="animal.id"/><span>{{ animal.name }}</span><i v-if="modelValue === animal.id">✓</i>
      </button>
    </div>
  </fieldset>
</template>

<style scoped>
.animal-picker{border:0;padding:0;margin:22px 0;color:#826e93;min-width:0}.animal-picker legend{font-size:12px;margin-bottom:12px}.animal-picker legend small{display:block;font-size:9px;color:#aa97b4;margin-top:6px}.animal-options{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px}.animal-options button{position:relative;display:flex;flex-direction:column;align-items:center;gap:3px;min-width:0;padding:6px 3px 8px;border:1px solid #e3d9ed;border-radius:5px;background:#fffcff;color:#927c9f;cursor:pointer;font:inherit;font-size:10px;box-shadow:1px 2px #e9e0ef55}.animal-options button.selected{background:#ecf5ff;border-color:#9bbbd4;box-shadow:inset 0 0 0 1px #bbd3e7,2px 2px #dbe7f1}.animal-options :deep(.animal-avatar){width:49px;max-width:100%}.animal-options i{position:absolute;right:5px;top:3px;font-size:9px;color:#7f9bb6;font-style:normal}.animal-options button:focus-visible{outline:2px solid #ad90c4;outline-offset:3px}
</style>
