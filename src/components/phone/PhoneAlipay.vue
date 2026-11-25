<script setup>
// 仿支付宝：全屏，蓝色顶部延伸到状态栏；「账单 / 资产」分段；
// 账单页是本期收支汇总卡 + 按日期分组的列表（支出黑色，收入橙色）；
// 资产页是余额卡和花呗卡（本期应还、额度、还款日）。点账单打开详情。
// 底部白色标签栏，右上角有刷新按钮。
import { computed, ref } from 'vue'
import PhoneIcon from '@/components/phone/PhoneIcon.vue'

const props = defineProps({
  // 账单（bills）和资产（wallet）混在一起传入
  items: { type: Array, default: () => [] },
  refreshing: { type: Boolean, default: false },
  ownerName: { type: String, default: '' }
})
const emit = defineEmits(['back', 'refresh'])

const SEG = [
  { id: 'bills', label: '账单' },
  { id: 'assets', label: '资产' }
]
const TABS = [
  { id: 'home', label: '首页', icon: 'home' },
  { id: 'bills', label: '账单', icon: 'receipt' },
  { id: 'wealth', label: '理财', icon: 'coins' },
  { id: 'mine', label: '我的', icon: 'user' }
]
// 分类图标与颜色，接近支付宝账单里的圆形分类图标
const CATEGORY = {
  餐饮: { icon: 'food', color: '#ff7a45' },
  交通: { icon: 'bus', color: '#36cfc9' },
  购物: { icon: 'bag', color: '#ff85c0' },
  转账: { icon: 'card', color: '#597ef7' },
  还款: { icon: 'card', color: '#9254de' },
  工资: { icon: 'coins', color: '#ffa940' },
  生活缴费: { icon: 'receipt', color: '#40a9ff' },
  话费: { icon: 'phone', color: '#73d13d' }
}
const FALLBACK_CATEGORY = { icon: 'receipt', color: '#8c8c8c' }
function categoryOf(sub) {
  return CATEGORY[sub] || FALLBACK_CATEGORY
}
const seg = ref('bills')
const openIndex = ref(-1)

const bills = computed(() => props.items
  .map((item, index) => ({ item, index }))
  .filter(({ item }) => item.type === 'bills'))
const wallet = computed(() => props.items.filter((i) => i.type === 'wallet'))
const balance = computed(() => wallet.value.find((w) => w.kind === 'balance' && w.title === '余额') || wallet.value.find((w) => w.kind === 'balance') || null)
const yuebao = computed(() => wallet.value.filter((w) => w.kind === 'balance').find((w) => w !== balance.value) || null)
const huabei = computed(() => wallet.value.find((w) => w.kind === 'credit') || null)

// 本期收支汇总：按 direction 求和，金额按字符串转数字
function sumOf(list) {
  return list.reduce((s, { item }) => s + (Number(item.amount) || 0), 0)
}
const expense = computed(() => sumOf(bills.value.filter(({ item }) => item.direction !== 'in')))
const income = computed(() => sumOf(bills.value.filter(({ item }) => item.direction === 'in')))

