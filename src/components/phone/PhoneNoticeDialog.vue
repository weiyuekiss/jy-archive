<script setup>
// 查手机后台任务的结果弹窗：生成或刷新完成、失败时弹出。挂在 App.vue 里，离开查手机页面也能看到。
import { ref, watch } from 'vue'
import { phoneNotice, closePhoneNotice } from '@/stores/phoneGen'

const copied = ref(false)
watch(phoneNotice, () => { copied.value = false })

async function copyDetail() {
  const n = phoneNotice.value
  if (!n) return
  const text = `【查手机】${n.title}\n${n.message}\n\n模型原始输出：\n${n.raw || '（无）'}`
  try {
    await navigator.clipboard.writeText(text)
    copied.value = true
  } catch {
    // 剪贴板不可用时，选中文字让用户手动复制
    const area = document.createElement('textarea')
    area.value = text
    area.style.position = 'fixed'
    area.style.opacity = '0'
    document.body.appendChild(area)
    area.select()
    copied.value = document.execCommand('copy')
    area.remove()
  }
}
</script>

<template>
  <div v-if="phoneNotice" class="pn-backdrop" @click.self="closePhoneNotice">
    <section class="pn-card" role="alertdialog" aria-modal="true" aria-labelledby="pn-title">
      <h2 id="pn-title" :class="{ 'is-error': phoneNotice.kind === 'error' }">{{ phoneNotice.title }}</h2>
      <p class="pn-message">{{ phoneNotice.message }}</p>
      <template v-if="phoneNotice.raw">
        <p class="pn-label">模型原始输出</p>
        <pre class="pn-raw">{{ phoneNotice.raw }}</pre>
      </template>
      <div class="pn-actions">
        <button type="button" class="pn-btn" @click="closePhoneNotice">关闭</button>
        <button v-if="phoneNotice.raw" type="button" class="pn-btn pn-primary" @click="copyDetail">{{ copied ? '已复制' : '复制详情' }}</button>
      </div>
    </section>
  </div>
</template>

<style scoped>
.pn-backdrop {
  position: fixed;
  inset: 0;
  z-index: 310;
  display: grid;
  place-items: center;
  padding: 24px;
  box-sizing: border-box;
  background: #343b482e;
  backdrop-filter: blur(5px);
  -webkit-backdrop-filter: blur(5px);
}
.pn-card {
  width: min(100%, 360px);
  max-height: calc(100dvh - 48px);
  overflow: auto;
  box-sizing: border-box;
  padding: 24px 22px 20px;
  border: 1px solid #e8ebef;
  border-radius: 20px;
  background: #f7f8fa;
  color: #565c65;
  box-shadow: 0 12px 48px #343b4814;
  font-family: -apple-system, BlinkMacSystemFont, 'PingFang SC', 'Helvetica Neue', sans-serif;
}
.pn-card h2 { margin: 0 0 8px; font-size: 18px; font-weight: 600; color: #565c65; }
.pn-card h2.is-error { color: #c0392b; }
.pn-message { margin: 0; font-size: 14px; line-height: 1.7; color: #727983; white-space: pre-line; }
.pn-label { margin: 14px 0 6px; font-size: 12px; color: #8d9991; }
.pn-raw {
  max-height: 200px;
  overflow: auto;
  margin: 0;
  padding: 10px 12px;
  border-radius: 10px;
  background: #fff;
  color: #4e5a52;
  font: 12px/1.6 ui-monospace, SFMono-Regular, Consolas, monospace;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}
.pn-actions { display: flex; gap: 10px; margin-top: 18px; }
.pn-btn {
  flex: 1;
  min-height: 42px;
  border: 0;
  border-radius: 12px;
  background: #e5e8ec;
  color: #565c65;
  font: inherit;
  font-size: 14px;
  cursor: pointer;
}
.pn-primary { background: #565f6c; color: #fff; }
</style>
