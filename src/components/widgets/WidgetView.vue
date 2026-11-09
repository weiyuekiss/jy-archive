<script setup>
// 所有小组件的统一渲染：按 type 切换内容，黑白灰配色，支持液态玻璃质感
import { computed } from 'vue'
import { useNow } from '@/composables/useNow'
import { theme } from '@/stores/theme'

const props = defineProps({
  type: { type: String, required: true },
  // 小组件自定义数据，例如拍立得的 { photo }
  data: { type: Object, default: () => ({}) },
  // 是否启用液态玻璃质感（未传则跟随全局设置）
  glass: { type: Boolean, default: null }
})

const isGlass = computed(() => {
  // 主页大卡片保留原有封面与底部玻璃层，不叠加整卡磨砂效果
  return props.type !== 'profile-card-clean' && (props.glass !== null ? props.glass : true)
})

const emit = defineEmits(['custom-action'])
const now = useNow()
const pad = (n) => String(n).padStart(2, '0')
const WEEK_CN = ['日', '一', '二', '三', '四', '五', '六']
const WEEK_EN = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']
const MONTH_EN = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC']

const hh = computed(() => pad(now.value.getHours()))
const mm = computed(() => pad(now.value.getMinutes()))
const day = computed(() => now.value.getDate())
const weekCn = computed(() => WEEK_CN[now.value.getDay()])
const weekEn = computed(() => WEEK_EN[now.value.getDay()])
const monthEn = computed(() => MONTH_EN[now.value.getMonth()])

// 时钟指针角度
const hourDeg = computed(() => (now.value.getHours() % 12) * 30 + now.value.getMinutes() * 0.5)
const minDeg = computed(() => now.value.getMinutes() * 6)
const secDeg = computed(() => now.value.getSeconds() * 6)

// 本周 7 天
const week = computed(() => {
  const start = new Date(now.value)
  start.setDate(start.getDate() - start.getDay())
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start)
    d.setDate(start.getDate() + i)
    return { label: WEEK_EN[i][0], date: d.getDate(), today: i === now.value.getDay() }
  })
})

// 月历格子（前置空位 + 当月日期）
const monthCells = computed(() => {
  const y = now.value.getFullYear()
  const m = now.value.getMonth()
  const first = new Date(y, m, 1).getDay()
  const total = new Date(y, m + 1, 0).getDate()
  return [...Array(first).fill(''), ...Array.from({ length: total }, (_, i) => i + 1)]
})

// 纪念日：默认从今年 1 月 1 日算起
const ddays = computed(() => {
  const start = new Date(now.value.getFullYear(), 0, 1)
  return Math.floor((now.value - start) / 86400000) + 1
})

const coupleDays = computed(() => {
  if (!props.data?.startDate) return 0
  const start = new Date(`${props.data.startDate}T00:00:00`)
  if (Number.isNaN(start.getTime())) return 0
  const today = new Date(now.value.getFullYear(), now.value.getMonth(), now.value.getDate())
  return Math.max(0, Math.floor((today - start) / 86400000) + 1)
})
</script>

