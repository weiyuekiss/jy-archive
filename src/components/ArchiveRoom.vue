<script setup>
import { computed, onMounted, ref } from 'vue'
import { loadValue, saveValue } from '@/stores/db'
import PixelArtwork from './PixelArtwork.vue'
import AnimalAvatar from './AnimalAvatar.vue'
import { animalFrames, characterFrame } from './animalFrames'

const props = defineProps({ characters: { type: Array, default: () => [] } })
const emit = defineEmits(['back', 'create', 'open', 'select', 'frame'])
const homes = ref([{ id: 'cloud', name: '云朵小屋', theme: 'blue' }, { id: 'berry', name: '草莓花园', theme: 'pink' }])
const placements = ref({})
const frames = ref({})
const activeHome = ref('all')
const query = ref('')
const ready = ref(false)
const editor = ref(null)
const homeName = ref('')
const homeTheme = ref('blue')
const selectedCharacter = ref(null)
const notice = ref('')
const themes = [{ id: 'blue', name: '晴空蓝' }, { id: 'pink', name: '樱花粉' }, { id: 'cream', name: '奶油黄' }]
const animals = animalFrames
const currentHome = computed(() => homes.value.find(home => home.id === activeHome.value))
const visibleCharacters = computed(() => props.characters.filter(character => {
  const home = placements.value[character.id]
  const matchesHome = activeHome.value === 'all' || (activeHome.value === 'unplaced' ? !homes.value.some(item => item.id === home) : home === activeHome.value)
  return matchesHome && `${character.name} ${character.occupation || ''}`.toLowerCase().includes(query.value.trim().toLowerCase())
}))
const title = computed(() => currentHome.value?.name || (activeHome.value === 'unplaced' ? '等待入住' : '所有小伙伴'))
const featured = computed(() => visibleCharacters.value[0])
onMounted(async () => {
  const saved = await loadValue('jyos_archive_homes')
  if (saved && Array.isArray(saved.homes)) {
    homes.value = saved.homes.filter(home => typeof home.id === 'string' && typeof home.name === 'string')
    placements.value = saved.placements && typeof saved.placements === 'object' ? saved.placements : {}
    frames.value = saved.frames && typeof saved.frames === 'object' ? saved.frames : {}
  }
  ready.value = true
})
async function persist() {
  if (!ready.value) return
  await saveValue('jyos_archive_homes', { homes: homes.value, placements: placements.value, frames: frames.value })
}
function countHome(id) { return props.characters.filter(character => placements.value[character.id] === id).length }
function frameFor(character) { return character.avatarFrame || frames.value[character.id] || characterFrame(character) }
function homeFor(character) { return homes.value.find(home => home.id === placements.value[character.id])?.name || '等待入住' }
function editHome(home = null) {
  selectedCharacter.value = null
  editor.value = home ? home.id : 'new'
  homeName.value = home?.name || ''
  homeTheme.value = home?.theme || 'blue'
}
function saveHome() {
  const name = homeName.value.trim()
  if (!name || !ready.value) return
  if (editor.value === 'new') {
    const id = `home-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
    homes.value.push({ id, name, theme: homeTheme.value })
    activeHome.value = id
  } else {
    const home = homes.value.find(item => item.id === editor.value)
    if (home) Object.assign(home, { name, theme: homeTheme.value })
  }
  editor.value = null
  void persist()
}
function moveCharacter(character, homeId) {
  if (homeId) placements.value[character.id] = homeId
  else delete placements.value[character.id]
  notice.value = `${character.name}已${homeId ? `入住${homes.value.find(home => home.id === homeId)?.name}` : '移到等待入住'}`
  selectedCharacter.value = null
  void persist()
}
function setFrame(character, animal) { emit('frame', character, animal); frames.value[character.id] = animal; void persist() }
</script>

<template>
  <section class="archive-room" :class="`theme-${currentHome?.theme || 'blue'}`" aria-label="角色档案室">
    <header class="archive-header"><button class="paper-button" aria-label="返回角色地图" @click="emit('back')">← 地图</button><div><span>SOREN POCKET / COLLECTION</span><strong>星星档案室</strong></div><button class="paper-button pink-button" @click="emit('create')">＋ 新角色</button></header>
    <main class="archive-layout">
      <aside class="home-sidebar">
        <div class="sidebar-title"><span>我的档案家园</span><small>MY LITTLE HOMES</small></div>
        <button class="home-tab all-home" :class="{ active: activeHome === 'all' }" @click="activeHome = 'all'"><span class="tab-symbol">✦</span><span>所有小伙伴<small>一起收藏每个故事</small></span><b>{{ characters.length }}</b></button>
        <button v-for="home in homes" :key="home.id" class="home-tab" :class="[{ active: activeHome === home.id }, `tab-${home.theme}`]" @click="activeHome = home.id"><PixelArtwork kind="home"/><span>{{ home.name }}<small>{{ countHome(home.id) }} 位小伙伴入住</small></span><span class="tab-dot">·</span></button>
        <button class="home-tab waiting-tab" :class="{ active: activeHome === 'unplaced' }" @click="activeHome = 'unplaced'"><span class="tab-symbol">♡</span><span>等待入住<small>给小伙伴找一个家</small></span></button>
        <button class="new-home" :disabled="!ready" @click="editHome()">＋ 建一座新家园</button>
        <div class="sidebar-note" aria-hidden="true"><PixelArtwork kind="tea"/><span>把喜欢的故事<br/>好好收藏起来。</span><small>A LITTLE PLACE FOR YOU</small></div>
      </aside>
      <div class="archive-main">
        <section class="archive-hero">
          <div class="hero-copy"><span class="archive-overline">✦ THE LITTLE ARCHIVE CLUB ✦</span><h1>{{ title }}</h1><p>{{ currentHome ? '住在同一座小屋，把日常写成故事。' : '每一位小伙伴，都有属于自己的小小宇宙。' }}</p><div class="hero-actions"><span>{{ visibleCharacters.length }} 位小伙伴 · 今日也很可爱</span><button v-if="currentHome" @click="editHome(currentHome)">装扮家园 ↗</button><button v-else :disabled="!ready" @click="editHome()">＋ 新建家园</button></div></div>
          <div class="hero-art" aria-hidden="true"><PixelArtwork class="hero-cloud" kind="cloud"/><div class="mini-handheld"><span>POCKET FRIENDS</span><div class="handheld-lcd"><PixelArtwork kind="home"/><i>♡</i></div><div class="mini-controls"><b>✚</b><small>● ●</small></div></div><PixelArtwork class="hero-apple" kind="apple"/><PixelArtwork class="hero-bandage" kind="bandage"/><i class="hero-spark">✦</i></div>
        </section>
        <div class="collection-toolbar"><div><span class="tiny-square"/> 小伙伴陈列架 <small>FRIENDS COLLECTION</small></div><label class="archive-search"><span aria-hidden="true">⌕</span><input v-model="query" aria-label="搜索角色名字或身份" placeholder="寻找小伙伴…"/></label></div>
        <div class="collection-body">
          <section class="friend-collection" aria-label="角色列表" :aria-busy="!ready">
            <div v-if="!ready" class="collection-empty">正在打开档案室…</div>
            <template v-else>
              <article v-for="character in visibleCharacters" :key="character.id" class="friend-card">
                <button class="friend-open" :aria-label="`打开${character.name}的档案`" @click="emit('open', character)"><AnimalAvatar :src="character.avatar" :name="character.name" :animal="frameFor(character)"/><strong>{{ character.name }}</strong><span>{{ character.occupation || '故事里的小伙伴' }}</span></button>
                <button class="friend-home" :aria-label="`为${character.name}选择家园和头像框`" :disabled="!ready" @click="selectedCharacter = character"><span>⌂</span> {{ homeFor(character) }} <small>⌄</small></button>
                <button class="friend-options" :aria-label="`选择删除${character.name}`" @click="emit('select', character)">⋯</button>
              </article>
              <button class="friend-card add-friend" @click="emit('create')"><span>＋</span><strong>遇见新朋友</strong><small>添加一份新的故事</small></button>
              <div v-if="!visibleCharacters.length" class="collection-empty"><PixelArtwork kind="tea"/><p>{{ query ? '还没有找到这位小伙伴' : '小屋准备好了，等小伙伴来入住。' }}</p><button v-if="!query && activeHome !== 'all'" class="paper-button" @click="activeHome = 'all'">从所有小伙伴中选择</button></div>
            </template>
          </section>
          <aside class="portrait-display"><div class="portrait-title"><span>✧ 今日的故事</span><small>CHARACTER DIARY</small></div><button v-if="featured" class="display-photo" :aria-label="`查看${featured.name}的档案`" @click="emit('open', featured)"><img v-if="featured.avatar" :src="featured.avatar" :alt="featured.name"/><AnimalAvatar v-else :animal="frameFor(featured)"/><span>{{ featured.name }}</span></button><div v-else class="display-photo empty-portrait"><AnimalAvatar animal="bunny"/><span>为故事留一个位置</span></div><PixelArtwork class="portrait-sticker" kind="bandage"/><p>{{ featured?.details || '在小小的家园里，收集一点温柔，和很多很多的奇遇。' }}</p><div class="diary-footer"><span>WITH LOVE, ALWAYS</span><PixelArtwork kind="banana"/></div></aside>
        </div>
        <footer class="archive-footer"><span>✦ 收藏故事，也收藏相遇。</span><small>SAVED IN YOUR LITTLE POCKET</small></footer>
        <p class="archive-notice" role="status">{{ notice }}</p>
      </div>
    </main>
    <div v-if="editor || selectedCharacter" class="archive-modal" @click.self="editor = null; selectedCharacter = null" @keydown.esc="editor = null; selectedCharacter = null">
      <section class="home-dialog" role="dialog" aria-modal="true" aria-labelledby="home-dialog-title">
        <button class="dialog-close" aria-label="关闭" @click="editor = null; selectedCharacter = null">×</button>
        <template v-if="editor"><PixelArtwork class="dialog-house" kind="home"/><span class="archive-overline">A HOME FOR YOUR STORIES</span><h2 id="home-dialog-title">{{ editor === 'new' ? '建一座小小家园' : '装扮我的家园' }}</h2><form @submit.prevent="saveHome"><label class="home-name">家园名字<input v-model="homeName" maxlength="20" placeholder="例如：月亮兔兔屋" autofocus required/></label><fieldset class="theme-picker"><legend>挑一份喜欢的颜色</legend><label v-for="theme in themes" :key="theme.id" :class="`swatch-${theme.id}`"><input v-model="homeTheme" type="radio" :value="theme.id" name="home-theme"/><span/>{{ theme.name }}</label></fieldset><button class="dialog-save" :disabled="!homeName.trim() || !ready">{{ editor === 'new' ? '小屋准备好啦' : '保存家园' }} ♡</button></form></template>
        <template v-else-if="selectedCharacter"><AnimalAvatar class="dialog-avatar" :src="selectedCharacter.avatar" :animal="frameFor(selectedCharacter)"/><h2 id="home-dialog-title">{{ selectedCharacter.name }}的小小归属</h2><fieldset class="frame-picker"><legend>选择动物头像框</legend><button v-for="animal in animals" :key="animal.id" :class="{ chosen: frameFor(selectedCharacter) === animal.id }" :aria-pressed="frameFor(selectedCharacter) === animal.id" @click="setFrame(selectedCharacter, animal.id)">{{ animal.name }}</button></fieldset><p class="choose-home-label">搬进喜欢的家园</p><div class="move-home-list"><button v-for="home in homes" :key="home.id" @click="moveCharacter(selectedCharacter, home.id)"><PixelArtwork kind="home"/><span>{{ home.name }}</span><b>{{ placements[selectedCharacter.id] === home.id ? '已入住 ✓' : '入住 →' }}</b></button><button @click="moveCharacter(selectedCharacter, '')"><span>♡ 等待入住</span><b>暂不分配</b></button></div><button class="new-home" @click="editHome()">＋ 新建一个家园</button></template>
      </section>
    </div>
  </section>
</template>

<style scoped>
.archive-room{--accent:#91b2cc;--soft:#eaf4fb;--paper:#fffcff;position:fixed;inset:0;z-index:42;overflow:auto;background-color:#f7f5fc;background-image:linear-gradient(#b8b1d00d 1px,transparent 1px),linear-gradient(90deg,#b8b1d00d 1px,transparent 1px);background-size:12px 12px;color:#786c87;font-family:ui-monospace,"PingFang SC",monospace;padding:env(safe-area-inset-top) 0 env(safe-area-inset-bottom);box-sizing:border-box}.theme-pink{--accent:#c79cb4;--soft:#fbeef5}.theme-cream{--accent:#c5b08c;--soft:#faf3e4}button,input{font:inherit}button{cursor:pointer;color:inherit}button:disabled{opacity:.5;cursor:default}.archive-header{min-height:86px;display:flex;align-items:center;justify-content:space-between;gap:18px;max-width:1300px;margin:auto;padding:0 34px;border-bottom:1px solid #e1dbea}.archive-header>div{text-align:center}.archive-header strong{display:block;font-size:21px;letter-spacing:.16em;font-weight:600;margin-top:5px}.archive-header>div>span{font-size:8px;letter-spacing:.2em;color:#aa9cb8}.paper-button{border:1px solid #c5bfd7;box-shadow:2px 2px #e2dbea;padding:9px 13px;background:#fffafd;border-radius:4px;font-size:11px}.pink-button{background:#f9e9f1;border-color:#d9b6c9}.archive-layout{max-width:1300px;margin:0 auto;display:grid;grid-template-columns:224px minmax(0,1fr);gap:32px;padding:30px 34px}.home-sidebar{border-right:1px dashed #dad2e4;padding-right:24px}.sidebar-title{padding:10px 9px 21px}.sidebar-title>span{display:block;font-size:13px;font-weight:600}.sidebar-title small{display:block;font-size:8px;letter-spacing:.13em;color:#b3a7bd;margin-top:8px}.home-tab{display:flex;align-items:center;gap:9px;width:100%;border:1px solid transparent;background:transparent;border-radius:5px;padding:9px 7px;text-align:left;margin-bottom:10px;min-height:61px}.home-tab.active{background:#fffafd;border-color:#d6c8df;box-shadow:2px 3px #e9e0ed80}.home-tab svg{width:44px;height:44px;flex:none}.home-tab>span:not(.tab-symbol):not(.tab-dot){min-width:0;overflow-wrap:anywhere;font-size:12px}.home-tab small{display:block;font-size:9px;color:#ac9bb4;margin-top:6px}.home-tab b{font-size:10px;font-weight:400;margin-left:auto;color:#ad9abb}.tab-symbol{width:44px;text-align:center;font-size:26px;color:#b49bc8;flex:none}.tab-dot{margin-left:auto}.new-home{display:block;width:100%;padding:12px 8px;border:1px dashed #c7b7d3;border-radius:4px;background:#fffcff80;font-size:11px;margin-top:16px}.sidebar-note{text-align:center;margin-top:55px;transform:rotate(-4deg);padding:15px;background:#fffafa;border:1px solid #e7dce7;box-shadow:2px 3px #d8cbe520}.sidebar-note svg{width:70px;height:70px}.sidebar-note>span{display:block;font-size:11px;line-height:1.9;color:#a18aa3}.sidebar-note small{display:block;font-size:6px;letter-spacing:.12em;color:#b9a8ba;margin-top:12px}.archive-main{min-width:0}.archive-hero{display:flex;align-items:center;justify-content:space-between;min-height:205px;padding:22px 28px;box-sizing:border-box;position:relative;overflow:hidden;border:1px solid #d6c8df;border-radius:9px;background:linear-gradient(120deg,#fff7fb,var(--soft));box-shadow:inset 0 0 0 5px #ffffff80,3px 4px #e3daeb55}.archive-overline{font-size:8px;letter-spacing:.15em;color:#ac92b3}.hero-copy{z-index:1;max-width:65%}.hero-copy h1{font-size:28px;letter-spacing:.07em;font-weight:500;margin:14px 0 9px;color:#7e6a91;overflow-wrap:anywhere}.hero-copy p{font-size:11px;line-height:1.8;color:#a08fa9;margin:0}.hero-actions{display:flex;align-items:center;flex-wrap:wrap;gap:12px;margin-top:22px}.hero-actions>span{font-size:9px;color:#a08fad}.hero-actions button{border:1px solid #d5bfd7;background:#fffafd;border-radius:4px;padding:7px 9px;font-size:10px}.hero-art{position:relative;width:195px;height:170px;flex:none}.mini-handheld{position:absolute;top:12px;left:35px;width:106px;padding:9px 9px 11px;border:2px solid #a7a0c7;border-radius:12px 12px 22px 12px;background:#eadff3;box-shadow:3px 4px #c6bcd9;transform:rotate(9deg)}.mini-handheld>span{display:block;text-align:center;font-size:6px;letter-spacing:.1em;color:#9a83ae}.handheld-lcd{position:relative;margin-top:6px;height:71px;border:2px solid #b8a9cb;box-shadow:inset 0 0 0 3px #d5e7ee;background:#f8fbf7;display:grid;place-items:center}.handheld-lcd svg{width:63px;height:63px}.handheld-lcd i{position:absolute;top:6px;right:5px;font-size:9px;color:#da9fba}.mini-controls{display:flex;justify-content:space-between;padding:7px 3px 0;color:#ac98c1}.mini-controls b{font-size:23px;line-height:22px}.mini-controls small{font-size:12px;padding-top:4px;color:#daacc5}.hero-cloud{position:absolute;width:80px;height:70px;top:-10px;right:0}.hero-apple{position:absolute;width:52px;height:52px;bottom:-3px;right:6px;transform:rotate(12deg)}.hero-bandage{position:absolute;width:65px;height:65px;bottom:-7px;left:0;transform:rotate(-20deg)}.hero-spark{position:absolute;left:8px;top:18px;color:#d8abc6;font-style:normal}.collection-toolbar{display:flex;justify-content:space-between;align-items:center;gap:10px;margin:27px 0 17px}.collection-toolbar>div{font-size:12px;display:flex;align-items:center;gap:7px}.tiny-square{width:6px;height:6px;background:#c0a6cc;box-shadow:2px 2px #eee2f2}.collection-toolbar small{font-size:7px;letter-spacing:.08em;color:#b5a8be}.archive-search{display:flex;align-items:center;gap:5px;border:1px solid #e2d9e9;border-radius:5px;padding:6px 9px;background:#fffafd}.archive-search input{width:117px;min-width:0;border:0;outline:0;background:transparent;font-size:10px;color:#8a779b}.archive-search input::placeholder{color:#b4a5bc}.collection-body{display:grid;grid-template-columns:minmax(0,1fr) 184px;gap:22px;align-items:start}.friend-collection{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:16px 12px}.friend-card{position:relative;min-width:0;background:#fffcff;border:1px solid #e5dbe9;border-radius:7px;box-shadow:2px 3px #e4d9ec44;padding:9px 7px 10px;text-align:center}.friend-open{display:flex;flex-direction:column;align-items:center;width:100%;border:0;background:transparent;padding:0;min-width:0}.friend-open :deep(.animal-avatar){width:min(100%,108px);transition:transform .2s}.friend-open:hover :deep(.animal-avatar){transform:translateY(-3px)}.friend-open strong{font-size:12px;font-weight:500;max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;margin:4px 0 5px}.friend-open>span:last-child{font-size:9px;color:#b09fb7;max-width:100%;overflow:hidden;white-space:nowrap;text-overflow:ellipsis}.friend-home{display:flex;align-items:center;justify-content:center;gap:4px;max-width:100%;margin:12px auto 0;border:1px solid #e4dce9;background:#f8f5fb;border-radius:3px;font-size:9px;padding:4px 6px;overflow-wrap:anywhere}.friend-home>span{color:var(--accent);font-size:12px}.friend-home small{color:#baabc6}.friend-options{position:absolute;top:4px;right:4px;width:25px;height:25px;border:0;border-radius:3px;background:#fffafcbf;color:#b5a5bf}.add-friend{min-height:208px;display:flex;flex-direction:column;align-items:center;justify-content:center;border-style:dashed;background:#fcf9ff80}.add-friend>span{font-size:30px;font-weight:200;color:#cebddc;margin-bottom:15px}.add-friend strong{font-size:11px;font-weight:400}.add-friend small{font-size:9px;color:#bdadc6;margin-top:7px}.collection-empty{grid-column:1/-1;text-align:center;font-size:11px;color:#ac9ab8;padding:15px 0}.collection-empty svg{width:65px;height:65px}.collection-empty p{line-height:1.9}.portrait-display{position:relative;border:1px solid #d9cfe0;padding:12px;background:#fffaf7;box-shadow:3px 4px #e5dce94d;transform:rotate(1.5deg)}.portrait-title span{display:block;font-size:10px}.portrait-title small{font-size:6px;letter-spacing:.14em;color:#bca9b9}.display-photo{display:flex;position:relative;align-items:center;justify-content:center;flex-direction:column;width:100%;aspect-ratio:3/4;margin-top:13px;padding:0;border:1px solid #e0d4e1;background:repeating-linear-gradient(0deg,#eef2f8 0 8px,#f4f6fb 8px 9px);overflow:hidden}.display-photo img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}.display-photo>span{position:absolute;bottom:0;left:0;right:0;padding:18px 4px 8px;font-size:12px;letter-spacing:.08em;background:linear-gradient(transparent,#fffbfae8);color:#8a748f}.portrait-sticker{position:absolute;right:-12px;top:23px;width:62px;height:62px;transform:rotate(28deg);pointer-events:none}.portrait-display>p{font-size:10px;line-height:1.9;color:#a28ba0;display:-webkit-box;-webkit-line-clamp:4;-webkit-box-orient:vertical;overflow:hidden;margin:14px 3px 0;white-space:pre-line}.diary-footer{display:flex;align-items:center;justify-content:space-between;margin-top:5px}.diary-footer span{font-size:6px;letter-spacing:.07em;color:#c2afbd}.diary-footer svg{width:48px;height:48px}.archive-footer{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-top:30px;padding:15px 0;border-top:1px dashed #ddd2e5;color:#b29fbd;font-size:9px}.archive-footer small{font-size:7px;letter-spacing:.1em}.archive-notice{font-size:10px;color:#947da5;min-height:16px}.archive-modal{position:fixed;inset:0;z-index:65;display:grid;place-items:center;overflow:auto;padding:20px;background:#66567945;backdrop-filter:blur(5px)}.home-dialog{box-sizing:border-box;position:relative;width:min(100%,380px);max-height:88dvh;overflow:auto;padding:25px;border:2px solid #c8b4d5;border-radius:12px;background:#fffaff;box-shadow:5px 6px #a18bb64d;text-align:center}.dialog-close{position:absolute;right:10px;top:9px;width:30px;height:30px;border:0;background:transparent;font-size:23px;color:#b29bbf}.dialog-house{display:block;width:83px;height:83px;margin:0 auto}.home-dialog h2{font-size:18px;font-weight:500;margin:13px 0 23px;overflow-wrap:anywhere}.home-name{display:flex;flex-direction:column;gap:9px;text-align:left;font-size:11px}.home-name input{padding:12px;border:1px solid #d9c9e4;border-radius:5px;background:#fff;color:#826990;box-sizing:border-box;width:100%}.theme-picker,.frame-picker{border:0;margin:19px 0;padding:0;display:flex;justify-content:center;gap:8px}.theme-picker legend,.frame-picker legend{font-size:10px;color:#ab93b6;text-align:left;margin-bottom:12px}.theme-picker label{display:flex;align-items:center;gap:4px;font-size:10px}.theme-picker input{accent-color:#af93c2}.theme-picker label>span{width:12px;height:12px;background:#d1e7f6;border:1px solid #b5ccdf}.theme-picker .swatch-pink>span{background:#f4d9e7;border-color:#d6b1c5}.theme-picker .swatch-cream>span{background:#f6e8c5;border-color:#d5c5a1}.dialog-save{width:100%;padding:12px;border:1px solid #c8accf;border-radius:5px;background:#eee1f3;box-shadow:2px 3px #e0cce7;font-size:12px}.dialog-avatar{margin:0 auto}.frame-picker button{border:1px solid #dfd2e7;background:#fffafd;padding:8px 17px;border-radius:4px;font-size:11px}.frame-picker button.chosen{background:#eee4f7;border-color:#b39ac6}.choose-home-label{text-align:left;font-size:11px;color:#ab93b6;margin-top:25px}.move-home-list{display:flex;flex-direction:column;gap:8px}.move-home-list button{display:flex;align-items:center;gap:10px;border:1px solid #e4d8ec;border-radius:5px;background:#fffafd;padding:4px 12px;min-height:48px;text-align:left;font-size:12px}.move-home-list svg{width:42px;height:42px;flex:none}.move-home-list b{margin-left:auto;font-size:9px;font-weight:400;white-space:nowrap;color:#b295c0}.move-home-list span{overflow-wrap:anywhere}
@media(min-width:1400px){.friend-collection{grid-template-columns:repeat(4,minmax(0,1fr))}}
@media(max-width:1050px){.archive-layout{grid-template-columns:180px minmax(0,1fr);gap:22px;padding:24px}.home-sidebar{padding-right:17px}.collection-body{grid-template-columns:1fr}.portrait-display{display:none}.collection-toolbar small{display:none}.hero-art{width:160px}.archive-hero{padding:20px}.hero-copy h1{font-size:25px}.hero-actions>span{font-size:8px}}
@media(max-width:650px){.archive-header{min-height:75px;padding:0 14px;gap:6px}.archive-header strong{font-size:16px}.archive-header>div>span{font-size:6px;letter-spacing:.06em}.paper-button{padding:8px 9px;font-size:10px}.archive-layout{display:flex;flex-direction:column;gap:17px;padding:14px}.home-sidebar{border:0;padding:0;display:flex;gap:8px;overflow:auto;align-items:stretch;padding-bottom:5px;scrollbar-width:thin}.sidebar-title,.sidebar-note,.home-tab small,.tab-dot{display:none}.home-tab{width:auto;flex:none;min-height:48px;padding:3px 10px;margin:0;gap:5px;border:1px solid #e5dbea;background:#fffcff}.home-tab svg{width:34px;height:34px}.home-tab>span:not(.tab-symbol){font-size:10px;max-width:120px}.home-tab .tab-symbol{font-size:19px;width:22px}.home-tab b{margin-left:3px}.new-home{margin:0;width:auto;flex:none;padding:8px 12px;font-size:10px}.archive-hero{min-height:185px;padding:18px 15px;border-radius:7px}.hero-copy{max-width:66%}.archive-overline{font-size:6px;letter-spacing:.04em}.hero-copy h1{font-size:23px;margin:13px 0 8px}.hero-copy p{font-size:10px}.hero-art{width:112px;height:145px;transform:scale(.84);transform-origin:center right;margin-left:-20px}.mini-handheld{left:0;top:3px;width:91px}.hero-cloud{right:-8px;top:-19px}.hero-apple{right:-22px;bottom:-3px}.hero-bandage{left:-19px;bottom:-18px}.hero-actions{margin-top:14px;gap:9px}.hero-actions>span{font-size:8px}.hero-actions button{font-size:9px;padding:5px 7px}.collection-toolbar{margin:22px 0 13px;gap:7px}.collection-toolbar>div{font-size:11px}.archive-search{padding:5px 7px}.archive-search input{width:103px;font-size:9px}.friend-collection{grid-template-columns:repeat(3,minmax(0,1fr));gap:10px 8px}.friend-card{padding:7px 5px 9px}.friend-open :deep(.animal-avatar){width:94px;max-width:100%}.friend-open strong{font-size:11px}.friend-open>span:last-child{font-size:8px}.friend-home{font-size:8px;padding:3px;margin-top:9px;gap:3px}.friend-home>span{font-size:10px}.friend-options{width:21px;height:21px;font-size:12px}.add-friend{min-height:184px}.add-friend strong{font-size:10px}.add-friend small{font-size:8px}.archive-footer{margin-top:23px;font-size:8px}.archive-footer small{font-size:6px}.home-dialog>.new-home{width:100%;margin-top:14px}.home-dialog{padding:23px}.archive-notice{font-size:9px}}
@media(max-width:360px){.friend-collection{grid-template-columns:repeat(2,minmax(0,1fr))}.hero-art{transform:scale(.7);width:88px}.hero-copy h1{font-size:21px}.archive-header strong{font-size:14px}}
@media(prefers-reduced-motion:reduce){.friend-open :deep(.animal-avatar){transition:none}}

.frame-picker{flex-wrap:wrap}.frame-picker button{flex:0 0 calc(25% - 8px);padding:8px 4px}
</style>
