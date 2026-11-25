<script setup>
// 聊天回复失败的弹窗。数据来自 stores/chatErrors.js 的 chatErrorDialog，挂在 App.vue 里，任何应用里都能看到。
import { ref, watch } from 'vue'
import { chatErrorDialog } from '@/stores/chatErrors'

const copied = ref(false)
let copiedTimer = 0

watch(chatErrorDialog, () => {
  copied.value = false
  window.clearTimeout(copiedTimer)
})

function close() {
  chatErrorDialog.value = null
}

function fallbackCopy(text) {
  const area = document.createElement('textarea')
  area.value = text
  area.style.position = 'fixed'
  area.style.opacity = '0'
  document.body.appendChild(area)
  area.select()
  const ok = document.execCommand('copy')
  area.remove()
  return ok
}

async function copyDetails() {
  const text = chatErrorDialog.value?.details
  if (!text) return
  let ok = false
  try {
    await navigator.clipboard.writeText(text)
    ok = true
  } catch {
    ok = fallbackCopy(text)
  }
  if (!ok) return
  copied.value = true
  window.clearTimeout(copiedTimer)
  copiedTimer = window.setTimeout(() => { copied.value = false }, 1800)
}
</script>

<template>
  <Transition name="ced">
    <div v-if="chatErrorDialog" class="ced-backdrop" role="presentation" @click.self="close">
      <section class="ced-card" role="alertdialog" aria-modal="true" aria-labelledby="ced-title" aria-describedby="ced-message">
        <header class="ced-head">
          <span class="ced-icon" aria-hidden="true">!</span>
          <div class="ced-title-copy">
            <h2 id="ced-title">回复没有成功</h2>
            <p class="ced-context">{{ chatErrorDialog.chatName }} · {{ chatErrorDialog.time }}</p>
          </div>
        </header>

        <div class="ced-code">
          <span>错误码</span>
          <strong>{{ chatErrorDialog.code }}</strong>
        </div>

        <p id="ced-message" class="ced-message">{{ chatErrorDialog.message }}</p>

        <div class="ced-actions">
          <button type="button" class="ced-btn ced-btn-ghost" @click="close">关闭</button>
          <button type="button" class="ced-btn ced-btn-primary" :class="{ 'is-done': copied }" @click="copyDetails">
            {{ copied ? '已复制' : '复制错误详情' }}
          </button>
        </div>
        <p class="ced-footnote">复制的内容包含错误码、错误信息、聊天对象和发生时间，可以直接发给 AI 帮你排查。</p>
      </section>
    </div>
  </Transition>
</template>

<style scoped>
.ced-backdrop{position:fixed;inset:0;z-index:300;display:grid;place-items:center;padding:24px;box-sizing:border-box;background:#2a2f36387;backdrop-filter:blur(14px) saturate(1.1);-webkit-backdrop-filter:blur(14px) saturate(1.1)}
.ced-card{width:min(340px,100%);box-sizing:border-box;padding:22px 20px 18px;border:1px solid #ffffffb3;border-radius:24px;background:linear-gradient(160deg,#ffffffeb,#f6f7f8e0);box-shadow:0 22px 60px #1f29381f;color:#343840;backdrop-filter:blur(24px) saturate(1.3);-webkit-backdrop-filter:blur(24px) saturate(1.3)}
.ced-head{display:flex;align-items:center;gap:13px}
.ced-icon{width:40px;height:40px;flex:none;display:grid;place-items:center;border-radius:50%;background:#fdeee9;color:#d9735b;font-size:20px;font-weight:700}
.ced-title-copy{min-width:0}
.ced-title-copy h2{margin:0;font-size:16px;font-weight:650;letter-spacing:-.01em}
.ced-context{margin:3px 0 0;color:#9097a0;font-size:12px;line-height:1.4}
.ced-code{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-top:18px;padding:11px 13px;border-radius:14px;background:#f1f3f5}
.ced-code span{color:#8a919a;font-size:12px}
.ced-code strong{color:#4a5059;font:600 13px/1.4 ui-monospace,SFMono-Regular,Consolas,monospace;overflow-wrap:anywhere;text-align:right}
.ced-message{margin:12px 2px 0;max-height:132px;overflow:auto;color:#5a616b;font-size:13px;line-height:1.6;white-space:pre-wrap;overflow-wrap:anywhere}
.ced-actions{display:flex;gap:10px;margin-top:18px}
.ced-btn{flex:1;height:42px;border:0;border-radius:14px;font:inherit;font-size:14px;font-weight:600;cursor:pointer;transition:transform .15s,background-color .2s}
.ced-btn:active{transform:scale(.97)}
.ced-btn-ghost{background:#f1f3f5;color:#4a5059}
.ced-btn-primary{background:#4f7bd6;color:#fff}
.ced-btn-primary.is-done{background:#4aa56b}
.ced-footnote{margin:14px 2px 0;color:#a2a8b0;font-size:11px;line-height:1.6}
.ced-enter-active,.ced-leave-active{transition:opacity .18s ease}
.ced-enter-active .ced-card,.ced-leave-active .ced-card{transition:transform .22s cubic-bezier(.2,.8,.2,1),opacity .18s}
.ced-enter-from,.ced-leave-to{opacity:0}
.ced-enter-from .ced-card{transform:translateY(8px) scale(.98);opacity:0}
@media (prefers-reduced-motion:reduce){.ced-enter-active,.ced-leave-active,.ced-enter-active .ced-card,.ced-leave-active .ced-card{transition:none}}
</style>