<template>
  <div class="widget" :class="[`w-${props.type}`, { 'is-glass': isGlass, 'is-flat': ['clock-bold', 'music-disc', 'profile-card-clean', 'couple-day'].includes(props.type) }]">
    <!-- 2×2 极简时钟 -->
    <div v-if="type === 'clock-analog'" class="clock">
      <span v-for="i in 12" :key="i" class="tick" :style="{ transform: `rotate(${i * 30}deg)` }" />
      <span class="hand hour" :style="{ transform: `rotate(${hourDeg}deg)` }" />
      <span class="hand min" :style="{ transform: `rotate(${minDeg}deg)` }" />
      <span class="hand sec" :style="{ transform: `rotate(${secDeg}deg)` }" />
      <span class="pin" />
    </div>

    <!-- 2×2 今日 -->
    <div v-else-if="type === 'date-card'" class="stack">
      <span class="eyebrow">{{ monthEn }} · {{ weekEn }}</span>
      <span class="big-num">{{ day }}</span>
      <span class="sub">星期{{ weekCn }}</span>
    </div>

    <!-- 2×2 一句话 -->
    <div v-else-if="type === 'quote'" class="stack tinted">
      <span class="quote-mark">“</span>
      <p class="quote-text">오늘도<br />수고했어요</p>
      <span class="sub">今天也辛苦了</span>
    </div>

    <!-- 2×2 天气（静态示例） -->
    <div v-else-if="type === 'weather'" class="stack">
      <span class="eyebrow">SEOUL</span>
      <svg class="cloud" viewBox="0 0 48 32" aria-hidden="true">
        <path d="M14 28h22a9 9 0 0 0 0-18 12 12 0 0 0-23 3A7.5 7.5 0 0 0 14 28z" />
      </svg>
      <span class="temp">18°</span>
      <span class="sub">多云 · 12° / 21°</span>
    </div>

    <!-- 4×2 时间横幅 -->
    <div v-else-if="type === 'time-wide'" class="time-wide">
      <span class="time">{{ hh }}<i>:</i>{{ mm }}</span>
      <div class="time-side">
        <span class="eyebrow">{{ monthEn }} {{ day }}</span>
        <span class="sub">{{ weekEn }} · have a nice day</span>
      </div>
    </div>

    <!-- 4×2 粗体数字时钟，无卡片底色 -->
    <div v-else-if="type === 'clock-bold'" class="clock-bold">
      <span>{{ hh }}</span><i>:</i><span>{{ mm }}</span>
    </div>

    <!-- 4×2 音乐播放（静态示例） -->
    <div v-else-if="type === 'music'" class="music">
      <div class="disc"><span /></div>
      <div class="music-info">
        <span class="title">Through the Night</span>
        <span class="sub">IU</span>
        <div class="bar"><span /></div>
        <div class="controls">
          <svg viewBox="0 0 24 24"><path d="M7 6v12M18 6l-9 6 9 6z" /></svg>
          <svg viewBox="0 0 24 24"><path d="M9 6v12M15 6v12" /></svg>
          <svg viewBox="0 0 24 24"><path d="M17 6v12M6 6l9 6-9 6z" /></svg>
        </div>
      </div>
    </div>

    <!-- 2×2 银色亚克力唱片机：点击唱片封面设置歌曲图片 -->
    <div v-else-if="type === 'music-disc'" class="music-disc-only">
      <div class="turntable-platter"><div class="acrylic-disc"><span class="record-label"><img v-if="data.cover" :src="data.cover" alt="歌曲封面" draggable="false" /><i v-else /></span></div></div>
      <div class="tonearm" aria-hidden="true"><span class="arm-base" /><span class="arm-bar" /><span class="arm-head" /></div>
      <button class="record-cover-hit" type="button" aria-label="设置唱片封面" @click.stop="emit('custom-action', { key: 'cover', title: '设置歌曲封面', eyebrow: 'ALBUM ART' })" />
    </div>

    <!-- 2×2 双人纪念日：无卡片底色，点击分别设置头像或日期 -->
    <div v-else-if="type === 'couple-day'" class="couple-day">
      <span class="couple-count">已经在一起 <b>{{ coupleDays }}</b> 天</span>
      <div class="couple-people">
        <button class="couple-avatar" type="button" aria-label="设置第一位头像" @click.stop="emit('custom-action', { key: 'avatar1', title: '设置第一位头像', eyebrow: 'YOUR PHOTO' })">
          <img v-if="data.avatar1" :src="data.avatar1" alt="第一位头像" draggable="false" />
          <svg v-else viewBox="0 0 24 24"><circle cx="12" cy="8" r="4"/><path d="M4 21v-2a4 4 0 0 1 4-4h8a4 4 0 0 1 4 4v2"/></svg>
        </button>
        <svg class="couple-cord" viewBox="0 0 100 48" aria-hidden="true"><path d="M0 24h18c9 0 8-15 17-15s8 30 17 30 8-30 17-30 8 15 13 15h18" /></svg>
        <button class="couple-avatar" type="button" aria-label="设置第二位头像" @click.stop="emit('custom-action', { key: 'avatar2', title: '设置第二位头像', eyebrow: 'PARTNER PHOTO' })">
          <img v-if="data.avatar2" :src="data.avatar2" alt="第二位头像" draggable="false" />
          <svg v-else viewBox="0 0 24 24"><circle cx="12" cy="8" r="4"/><path d="M4 21v-2a4 4 0 0 1 4-4h8a4 4 0 0 1 4 4v2"/></svg>
        </button>
      </div>
      <button class="couple-date" type="button" @click.stop="emit('custom-action', { key: 'startDate', title: '设置在一起的日期', eyebrow: 'OUR DAY' })">
        {{ data.startDate || '设置在一起的日期' }}
      </button>
    </div>

    <!-- 4×2 纪念日 -->
    <div v-else-if="type === 'dday'" class="dday tinted">
      <span class="eyebrow">D + DAY</span>
      <span class="big-num">{{ ddays }}<small>days</small></span>
      <span class="sub">从 {{ now.getFullYear() }}.01.01 开始</span>
    </div>

    <!-- 4×2 本周 -->
    <div v-else-if="type === 'week-strip'" class="week">
      <span class="eyebrow">THIS WEEK</span>
      <div class="week-row">
        <div v-for="(d, i) in week" :key="i" class="week-day" :class="{ on: d.today }">
          <span>{{ d.label }}</span>
          <b>{{ d.date }}</b>
        </div>
      </div>
    </div>

    <!-- 4×4 月历 -->
    <div v-else-if="type === 'calendar'" class="calendar">
      <div class="cal-head">
        <span class="cal-month">{{ now.getMonth() + 1 }}</span>
        <span class="eyebrow">{{ monthEn }} {{ now.getFullYear() }}</span>
      </div>
      <div class="cal-grid">
        <span v-for="w in WEEK_EN" :key="w" class="cal-w">{{ w[0] }}</span>
        <span v-for="(c, i) in monthCells" :key="'d' + i" class="cal-d" :class="{ on: c === day }">{{ c }}</span>
      </div>
    </div>

    <!-- 4×4 拍立得 -->
    <div v-else-if="type === 'polaroid'" class="polaroid">
      <div class="photo">
        <img v-if="data.photo" :src="data.photo" alt="拍立得照片" draggable="false" />
        <svg v-else viewBox="0 0 24 24" aria-hidden="true">
          <rect x="3" y="5" width="18" height="14" rx="2" />
          <circle cx="9" cy="10" r="1.6" />
          <path d="M3 17l5-5 4 4 3-3 6 6" />
        </svg>
      </div>
      <span class="caption">my little moment ♡</span>
    </div>

    <!-- 4×4 备忘 -->
    <div v-else-if="type === 'memo'" class="memo">
      <span class="eyebrow">TO DO LIST</span>
      <ul>
        <li class="done">早起喝一杯温水</li>
        <li class="done">整理桌面</li>
        <li>读 20 页书</li>
        <li>给植物浇水</li>
        <li>早点睡觉</li>
      </ul>
      <span class="sub">{{ monthEn }} {{ day }} · {{ weekEn }}</span>
    </div>

    <!-- 4×4 无文字主页大卡片：上方封面、下方半透明渐变留白 -->
    <div v-else-if="type === 'profile-card-clean'" class="profile-card-clean">
      <div class="clean-cover" @click.stop="emit('custom-action', { key: 'cover', title: '更换主页封面', eyebrow: 'COVER' })">
        <img v-if="data.cover" :src="data.cover" alt="主页封面" draggable="false" />
        <div v-else class="clean-cover-default" />
      </div>
      <div class="clean-glass-panel" aria-hidden="true" />
      <div class="clean-avatar" data-widget-action @click.stop="emit('custom-action', { key: 'avatar', title: '更换头像', eyebrow: 'AVATAR' })">
        <img v-if="data.avatar" :src="data.avatar" alt="头像" draggable="false" />
        <svg v-else viewBox="0 0 24 24"><circle cx="12" cy="8" r="4"/><path d="M4 21v-2a4 4 0 0 1 4-4h8a4 4 0 0 1 4 4v2"/></svg>
      </div>
    </div>

    <!-- 2×2 X 主页 -->
    <div
      v-else-if="type === 'x-profile'"
      class="x-card"
      @click="emit('custom-action', { key: 'avatar', title: '设置 X 主页头像', eyebrow: 'X PROFILE' })"
    >
      <div class="x-top">
        <div class="x-avatar">
          <img v-if="data.avatar" :src="data.avatar" alt="X 头像" draggable="false" />
          <svg v-else viewBox="0 0 24 24"><path d="M12 12a5 5 0 1 0 0-10 5 5 0 0 0 0 10zm0 2c-5 0-9 3-9 6v2h18v-2c0-3-4-6-9-6z" fill="currentColor"/></svg>
        </div>
        <svg class="x-logo" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" fill="currentColor"/>
        </svg>
      </div>
      <div class="x-meta">
        <span class="x-name">{{ data.name || 'Hyerin' }}</span>
        <span class="x-handle">@{{ data.handle || 'archive_h' }}</span>
      </div>
      <p class="x-tweet">“quiet days and warm coffee.” ☕</p>
      <div class="x-bottom">
        <span><b>1.2k</b> likes</span>
        <span>·</span>
        <span><b>SEOUL</b></span>
      </div>
    </div>

    <!-- 2×2 IG 快照 -->
    <div
      v-else-if="type === 'ig-card'"
      class="ig-card"
      @click="emit('custom-action', { key: 'photo', title: '设置 IG 照片', eyebrow: 'INSTAGRAM' })"
    >
      <div class="ig-top">
        <div class="ig-story-ring" @click.stop="emit('custom-action', { key: 'avatar', title: '设置 IG 头像', eyebrow: 'INSTAGRAM' })">
          <div class="ig-avatar">
            <img v-if="data.avatar" :src="data.avatar" alt="IG 头像" draggable="false" />
            <svg v-else viewBox="0 0 24 24"><circle cx="12" cy="8" r="4" fill="currentColor"/><path d="M4 20c0-4 4-6 8-6s8 2 8 6" fill="currentColor"/></svg>
          </div>
        </div>
        <span class="ig-user">daily.archive</span>
        <span class="ig-dots">•••</span>
      </div>
      <div class="ig-photo-box">
        <img v-if="data.photo" :src="data.photo" alt="IG 照片" draggable="false" />
        <div v-else class="ig-photo-fallback">
          <svg viewBox="0 0 24 24"><path d="M4 5h16v14H4z M4 15l5-5 4 4 3-3 4 4" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </div>
      </div>
      <div class="ig-bottom">
        <div class="ig-actions">
          <svg viewBox="0 0 24 24"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" fill="#ff4d67"/></svg>
          <svg viewBox="0 0 24 24"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" fill="none" stroke="currentColor" stroke-width="1.8"/></svg>
        </div>
        <span class="ig-likes"><b>1,420</b> likes</span>
      </div>
    </div>

    <!-- 2×2 韩系邮票 -->
    <div
      v-else-if="type === 'stamp'"
      class="stamp-card"
      @click="emit('custom-action', { key: 'photo', title: '设置邮票画面', eyebrow: 'STAMP' })"
    >
      <div class="stamp-inner">
        <div class="stamp-pic">
          <img v-if="data.photo" :src="data.photo" alt="邮票画面" draggable="false" />
          <div v-else class="stamp-pic-default">
            <svg viewBox="0 0 24 24"><path d="M12 2a4 4 0 0 0-4 4c0 3 4 8 4 8s4-5 4-8a4 4 0 0 0-4-4zm0 18v2m-6-1h12" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>
          </div>
        </div>
        <div class="stamp-badge">0.80</div>
        <div class="stamp-mark">
          <span>PAR AVION</span>
          <i>AIR MAIL · 2026</i>
        </div>
      </div>
    </div>

    <!-- 4×2 路程航线 -->
    <div v-else-if="type === 'route-line'" class="route-card">
      <div class="route-header">
        <span class="eyebrow">JOURNEY · FLIGHT 884</span>
        <span class="route-chip">ON TIME</span>
      </div>
      <div class="route-track">
        <div class="route-point">
          <span class="route-code">ICN</span>
          <span class="route-city">Seoul</span>
          <span class="route-time">09:40</span>
        </div>
        <div class="route-line-wrap">
          <span class="route-info-tag">11h 45m</span>
          <div class="route-dash-line">
            <span class="route-plane">✈</span>
          </div>
          <span class="route-dist">8,960 km</span>
        </div>
        <div class="route-point right">
          <span class="route-code">CDG</span>
          <span class="route-city">Paris</span>
          <span class="route-time">16:25</span>
        </div>
      </div>
      <div class="route-footer">
        <span>GATE <b>42</b></span>
        <span>SEAT <b>12A</b></span>
        <span>CABIN <b>FIRST</b></span>
      </div>
    </div>

    <!-- 4×2 胶片记忆 -->
    <div
      v-else-if="type === 'film-strip'"
      class="film-card"
      @click="emit('custom-action', { key: 'photo', title: '设置胶卷相片', eyebrow: 'FILM STRIP' })"
    >
      <div class="film-holes top">
        <span v-for="i in 8" :key="'th' + i" />
      </div>
      <div class="film-body">
        <div class="film-frame">
          <img v-if="data.photo" :src="data.photo" alt="胶片记忆" draggable="false" />
          <div v-else class="film-placeholder">
            <svg viewBox="0 0 24 24"><path d="M4 5h16v14H4z M4 15l5-5 4 4 3-3 4 4" fill="none" stroke="currentColor" stroke-width="1.6"/></svg>
          </div>
          <span class="film-num">01A</span>
        </div>
        <div class="film-frame">
          <img v-if="data.photo2 || data.photo" :src="data.photo2 || data.photo" alt="胶片记忆2" draggable="false" />
          <div v-else class="film-placeholder">
            <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="5" fill="none" stroke="currentColor" stroke-width="1.6"/></svg>
          </div>
          <span class="film-num">02A</span>
        </div>
        <div class="film-info">
          <b>KODAK 400</b>
          <small>ISO 400 · 35mm</small>
          <span class="film-mood">♡ warm days</span>
        </div>
      </div>
      <div class="film-holes bottom">
        <span v-for="i in 8" :key="'bh' + i" />
      </div>
    </div>

    <!-- 4×4 主页个人主页卡片 -->
    <div v-else-if="type === 'profile-card'" class="profile-card">
      <button
        class="pc-cover"
        type="button"
        aria-label="更换主页封面"
        @click.stop="emit('custom-action', { key: 'cover', title: '更换主页封面', eyebrow: 'COVER' })"
      >
        <img v-if="data.cover" :src="data.cover" alt="" draggable="false" />
        <span v-else class="pc-cover-default"><span>MY LITTLE SPACE</span><b>01 / JOURNAL</b></span>
        <span class="pc-cover-shade" />
        <span class="pc-cover-edit" aria-hidden="true">更换封面　↗</span>
      </button>

      <div class="pc-profile">
        <button
          class="pc-avatar"
          type="button"
          aria-label="更换主页头像"
          @click.stop="emit('custom-action', { key: 'avatar', title: '更换主页头像', eyebrow: 'AVATAR' })"
        >
          <img v-if="data.avatar" :src="data.avatar" alt="" draggable="false" />
          <svg v-else viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M4 21v-2a4 4 0 0 1 4-4h8a4 4 0 0 1 4 4v2"/></svg>
        </button>
        <div class="pc-identity">
          <button class="pc-name" type="button" @click.stop="emit('custom-action', { key: 'name', title: '修改主页名称', eyebrow: 'PROFILE TEXT', kind: 'text' })">{{ data.name || 'Jeanne' }} <span aria-hidden="true">✳</span></button>
          <button class="pc-quote" type="button" @click.stop="emit('custom-action', { key: 'quote', title: '修改主页签名', eyebrow: 'PROFILE TEXT', kind: 'text' })">{{ data.quote || 'collecting moments, not things ♡' }}</button>
        </div>
      </div>

      <div class="pc-stats-row">
        <button class="pc-stat" type="button" @click.stop="emit('custom-action', { key: 'stat1', title: '修改第一项数据', eyebrow: 'PROFILE TEXT', kind: 'text' })"><b>{{ data.stat1 || '128' }}</b><span>POSTS</span></button>
        <i aria-hidden="true" />
        <button class="pc-stat" type="button" @click.stop="emit('custom-action', { key: 'stat2', title: '修改第二项数据', eyebrow: 'PROFILE TEXT', kind: 'text' })"><b>{{ data.stat2 || '14.2k' }}</b><span>VIBES</span></button>
        <i aria-hidden="true" />
        <button class="pc-stat" type="button" @click.stop="emit('custom-action', { key: 'stat3', title: '修改第三项数据', eyebrow: 'PROFILE TEXT', kind: 'text' })"><b>{{ data.stat3 || '21°C' }}</b><span>SEOUL</span></button>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* ===== 通用外观：白底、细边框、柔和阴影 ===== */
