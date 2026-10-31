import { ref } from 'vue'

// 全局共享的"当前时间"，所有时钟/日期小组件共用一个计时器
const now = ref(new Date())
let timer = null

export function useNow() {
  if (!timer) {
    timer = setInterval(() => {
      now.value = new Date()
    }, 1000)
  }
  return now
}