function fmt(n) {
  return Number(n || 0).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
function dateKeyOf(time) {
  const t = String(time || '')
  if (t.startsWith('今天')) return '今天'
  if (t.startsWith('昨天')) return '昨天'
  const m = t.match(/\d+月\d+日/)
  return m ? m[0] : '更早'
}
// 账单按日期分组，从近到远
const groups = computed(() => {
  const map = new Map()
  for (const entry of bills.value) {
    const key = dateKeyOf(entry.item.time)
    if (!map.has(key)) map.set(key, [])
    map.get(key).push(entry)
  }
  return Array.from(map, ([name, list]) => ({ name, list }))
})

const current = computed(() => props.items[openIndex.value] || null)

function goBack() {
  if (current.value) openIndex.value = -1
  else emit('back')
}
</script>

<template>
  <div class="ap">
    <!-- 列表页 -->
    <template v-if="!current">
      <header class="ap-top">
        <button type="button" class="ap-back" aria-label="返回桌面" @click="emit('back')">
          <PhoneIcon name="back" :size="22" />
          <span>{{ ownerName || '返回' }}</span>
        </button>
        <div class="ap-top-right">
          <button type="button" class="ap-round" aria-label="刷新支付宝" :disabled="refreshing" :class="{ 'is-spinning': refreshing }" @click="emit('refresh')">
            <PhoneIcon name="flip" :size="18" />
          </button>
          <button type="button" class="ap-round" aria-label="扫一扫"><PhoneIcon name="scan" :size="18" /></button>
        </div>
      </header>

      <div class="ap-seg" role="tablist">
        <button v-for="s in SEG" :key="s.id" type="button" role="tab" :class="{ 'is-on': seg === s.id }" :aria-selected="seg === s.id" @click="seg = s.id">{{ s.label }}</button>
      </div>

      <div class="ap-body">
        <p v-if="!items.length" class="ap-empty">还没有支付宝数据。点右上角刷新，让模型按角色的生活写出他的账单、余额和花呗。</p>

        <!-- 账单：本期汇总卡 + 按日期分组 -->
        <template v-else-if="seg === 'bills'">
          <section class="ap-summary">
            <p class="ap-summary-title">本期收支</p>
            <div class="ap-summary-row">
              <div>
                <span class="ap-summary-label">支出</span>
                <span class="ap-summary-num">{{ fmt(expense) }}</span>
              </div>
              <div>
                <span class="ap-summary-label">收入</span>
                <span class="ap-summary-num is-in">{{ fmt(income) }}</span>
              </div>
            </div>
          </section>

          <p v-if="!bills.length" class="ap-empty">还没有账单</p>
          <section v-for="group in groups" :key="group.name" class="ap-group">
            <p class="ap-group-label">{{ group.name }}</p>
            <div class="ap-card">
              <button v-for="entry in group.list" :key="entry.index" type="button" class="ap-row" @click="openIndex = entry.index">
                <span class="ap-cat" :style="{ background: categoryOf(entry.item.sub).color }">
                  <PhoneIcon :name="categoryOf(entry.item.sub).icon" :size="18" />
                </span>
                <span class="ap-main">
                  <span class="ap-row-title">{{ entry.item.title }}</span>
                  <span class="ap-row-sub">{{ entry.item.time }}<template v-if="entry.item.sub"> · {{ entry.item.sub }}</template></span>
                </span>
                <span class="ap-amount" :class="{ 'is-in': entry.item.direction === 'in' }">
                  {{ entry.item.direction === 'in' ? '+' : '-' }}{{ fmt(entry.item.amount) }}
                </span>
              </button>
            </div>
          </section>
        </template>

        <!-- 资产：余额、余额宝、花呗 -->
        <template v-else>
          <section v-if="balance" class="ap-balance">
            <p class="ap-balance-label">{{ balance.sub || '可用余额' }}</p>
            <p class="ap-balance-num">¥{{ fmt(balance.amount) }}</p>
            <div class="ap-balance-links">
              <span>账单</span><span>转账</span><span>收付款</span>
            </div>
          </section>

          <section v-if="yuebao" class="ap-card ap-card-line">
            <span class="ap-cat" style="background:#ff7a45"><PhoneIcon name="coins" :size="18" /></span>
            <span class="ap-main">
              <span class="ap-row-title">{{ yuebao.title }}</span>
              <span class="ap-row-sub">{{ yuebao.sub }}</span>
            </span>
            <span class="ap-amount-plain">¥{{ fmt(yuebao.amount) }}</span>
          </section>

          <section v-if="huabei" class="ap-huabei">
            <div class="ap-hb-head">
              <span class="ap-hb-title">花呗</span>
              <span class="ap-hb-sub">{{ huabei.sub || '本期账单' }}</span>
            </div>
            <p class="ap-hb-due">本期应还 <b>¥{{ fmt(huabei.amount) }}</b></p>
            <p class="ap-hb-meta">
              <span>总额度 ¥{{ fmt(huabei.limit) }}</span>
              <span v-if="huabei.due">还款日 {{ huabei.due }}</span>
            </p>
            <p v-if="huabei.text" class="ap-hb-text">{{ huabei.text }}</p>
          </section>
          <p v-if="!balance && !huabei" class="ap-empty">还没有资产数据</p>
        </template>
      </div>

      <!-- 底部：白色标签栏 -->
      <nav class="ap-tabbar" aria-label="支付宝底部导航">
        <span v-for="t in TABS" :key="t.id" class="ap-tab" :class="{ 'is-on': t.id === 'bills' }">
          <PhoneIcon :name="t.icon" :size="22" />
          <span>{{ t.label }}</span>
        </span>
      </nav>
    </template>

    <!-- 账单详情 -->
    <template v-else>
      <header class="ap-detail-top">
        <button type="button" class="ap-back" aria-label="返回账单" @click="goBack">
          <PhoneIcon name="back" :size="22" />
          <span>账单</span>
        </button>
      </header>
      <div class="ap-detail">
        <span class="ap-detail-cat" :style="{ background: categoryOf(current.sub).color }">
          <PhoneIcon :name="categoryOf(current.sub).icon" :size="26" />
        </span>
        <p class="ap-detail-amount" :class="{ 'is-in': current.direction === 'in' }">
          {{ current.direction === 'in' ? '+' : '-' }}{{ fmt(current.amount) }}
        </p>
        <p class="ap-detail-title">{{ current.title }}</p>
        <div class="ap-detail-card">
          <p class="ap-detail-row"><span>交易分类</span><b>{{ current.sub || '其他' }}</b></p>
          <p class="ap-detail-row"><span>交易时间</span><b>{{ current.time }}</b></p>
          <p class="ap-detail-row"><span>收支</span><b>{{ current.direction === 'in' ? '收入' : '支出' }}</b></p>
          <p v-if="current.text" class="ap-detail-row"><span>备注</span><b>{{ current.text }}</b></p>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
/* 全屏：支付宝账单页是浅灰底，顶部是蓝色渐变 */
.ap {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  background: #f5f6f8;
  color: #1f1f1f;
  font-family: -apple-system, BlinkMacSystemFont, 'PingFang SC', 'Helvetica Neue', sans-serif;
  overflow: hidden;
}
.ap-top {
  flex: none;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: max(env(safe-area-inset-top), 48px) 14px 10px 12px;
  background: linear-gradient(135deg, #1677ff, #3a8dff);
  color: #fff;
}
.ap-back {
  display: flex;
  align-items: center;
  gap: 2px;
  border: 0;
  background: none;
  color: #fff;
  font: inherit;
  font-size: 17px;
  font-weight: 600;
  padding: 4px 2px;
  cursor: pointer;
}
.ap-top-right { display: flex; gap: 10px; }
.ap-round {
  width: 34px;
  height: 34px;
  border: 0;
  border-radius: 50%;
  background: rgba(255, 255, 255, .2);
  color: #fff;
  display: grid;
  place-items: center;
  padding: 0;
  cursor: pointer;
}
.ap-round:disabled { opacity: .5; }
.ap-round.is-spinning svg { animation: ap-spin .9s linear infinite; }
@keyframes ap-spin { to { transform: rotate(360deg); } }

/* 分段：账单 / 资产 */
.ap-seg {
  flex: none;
  display: flex;
  margin: 0 16px 12px;
  padding: 3px;
  border-radius: 18px;
  background: #e6eefb;
}
.ap-seg button {
  flex: 1;
  height: 30px;
  border: 0;
  border-radius: 15px;
  background: none;
  color: rgba(255, 255, 255, .8);
  font: inherit;
  font-size: 14px;
  cursor: pointer;
}
.ap-seg button.is-on { background: #fff; color: #1677ff; font-weight: 600; }

.ap-body { flex: 1; min-height: 0; overflow-y: auto; padding: 0 14px 120px; }
.ap-empty { margin: 36px 0; text-align: center; color: #8c8c8c; font-size: 14px; line-height: 1.6; }

/* 账单汇总卡 */
.ap-summary { margin: 0 0 12px; padding: 16px 18px; border-radius: 16px; background: #fff; }
.ap-summary-title { margin: 0 0 10px; font-size: 14px; color: #8c8c8c; }
.ap-summary-row { display: flex; justify-content: space-around; }
.ap-summary-row > div { display: flex; flex-direction: column; gap: 4px; }
.ap-summary-label { font-size: 12px; color: #8c8c8c; }
.ap-summary-num { font-size: 20px; font-weight: 700; color: #1f1f1f; font-variant-numeric: tabular-nums; }
.ap-summary-num.is-in { color: #ff7a00; }

/* 账单分组与列表 */
.ap-group { margin-bottom: 14px; }
.ap-group-label { margin: 0 4px 6px; font-size: 13px; color: #8c8c8c; }
.ap-card { overflow: hidden; border-radius: 16px; background: #fff; }
.ap-card-line { display: flex; align-items: center; gap: 12px; padding: 12px 14px; margin-bottom: 12px; }
.ap-row {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 14px;
  border: 0;
  border-bottom: .5px solid #f0f0f0;
  background: #fff;
  color: #1f1f1f;
  font: inherit;
  text-align: left;
  cursor: pointer;
  box-sizing: border-box;
}
.ap-card .ap-row:last-child { border-bottom: 0; }
.ap-row:active { background: #f5f5f5; }
.ap-cat {
  flex: none;
  width: 34px;
  height: 34px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  color: #fff;
}
.ap-main { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
.ap-row-title { font-size: 15px; font-weight: 500; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.ap-row-sub { font-size: 12px; color: #8c8c8c; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.ap-amount { flex: none; font-size: 16px; font-weight: 600; color: #1f1f1f; font-variant-numeric: tabular-nums; }
.ap-amount.is-in { color: #ff7a00; }
.ap-amount-plain { flex: none; font-size: 15px; font-weight: 600; font-variant-numeric: tabular-nums; }

/* 余额卡 */
.ap-balance {
  margin: 0 0 12px;
  padding: 20px 18px 16px;
  border-radius: 18px;
  background: linear-gradient(135deg, #1677ff, #46a0ff);
  color: #fff;
}
.ap-balance-label { margin: 0; font-size: 14px; opacity: .85; }
.ap-balance-num { margin: 6px 0 14px; font-size: 32px; font-weight: 700; font-variant-numeric: tabular-nums; }
.ap-balance-links { display: flex; gap: 18px; font-size: 13px; opacity: .9; }

/* 花呗卡 */
.ap-huabei { margin: 0 0 12px; padding: 16px 18px; border-radius: 16px; background: #fff; }
.ap-hb-head { display: flex; justify-content: space-between; align-items: baseline; }
.ap-hb-title { font-size: 16px; font-weight: 700; color: #1677ff; }
.ap-hb-sub { font-size: 12px; color: #8c8c8c; }
.ap-hb-due { margin: 12px 0 6px; font-size: 14px; color: #1f1f1f; }
.ap-hb-due b { font-size: 22px; font-weight: 700; color: #ff4d4f; font-variant-numeric: tabular-nums; }
.ap-hb-meta { margin: 0; display: flex; justify-content: space-between; font-size: 12px; color: #8c8c8c; }
.ap-hb-text { margin: 10px 0 0; font-size: 13px; color: #595959; line-height: 1.6; }

/* 底部标签栏：白色 */
.ap-tabbar {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  padding: 8px 0 calc(env(safe-area-inset-bottom) + 10px);
  background: #fff;
  border-top: .5px solid #ebebeb;
}
.ap-tab { display: flex; flex-direction: column; align-items: center; gap: 2px; color: #8c8c8c; font-size: 11px; }
.ap-tab.is-on { color: #1677ff; }

/* 账单详情 */
.ap-detail-top { flex: none; padding: max(env(safe-area-inset-top), 48px) 14px 8px 12px; background: #1677ff; color: #fff; }
.ap-detail { flex: 1; min-height: 0; overflow-y: auto; padding: 24px 18px 40px; display: flex; flex-direction: column; align-items: center; }
.ap-detail-cat { width: 56px; height: 56px; border-radius: 50%; display: grid; place-items: center; color: #fff; }
.ap-detail-amount { margin: 14px 0 4px; font-size: 36px; font-weight: 700; font-variant-numeric: tabular-nums; }
.ap-detail-amount.is-in { color: #ff7a00; }
.ap-detail-title { margin: 0 0 22px; font-size: 16px; color: #595959; }
.ap-detail-card { width: 100%; box-sizing: border-box; padding: 6px 16px; border-radius: 16px; background: #fff; }
.ap-detail-row { display: flex; justify-content: space-between; gap: 12px; margin: 0; padding: 12px 0; border-bottom: .5px solid #f0f0f0; font-size: 14px; }
.ap-detail-row:last-child { border-bottom: 0; }
.ap-detail-row span { color: #8c8c8c; flex: none; }
.ap-detail-row b { font-weight: 500; text-align: right; color: #1f1f1f; }
</style>