.widget {
  position: relative;
  width: 100%;
  height: 100%;
  border-radius: 22px;
  background: #ffffff;
  border: 1px solid #ececec;
  box-shadow: 0 6px 18px rgba(0, 0, 0, 0.05);
  color: #2b2b2b;
  overflow: hidden;
  container-type: size;
  transition: background 0.35s ease, border-color 0.3s ease, box-shadow 0.35s ease;
}
.widget > * {
  width: 100%;
  height: 100%;
}

/* 无卡片式组件：直接融入桌面壁纸 */
.widget.is-flat{border:0;border-radius:0;background:transparent;box-shadow:none;overflow:visible;color:inherit}
.widget.is-flat::before,.widget.is-flat::after{display:none}
.widget.is-glass.is-flat{background:transparent;border:0;box-shadow:none;backdrop-filter:none;-webkit-backdrop-filter:none}
.widget.is-glass.is-flat::before,.widget.is-glass.is-flat::after{display:none}

/* ===== 液态玻璃质感（组件白色部分透出桌面壁纸） ===== */
.widget.is-glass {
  background: linear-gradient(135deg, rgba(246, 248, 247, 0.48) 0%, rgba(232, 238, 238, 0.28) 100%);
  -webkit-backdrop-filter: blur(24px) saturate(145%);
  backdrop-filter: blur(24px) saturate(145%);
  border: 1px solid rgba(255, 255, 255, 0.42);
  box-shadow: 0 10px 30px rgba(48, 58, 62, 0.07), inset 0 1px 1px rgba(255, 255, 255, 0.38);
}

/* 液态玻璃顶端曲面流光反光层 */
.widget.is-glass::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 48%;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.24) 0%, rgba(255, 255, 255, 0.015) 100%);
  border-bottom-left-radius: 28px;
  border-bottom-right-radius: 28px;
  pointer-events: none;
  z-index: 2;
}

/* 液态斜切折射流线 */
.widget.is-glass::after {
  content: '';
  position: absolute;
  top: -20%;
  right: -20%;
  width: 70%;
  height: 140%;
  background: linear-gradient(125deg, rgba(255, 255, 255, 0.25) 0%, rgba(255, 255, 255, 0) 60%);
  transform: rotate(15deg);
  pointer-events: none;
  z-index: 2;
}

/* 玻璃模式下各组件原本白底部分的通透化 */
.widget.is-glass .tinted {
  background: rgba(255, 255, 255, 0.22);
  -webkit-backdrop-filter: blur(8px);
  backdrop-filter: blur(8px);
}
.widget.is-glass .clock {
  background: rgba(255, 255, 255, 0.35);
  box-shadow: inset 0 2px 6px rgba(0, 0, 0, 0.04), 0 2px 10px rgba(255, 255, 255, 0.6);
  -webkit-backdrop-filter: blur(12px);
  backdrop-filter: blur(12px);
}
.widget.is-glass .x-card,
.widget.is-glass .ig-card,
.widget.is-glass .memo,
.widget.is-glass .route-card,
.widget.is-glass .film-card {
  background: transparent;
}
.widget.is-glass .x-avatar {
  background: rgba(255, 255, 255, 0.55);
  border: 1px solid rgba(255, 255, 255, 0.75);
}
.widget.is-glass .ig-photo-box {
  background: rgba(255, 255, 255, 0.35);
}
.widget.is-glass .polaroid {
  background: rgba(255, 255, 255, 0.42);
  -webkit-backdrop-filter: blur(16px);
  backdrop-filter: blur(16px);
}
.widget.is-glass .stamp-inner {
  background: rgba(255, 255, 255, 0.45);
  -webkit-backdrop-filter: blur(14px);
  backdrop-filter: blur(14px);
}
.widget.is-glass .pc-body {
  background: rgba(255, 255, 255, 0.38);
  -webkit-backdrop-filter: blur(18px);
  backdrop-filter: blur(18px);
  border-top: 1px solid rgba(255, 255, 255, 0.65);
}
.widget.is-glass .memo li {
  border-bottom-color: rgba(200, 200, 200, 0.35);
}
.widget.is-glass .bar {
  background: rgba(200, 200, 200, 0.3);
}

.widget.is-glass .profile-card-clean .clean-gradient {
  background: linear-gradient(180deg, transparent 15%, rgba(30, 29, 32, .16) 48%, rgba(30, 29, 32, .68) 100%);
}
.widget.is-glass .clock-bold { color: #3f4145; }

.tinted {
  background: #f6f6f4;
}
.eyebrow {
  font-size: 10px;
  letter-spacing: 0.18em;
  color: #9a9a9a;
}
.sub {
  font-size: 11px;
  color: #a5a5a5;
}
.big-num {
  font-size: 40cqh;
  font-weight: 300;
  line-height: 1;
  letter-spacing: -0.02em;
}

/* 2×2 通用纵向排版 */
.stack {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding: 14%;
}
.quote-mark {
  font-size: 28px;
  line-height: 0.6;
  color: #c9c9c9;
  font-family: Georgia, serif;
}
.quote-text {
  font-size: 14px;
  line-height: 1.5;
  color: #3a3a3a;
}
.cloud {
  width: 38%;
  fill: none;
  stroke: #8a8a8a;
  stroke-width: 2;
}
.temp {
  font-size: 26px;
  font-weight: 300;
}

/* 2×2 时钟 */
.clock {
  position: relative;
  width: 80%;
  height: 80%;
  margin: 10%;
  border-radius: 50%;
  background: #f7f7f7;
}
.tick {
  position: absolute;
  inset: 6%;
}
.tick::before {
  content: '';
  position: absolute;
  left: 50%;
  top: 0;
  width: 1.5px;
  height: 6%;
  background: #c4c4c4;
  transform: translateX(-50%);
}
.hand {
  position: absolute;
  left: 50%;
  bottom: 50%;
  margin-left: -1px;
  transform-origin: 50% 100%;
  border-radius: 2px;
}
.hand.hour { width: 3px; height: 24%; margin-left: -1.5px; background: #2b2b2b; }
.hand.min { width: 2px; height: 34%; background: #555; }
.hand.sec { width: 1px; height: 38%; margin-left: -0.5px; background: #b5b5b5; }
.pin {
  position: absolute;
  left: 50%;
  top: 50%;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #2b2b2b;
  transform: translate(-50%, -50%);
}

/* 4×2 粗体数字时钟（无卡片式） */
.clock-bold{display:flex;align-items:center;justify-content:center;gap:1.4%;font-size:62cqh;font-weight:500;letter-spacing:-.085em;color:#3f4145;font-variant-numeric:tabular-nums;line-height:1}
.clock-bold i{font-style:normal;color:#3f4145;transform:translateY(-3%)}

/* 4×2 时间横幅 */
.time-wide {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 8%;
}
.time {
  font-size: 48cqh;
  font-weight: 200;
  letter-spacing: -0.03em;
}
.time i {
  font-style: normal;
  color: #c4c4c4;
}
.time-side {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 6px;
}

/* 2×2 银色亚克力唱片机：唱片、唱臂与可点击封面 */
.music-disc-only{position:relative;display:grid;place-items:center;overflow:visible;background:transparent}
.turntable-platter{position:absolute;width:81%;aspect-ratio:1;border-radius:50%;display:grid;place-items:center;background:linear-gradient(145deg,rgba(255,255,255,.98),rgba(213,215,216,.88));box-shadow:0 4px 13px rgba(40,43,46,.18),inset 0 1px 3px #fff,inset 0 -2px 4px rgba(78,82,86,.16)}
.acrylic-disc{position:relative;width:89%;height:89%;border-radius:50%;display:grid;place-items:center;background:repeating-radial-gradient(circle at 50% 50%,#4e5052 0 1px,#303235 1px 2px,#55575a 2px 2.6px);box-shadow:inset 0 0 0 1px rgba(255,255,255,.28),0 2px 5px rgba(0,0,0,.2);animation:spin 12s linear infinite}
.record-label{width:49%;height:49%;display:grid;place-items:center;overflow:hidden;border-radius:50%;background:radial-gradient(circle,#f7f7f6 0%,#d3d4d3 72%,#aeb0b1 100%);box-shadow:0 0 0 2px rgba(255,255,255,.68),inset 0 1px 3px rgba(0,0,0,.18)}
.record-label img{width:100%;height:100%;object-fit:cover}
.record-label i{width:8%;height:8%;border-radius:50%;background:#858789;box-shadow:0 0 0 1px rgba(255,255,255,.6)}
.tonearm{position:absolute;z-index:2;right:9%;top:11%;width:29%;height:45%;filter:drop-shadow(1px 2px 2px rgba(0,0,0,.2));pointer-events:none}
.arm-base{position:absolute;right:3%;top:0;width:31%;aspect-ratio:1;border-radius:50%;background:radial-gradient(circle at 35% 30%,#fff,#b8bbbd 55%,#73777a);box-shadow:inset 0 0 0 1px rgba(255,255,255,.8)}
.arm-bar{position:absolute;right:17%;top:10%;width:8%;height:77%;border-radius:8px;background:linear-gradient(90deg,#777b7e 0%,#fff 28%,#c3c6c7 60%,#777b7e 100%);transform:rotate(-27deg);transform-origin:50% 0}
.arm-head{position:absolute;left:8%;bottom:9%;width:28%;height:18%;border-radius:3px;background:linear-gradient(135deg,#f8f8f7,#85898b);transform:rotate(-27deg);box-shadow:0 1px 2px rgba(0,0,0,.2)}
.record-cover-hit{position:absolute;z-index:3;left:50%;top:50%;width:40%;aspect-ratio:1;transform:translate(-50%,-50%);border:0;border-radius:50%;background:transparent;cursor:pointer}
@media(prefers-reduced-motion:reduce){.acrylic-disc{animation:none}}

/* 4×2 音乐 */
.music {
  display: flex;
  align-items: center;
  gap: 6%;
  padding: 0 7%;
}
.disc {
  flex: none;
  height: 70%;
  aspect-ratio: 1;
  border-radius: 50%;
  background: repeating-radial-gradient(#2b2b2b 0 2px, #3a3a3a 2px 4px);
  display: grid;
  place-items: center;
  animation: spin 8s linear infinite;
}
.disc span {
  width: 30%;
  height: 30%;
  border-radius: 50%;
  background: #f1f1f1;
}
@keyframes spin {
  to { transform: rotate(360deg); }
}
.music-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.title {
  font-size: 14px;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.bar {
  height: 2px;
  margin-top: 6px;
  background: #ececec;
  border-radius: 2px;
}
.bar span {
  display: block;
  width: 40%;
  height: 100%;
  background: #2b2b2b;
  border-radius: 2px;
}
.controls {
  display: flex;
  justify-content: space-between;
  margin-top: 6px;
  padding: 0 8%;
}
.controls svg {
  width: 18px;
  height: 18px;
  fill: none;
  stroke: #2b2b2b;
  stroke-width: 1.6;
  stroke-linecap: round;
  stroke-linejoin: round;
}

/* 4×2 纪念日 */
.dday {
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 6px;
  padding: 0 8%;
}
.dday small {
  font-size: 12px;
  margin-left: 6px;
  color: #9a9a9a;
  letter-spacing: 0.1em;
}

/* 2×2 双人纪念日：融入壁纸的无卡片布局 */
.couple-day{display:flex;flex-direction:column;align-items:center;justify-content:space-between;padding:9% 5%;background:transparent;color:inherit}
.couple-count{font-size:clamp(9px,9cqh,14px);letter-spacing:.04em;color:inherit;white-space:nowrap}
.couple-count b{font-size:1.5em;font-weight:600;margin:0 2px;font-variant-numeric:tabular-nums}
.couple-people{width:100%;flex:1;min-height:0;display:flex;align-items:center;justify-content:space-between;position:relative}
.couple-avatar{position:relative;z-index:1;flex:none;width:32%;aspect-ratio:1;padding:0;border:0;border-radius:50%;overflow:hidden;background:rgba(150,150,150,.16);color:rgba(90,90,90,.55);display:grid;place-items:center;cursor:pointer}
.couple-avatar img{width:100%;height:100%;object-fit:cover}
.couple-avatar svg{width:52%;height:52%;fill:currentColor;stroke:currentColor;stroke-width:1.4}
.couple-cord{position:absolute;left:26%;width:48%;height:44%;overflow:visible;fill:none;stroke:rgba(255,255,255,.96);stroke-width:4;stroke-linecap:round;filter:drop-shadow(0 1px 2px rgba(0,0,0,.2));pointer-events:none}
.couple-date{border:0;background:transparent;color:inherit;opacity:.72;font:inherit;font-size:clamp(8px,7cqh,11px);cursor:pointer}

/* 4×2 本周 */
.week {
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 10px;
  padding: 0 7%;
}
.week-row {
  display: flex;
  justify-content: space-between;
}
.week-day {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  width: 12%;
  padding: 6px 0;
  border-radius: 12px;
  font-size: 10px;
  color: #a5a5a5;
}
.week-day b {
  font-size: 15px;
  font-weight: 400;
  color: #2b2b2b;
}
.week-day.on {
  background: #2b2b2b;
  color: #bdbdbd;
}
.week-day.on b {
  color: #fff;
}

/* 4×4 月历 */
.calendar {
  display: flex;
  flex-direction: column;
  gap: 6%;
  padding: 8%;
}
.cal-head {
  display: flex;
  align-items: baseline;
  gap: 10px;
}
.cal-month {
  font-size: 15cqh;
  font-weight: 300;
  line-height: 1;
}
.cal-grid {
  flex: 1;
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  align-content: space-between;
  text-align: center;
  font-size: 12px;
}
.cal-w {
  font-size: 10px;
  color: #b5b5b5;
}
.cal-d {
  justify-self: center;
  width: 24px;
  line-height: 24px;
  border-radius: 50%;
  color: #3a3a3a;
}
.cal-d.on {
  background: #2b2b2b;
  color: #fff;
}

/* 4×4 拍立得 */
.polaroid {
  display: flex;
  flex-direction: column;
  padding: 7% 7% 0;
  background: #fafafa;
}
.photo {
  flex: 1;
  min-height: 0;
  border-radius: 6px;
  overflow: hidden;
  background: linear-gradient(160deg, #e9e9e7, #d9d9d6);
  display: grid;
  place-items: center;
  cursor: pointer;
}
.photo img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  pointer-events: none;
}
.photo svg {
  width: 22%;
  fill: none;
  stroke: #a9a9a6;
  stroke-width: 1.4;
  stroke-linejoin: round;
}
.caption {
  padding: 5% 0;
  text-align: center;
  font-size: 13px;
  color: #7a7a7a;
  font-family: 'Segoe Print', 'Comic Sans MS', cursive;
}

/* 4×4 备忘 */
.memo {
  display: flex;
  flex-direction: column;
  gap: 8%;
  padding: 9%;
}
.memo ul {
  flex: 1;
  list-style: none;
  display: flex;
  flex-direction: column;
  justify-content: space-around;
}
.memo li {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 14px;
  padding-bottom: 8px;
  border-bottom: 1px dashed #ececec;
}
.memo li::before {
  content: '';
  width: 12px;
  height: 12px;
  border: 1.5px solid #bdbdbd;
  border-radius: 4px;
}
.memo li.done {
  color: #b5b5b5;
  text-decoration: line-through;
}
.memo li.done::before {
  background: #2b2b2b;
  border-color: #2b2b2b;
}

/* ===== 2×2 X 主页 ===== */
.x-card {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding: 12%;
  background: #ffffff;
  cursor: pointer;
}
.x-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.x-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  overflow: hidden;
  background: #f0f0f2;
  color: #8c8c92;
  display: flex;
  align-items: center;
  justify-content: center;
}
.x-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.x-avatar svg {
  width: 60%;
  height: 60%;
}
.x-logo {
  width: 16px;
  height: 16px;
  color: #1a1a1c;
}
.x-meta {
  display: flex;
  flex-direction: column;
  gap: 1px;
}
.x-name {
  font-size: 13px;
  font-weight: 600;
  color: #1e1e20;
  line-height: 1.2;
}
.x-handle {
  font-size: 10px;
  color: #9a9a9f;
}
.x-tweet {
  font-size: 11px;
  line-height: 1.4;
  color: #404044;
}
.x-bottom {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 10px;
  color: #9a9a9f;
}
.x-bottom b {
  color: #2b2b2b;
}

/* ===== 2×2 IG 快照 ===== */
.ig-card {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding: 8% 8% 10%;
  background: #ffffff;
  cursor: pointer;
}
.ig-top {
  display: flex;
  align-items: center;
  gap: 6px;
}
.ig-story-ring {
  background: linear-gradient(45deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%);
  padding: 1.5px;
  border-radius: 50%;
  display: flex;
}
.ig-avatar {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: #ffffff;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
}
.ig-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.ig-avatar svg {
  width: 65%;
  height: 65%;
  color: #999;
}
.ig-user {
  font-size: 11px;
  font-weight: 600;
  color: #222226;
}
.ig-dots {
  margin-left: auto;
  font-size: 9px;
  color: #a0a0a5;
  letter-spacing: 1px;
}
.ig-photo-box {
  width: 100%;
  aspect-ratio: 16 / 10;
  border-radius: 10px;
  overflow: hidden;
  background: #f4f4f6;
  margin: 3px 0;
}
.ig-photo-box img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.ig-photo-fallback {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #b0b0b8;
}
.ig-photo-fallback svg {
  width: 24px;
  height: 24px;
}
.ig-bottom {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.ig-actions {
  display: flex;
  gap: 6px;
}
.ig-actions svg {
  width: 13px;
  height: 13px;
}
.ig-likes {
  font-size: 10px;
  color: #666;
}
.ig-likes b {
  color: #222;
}

/* ===== 2×2 韩系邮票 ===== */
.stamp-card {
  padding: 7%;
  background: #ffffff;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}
.stamp-inner {
  width: 100%;
  height: 100%;
  border: 1.5px dashed #cfcfd3;
  border-radius: 10px;
  padding: 8%;
  position: relative;
  display: flex;
  flex-direction: column;
  background: #fafaf8;
  box-shadow: inset 0 0 10px rgba(0, 0, 0, 0.02);
}
.stamp-pic {
  flex: 1;
  border-radius: 6px;
  overflow: hidden;
  background: #edece8;
  display: flex;
  align-items: center;
  justify-content: center;
}
.stamp-pic img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.stamp-pic-default {
  color: #9d9d96;
}
.stamp-pic-default svg {
  width: 26px;
  height: 26px;
}
.stamp-badge {
  position: absolute;
  top: 11%;
  right: 12%;
  font-size: 11px;
  font-weight: 700;
  color: #4b4b4e;
  letter-spacing: 0.04em;
}
.stamp-mark {
  position: absolute;
  bottom: 10%;
  right: 10%;
  transform: rotate(-10deg);
  text-align: right;
  color: rgba(120, 120, 130, 0.7);
  pointer-events: none;
}
.stamp-mark span {
  display: block;
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.12em;
  border-bottom: 1px solid rgba(120, 120, 130, 0.4);
}
.stamp-mark i {
  display: block;
  font-style: normal;
  font-size: 7px;
  letter-spacing: 0.06em;
}

/* ===== 4×2 路程航线 ===== */
.route-card {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding: 6% 8%;
  background: #ffffff;
}
.route-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.route-chip {
  font-size: 9px;
  font-weight: 600;
  color: #15803d;
  background: #dcfce7;
  padding: 2px 7px;
  border-radius: 999px;
}
.route-track {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.route-point {
  display: flex;
  flex-direction: column;
  min-width: 44px;
}
.route-point.right {
  align-items: flex-end;
}
.route-code {
  font-size: 24px;
  font-weight: 700;
  letter-spacing: 0.05em;
  line-height: 1;
  color: #1e1e22;
}
.route-city {
  font-size: 10px;
  color: #8c8c92;
  margin-top: 2px;
}
.route-time {
  font-size: 11px;
  font-weight: 500;
  color: #4a4a4e;
  margin-top: 1px;
}
.route-line-wrap {
  flex: 1;
  margin: 0 16px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}
.route-info-tag {
  font-size: 9px;
  font-weight: 500;
  color: #888;
}
.route-dash-line {
  width: 100%;
  height: 2px;
  border-top: 1.5px dashed #c8c8ce;
  position: relative;
  display: flex;
  justify-content: center;
  align-items: center;
}
.route-plane {
  position: absolute;
  top: -8px;
  font-size: 13px;
  color: #1e1e22;
  transform: rotate(90deg);
}
.route-dist {
  font-size: 9px;
  color: #a8a8ae;
  letter-spacing: 0.05em;
}
.route-footer {
  display: flex;
  justify-content: space-between;
  font-size: 10px;
  color: #8c8c92;
  border-top: 1px solid #f2f2f4;
  padding-top: 6px;
}
.route-footer b {
  color: #222;
  margin-left: 2px;
}

/* ===== 4×2 胶片记忆 ===== */
.film-card {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding: 5px 0;
  background: #242426;
  color: #f2f2f4;
  border-radius: 20px;
  cursor: pointer;
}
.film-holes {
  display: flex;
  justify-content: space-around;
  padding: 1px 12px;
}
.film-holes span {
  width: 9px;
  height: 5px;
  background: #46464a;
  border-radius: 1.5px;
}
.film-body {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 0 16px;
  flex: 1;
}
.film-frame {
  width: 68px;
  height: 68px;
  border-radius: 6px;
  overflow: hidden;
  background: #18181a;
  position: relative;
  border: 1px solid #38383c;
}
.film-frame img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.film-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #6a6a70;
}
.film-placeholder svg {
  width: 24px;
  height: 24px;
}
.film-num {
  position: absolute;
  bottom: 2px;
  right: 4px;
  font-size: 8px;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.85);
  text-shadow: 0 1px 2px #000;
}
.film-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.film-info b {
  font-size: 13px;
  letter-spacing: 0.1em;
  color: #facc15;
}
.film-info small {
  font-size: 9px;
  color: #9c9ca4;
}
.film-mood {
  font-size: 10px;
  color: #e2e2e8;
  font-style: italic;
  margin-top: 4px;
}

/* 4×4 无文字主页大卡片：白色干净基底，底部保留轻盈磨砂层 */
.profile-card-clean{position:relative;width:100%;height:100%;overflow:hidden;isolation:isolate;border-radius:20px!important;background:#fff;cursor:default}
.profile-card-clean .clean-cover,.profile-card-clean .clean-glass-panel{border-radius:inherit}
.clean-cover{position:absolute;inset:0 0 43%;overflow:hidden;cursor:pointer;background:#fff}
.clean-cover>img,.clean-cover-default{display:block;width:100%;height:100%;object-fit:cover}
.clean-cover-default{background:linear-gradient(145deg,#fff 0%,#fdfdfd 52%,#f7f7f7 100%)}
.clean-glass-panel{position:absolute;inset:53% 0 0;background:linear-gradient(180deg,rgba(255,255,255,.2) 0%,rgba(255,255,255,.82) 38%,#fff 100%);border-top:1px solid rgba(255,255,255,.82);backdrop-filter:blur(20px) saturate(145%);-webkit-backdrop-filter:blur(20px) saturate(145%);pointer-events:none}
.clean-avatar{position:absolute;left:50%;top:53%;width:27%;aspect-ratio:1;transform:translate(-50%,-50%);display:grid;place-items:center;overflow:hidden;border:3px solid rgba(255,255,255,.92);border-radius:50%;background:rgba(255,255,255,.78);color:#8f8b83;backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);box-shadow:0 8px 24px rgba(45,40,34,.12);cursor:pointer}
.clean-avatar img{width:100%;height:100%;object-fit:cover}
.clean-avatar svg{width:48%;fill:currentColor}
@media(prefers-reduced-motion:reduce){.widget.is-flat .disc,.widget.is-flat .disc-wave i{animation:none}}

/* 主页个人卡片：尺寸全部由组件自身布局决定，不依赖容器查询单位 */
.profile-card{display:grid;grid-template-rows:48% 1fr auto;width:100%;height:100%;overflow:hidden;background:#fff;color:#242424}
.pc-cover{position:relative;display:block;width:100%;height:100%;overflow:hidden;padding:0;border:0;border-radius:0;background:#e9edf1;text-align:left;cursor:pointer}
.pc-cover>img{display:block;width:100%;height:100%;object-fit:cover}
.pc-cover-default{position:absolute;inset:0;display:flex;align-items:flex-start;justify-content:space-between;padding:clamp(14px,5%,24px);background:linear-gradient(140deg,#e7edf3 0%,#ccd5df 52%,#aab5c3 100%);color:#fff}
.pc-cover-default span,.pc-cover-default b{padding:5px 9px;border-radius:20px;background:#47556940;font-size:clamp(8px,2.2vw,11px);font-weight:600;letter-spacing:.09em}
.pc-cover-shade{position:absolute;inset:0;background:linear-gradient(180deg,#17203308 45%,#17203335 100%);pointer-events:none}
.pc-cover-edit{position:absolute;right:clamp(12px,4%,20px);bottom:clamp(10px,4%,18px);padding:6px 10px;border:1px solid #ffffff80;border-radius:20px;background:#ffffffbd;color:#3d4652;font-size:10px;opacity:0;transition:opacity .18s}
.pc-cover:focus-visible .pc-cover-edit,.pc-cover:active .pc-cover-edit{opacity:1}
.pc-profile{position:relative;display:flex;align-items:center;gap:clamp(12px,4%,20px);min-height:0;padding:clamp(13px,4%,22px) 8% 8%}
.pc-avatar{flex:none;width:clamp(48px,24%,82px);aspect-ratio:1;display:grid;place-items:center;overflow:hidden;padding:0;border:0;border-radius:50%;background:#f0f2f5;color:#9097a3;box-shadow:0 4px 14px #2222221c;cursor:pointer}
.pc-avatar img{width:100%;height:100%;object-fit:cover}
.pc-avatar svg{width:52%;fill:currentColor}
.pc-identity{display:flex;min-width:0;flex:1;flex-direction:column;align-items:flex-start;gap:6px}
.pc-name,.pc-quote{max-width:100%;padding:0;border:0;background:transparent;text-align:left;cursor:pointer}
.pc-name{overflow:hidden;color:#202124;font-size:clamp(14px,4vw,19px);font-weight:650;text-overflow:ellipsis;white-space:nowrap}
.pc-name span{font-size:.72em;color:#64748b}
.pc-quote{display:-webkit-box;overflow:hidden;color:#85878c;font-size:clamp(10px,2.8vw,13px);font-style:italic;line-height:1.45;-webkit-box-orient:vertical;-webkit-line-clamp:2}
.pc-stats-row{display:grid;grid-template-columns:1fr 1px 1fr 1px 1fr;align-items:center;min-height:58px;margin:0 8% clamp(14px,5%,24px);padding-top:10px;border-top:1px solid #2424240d}
.pc-stats-row>i{width:1px;height:24px;background:#24242412}
.pc-stat{display:flex;min-width:0;flex-direction:column;align-items:center;gap:4px;padding:4px;border:0;background:transparent;color:inherit;cursor:pointer}
.pc-stat b{max-width:100%;overflow:hidden;font-size:clamp(12px,3.5vw,16px);font-weight:650;text-overflow:ellipsis;white-space:nowrap}
.pc-stat span{color:#9a9ca1;font-size:clamp(8px,2.2vw,10px);letter-spacing:.11em}
.pc-profile button:focus-visible,.pc-stat:focus-visible,.pc-cover:focus-visible{outline:2px solid #78869a;outline-offset:-3px}

</style>

