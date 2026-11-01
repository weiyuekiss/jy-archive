<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import CharacterIcon from '@/components/icons/CharacterIcon.vue'
import { loadValue, saveValue } from '@/stores/db'

const emit = defineEmits(['close'])
const selectedFilter = ref('全部')
const filters = ['全部', '常用', '草稿']
const characters = ref([])
const showCreate = ref(false)
const showEditor = ref(false)
const showDeleteConfirm = ref(false)
const activeCharacterId = ref(null)
const newName = ref('')
const editorInput = ref(null)
const activeCharacter = computed(() => characters.value.find((character) => character.id === activeCharacterId.value))
const visibleCharacters = computed(() => characters.value.filter((character) => selectedFilter.value === '全部' || (selectedFilter.value === '草稿' ? !character.name || !character.details : character.favorite)))
const editorTitle = computed(() => activeCharacter.value?.name ? `编辑${activeCharacter.value.name}人物档案` : '编辑人物档案')
let nextId = 1

onMounted(async () => {
  const saved = await loadValue('jyos_characters')
  if (Array.isArray(saved)) {
    characters.value = saved
    nextId = Math.max(0, ...saved.map((character) => Number(character.id) || 0)) + 1
  }
})
watch(characters, (value) => saveValue('jyos_characters', JSON.parse(JSON.stringify(value))), { deep: true })

function createCharacter() {
  const name = newName.value.trim()
  if (!name) return
  const character = { id: nextId++, name, details: '', birthday: '', age: '', occupation: '', gender: '', avatar: '', favorite: false, color: ['#e9e5dc', '#e7ebe5', '#eee6e1'][characters.value.length % 3] }
  characters.value.push(character)
  newName.value = ''
  showCreate.value = false
  openEditor(character)
}

function openEditor(character) {
  activeCharacterId.value = character.id
  showEditor.value = true
}

function closeEditor() {
  showEditor.value = false
  showDeleteConfirm.value = false
  activeCharacterId.value = null
}

function selectAvatar(event) {
  const file = event.target.files?.[0]
  event.target.value = ''
  if (!file || !file.type.startsWith('image/')) return
  const reader = new FileReader()
  reader.onload = () => {
    const image = new Image()
    image.onload = () => {
      const scale = Math.min(1, 800 / Math.max(image.width, image.height))
      const canvas = document.createElement('canvas')
      canvas.width = Math.round(image.width * scale)
      canvas.height = Math.round(image.height * scale)
      canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height)
      if (activeCharacter.value) activeCharacter.value.avatar = canvas.toDataURL('image/jpeg', 0.85)
    }
    image.src = reader.result
  }
  reader.readAsDataURL(file)
}

function removeCharacter() {
  if (!showDeleteConfirm.value) {
    showDeleteConfirm.value = true
    return
  }
  characters.value = characters.value.filter((character) => character.id !== activeCharacterId.value)
  closeEditor()
}
</script>

<template>
  <div class="character-app">
    <header class="masthead">
      <button class="back" aria-label="返回" @click="emit('close')"><svg viewBox="0 0 24 24"><path d="M15 5l-7 7 7 7"/></svg></button>
      <span></span>
      <span></span>
    </header>
    <main class="content">

      <div class="toolbar">
        <div class="filters" aria-label="筛选人物">
          <button v-for="filter in filters" :key="filter" :class="{ active: selectedFilter === filter }" @click="selectedFilter = filter">{{ filter }}</button>
        </div>
        <button class="add-button" @click="showCreate = true"><span>＋</span> 新建档案</button>
      </div>

      <section v-if="characters.length" class="archive-grid" aria-label="人物档案">
        <article v-for="(character, index) in visibleCharacters" :key="character.id" class="character-card" role="button" tabindex="0" :aria-label="`编辑${character.name || '未命名人物'}档案`" @click="openEditor(character)" @keyup.enter="openEditor(character)" @keyup.space.prevent="openEditor(character)">
            <div class="portrait" :style="{ '--portrait': character.color }" @click.stop="openEditor(character)">
            <span class="folio">NO. {{ String(index + 1).padStart(2, '0') }}</span>
            <img v-if="character.avatar" class="portrait-avatar" :src="character.avatar" :alt="`${character.name}头像`" />
            <CharacterIcon v-else />
            <span class="portrait-caption">{{ character.occupation || 'A STORY IN PROGRESS' }}</span>
          </div>
          <div class="card-meta"><div><h2>{{ character.name || '未命名人物' }}</h2><p>{{ character.gender || '尚未设定' }}<template v-if="character.age"> · {{ character.age }}岁</template></p></div><span class="status">{{ character.details ? '已设定' : '草稿' }}</span></div>
        </article>
      </section>

      <section v-else class="empty-state">
        <div class="empty-art"><span class="orbit orbit-one"/><span class="orbit orbit-two"/><div class="empty-glyph"><CharacterIcon /></div><span class="spark spark-one">✳</span><span class="spark spark-two">·</span></div>
        <span class="empty-kicker">THE FIRST PAGE IS YOURS</span>
        <h2>故事还没有登场</h2>
        <p>从一个名字开始，慢慢补全这个人物的世界。</p>
        <button class="empty-create" @click="showCreate = true">创建第一份档案 <span>↗</span></button>
      </section>

      <footer class="page-footer"><span>JY ARCHIVE</span><i></i><span>每个故事，都从一个人开始</span></footer>
    </main>

    <transition name="fade">
      <div v-if="showCreate" class="modal-backdrop" @click.self="showCreate = false">
        <section class="create-modal" role="dialog" aria-modal="true" aria-label="新建人物档案">
          <button class="modal-close" aria-label="关闭" @click="showCreate = false">×</button>
          <span class="modal-kicker">A NEW STORY</span>
          <h2>给故事一个名字</h2>
          <p>先写下角色的名字，档案可以之后再慢慢补充。</p>
          <input v-model="newName" autofocus maxlength="32" placeholder="角色名字" @keyup.enter="createCharacter" @keyup.esc="showCreate = false" />
          <div class="modal-actions"><button class="cancel" @click="showCreate = false">先不创建</button><button class="confirm" :disabled="!newName.trim()" @click="createCharacter">建立档案</button></div>
        </section>
      </div>
    </transition>

    <transition name="profile-reveal">
      <div v-if="showEditor && activeCharacter" class="profile-backdrop" @click.self="closeEditor" @keyup.esc="closeEditor">
        <section class="profile-sheet" role="dialog" aria-modal="true" :aria-label="editorTitle">
          <button class="sheet-close" aria-label="关闭档案" @click="closeEditor">×</button>
          <div class="sheet-topline"><span>JY ARCHIVE</span><span>PERSON FILE · {{ String(activeCharacter.id).padStart(2, '0') }}</span></div>
          <div class="sheet-layout">
            <div class="sheet-portrait" :style="{ '--portrait': activeCharacter.color }">
              <img v-if="activeCharacter.avatar" :src="activeCharacter.avatar" alt="人物头像预览" />
              <CharacterIcon v-else />
              <label class="avatar-change">更换头像<input ref="editorInput" type="file" accept="image/*" @change="selectAvatar" /></label>
              <span class="portrait-label">PORTRAIT / {{ activeCharacter.name || 'NEW PERSON' }}</span>
            </div>
            <div class="sheet-fields">
              <span class="sheet-kicker">A CHARACTER, IN THEIR OWN WORDS</span>
              <label class="field"><span>姓名 <i>NAME</i></span><input v-model="activeCharacter.name" maxlength="48" placeholder="角色姓名" /></label>
              <label class="field"><span>详细设定 <i>PROFILE</i></span><textarea v-model="activeCharacter.details" rows="6" placeholder="记录性格、外貌、经历、说话方式，以及你希望保留的细节……" /><small>{{ activeCharacter.details.length }} 字</small></label>
              <div class="field-row">
                <label class="field"><span>生日 <i>BIRTHDAY</i></span><input v-model="activeCharacter.birthday" type="date" /></label>
                <label class="field"><span>年龄 <i>AGE</i></span><input v-model="activeCharacter.age" maxlength="24" placeholder="例如：24岁" /></label>
              </div>
              <div class="field-row">
                <label class="field"><span>职业 / 身份 <i>ROLE</i></span><input v-model="activeCharacter.occupation" maxlength="60" placeholder="例如：旅人、学生" /></label>
                <label class="field"><span>性别 <i>GENDER</i></span><input v-model="activeCharacter.gender" maxlength="24" placeholder="可自由填写" /></label>
              </div>
              <div v-if="showDeleteConfirm" class="delete-confirm" role="alertdialog" aria-modal="true" aria-label="确认删除人物档案">
                <span class="delete-kicker">THIS STORY WILL BE REMOVED</span>
                <p>确定删除「{{ activeCharacter.name || '未命名人物' }}」的档案吗？此操作无法撤销。</p>
                <div><button type="button" class="keep-character" @click="showDeleteConfirm = false">保留档案</button><button type="button" class="confirm-delete" @click="removeCharacter">确认删除</button></div>
              </div>
              <div class="sheet-actions"><button class="delete-character" type="button" @click="removeCharacter">删除档案</button><button class="save-character" type="button" @click="closeEditor">完成并保存 <span>↗</span></button></div>
            </div>
          </div>
          <div class="sheet-footer"><span>EVERY DETAIL MAKES A WORLD</span><span>JY · {{ new Date().getFullYear() }}</span></div>
        </section>
      </div>
    </transition>
  </div>
</template>

<style scoped>
.character-app{--ink:#393832;--muted:#a19e94;--line:#eceae4;position:fixed;inset:0;z-index:20;display:flex;flex-direction:column;overflow:hidden;padding:env(safe-area-inset-top) 0 env(safe-area-inset-bottom);background:#fff;color:var(--ink);font-family:-apple-system,BlinkMacSystemFont,"SF Pro Text","PingFang SC",sans-serif;letter-spacing:.01em}
button,input{font:inherit}.masthead{height:57px;flex:none;display:grid;grid-template-columns:42px 1fr 42px;align-items:center;padding:0 20px;border-bottom:1px solid var(--line);background:#fff}.back{width:36px;height:36px;display:grid;place-items:center;border:0;border-radius:50%;background:transparent;cursor:pointer}.back svg{width:20px;fill:none;stroke:#55534d;stroke-width:1.8}.issue{text-align:center;color:#8f8b81;font-family:Georgia,serif;font-size:9px;letter-spacing:.2em}.issue span{padding:0 6px;color:#c0bdb3}.header-mark{justify-self:end;color:#979486;font-size:17px}.content{width:min(100%,620px);flex:1;min-height:0;overflow:auto;margin:0 auto;padding:12px 23px 25px;scrollbar-width:thin;scrollbar-color:#dedbd4 transparent}.toolbar{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:17px 0}.filters{display:flex;gap:6px}.filters button{padding:6px 10px;border:1px solid transparent;border-radius:20px;color:#9b978d;background:transparent;font-size:10px;cursor:pointer}.filters button.active{border-color:#e7e4dc;color:#59574f;background:#fff}.add-button{height:31px;padding:0 11px;border:1px solid #e5e2da;border-radius:6px;color:#69665d;background:#fff;font-size:10px;cursor:pointer}.add-button span{padding-right:4px;font-size:13px}.empty-state{min-height:330px;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:16px 8px 28px;text-align:center}.empty-art{width:154px;height:130px;position:relative;display:grid;place-items:center;margin-bottom:14px}.orbit{position:absolute;display:block;border:1px solid #e8e5dd;border-radius:50%;transform:rotate(-24deg)}.orbit-one{width:139px;height:78px}.orbit-two{width:104px;height:120px;transform:rotate(28deg);border-color:#efede7}.empty-glyph{width:71px;height:71px;display:grid;place-items:center;border:1px solid #e8e5dd;border-radius:24px;background:linear-gradient(145deg,#fff,#f2f0e9);box-shadow:0 9px 28px #554d3610;transform:rotate(-5deg)}.empty-glyph :deep(svg){width:56px;height:56px}.spark{position:absolute;color:#b1aa96}.spark-one{top:16px;right:22px;font-size:15px}.spark-two{bottom:14px;left:25px;font-size:24px}.empty-kicker{color:#b0ab9f;font-size:8px;letter-spacing:.2em}.empty-state h2{margin:11px 0 7px;font-family:Georgia,"PingFang SC",serif;font-size:18px;font-weight:500;letter-spacing:.08em}.empty-state p{margin:0;color:#a29e94;font-size:10px;line-height:1.8}.empty-create{margin-top:19px;padding:8px 13px;border:1px solid #e7e4dc;border-radius:6px;color:#68655c;background:#fff;font-size:10px;cursor:pointer}.empty-create span{padding-left:9px;color:#a6a292}.archive-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:22px 15px;padding:3px 0 32px}.character-card{min-width:0}.portrait{height:180px;position:relative;display:grid;place-items:center;overflow:hidden;border:1px solid #e9e6de;border-radius:3px;background:radial-gradient(ellipse at 50% 35%,#fff9 0,transparent 55%),var(--portrait)}.portrait:after{position:absolute;inset:9px;content:'';border:1px solid #ffffff88;pointer-events:none}.portrait :deep(svg){width:79px;height:79px;opacity:.72}.portrait-avatar{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:center 35%}.portrait-avatar~.folio,.portrait-avatar~.portrait-caption{z-index:2;color:#fff;text-shadow:0 1px 5px #0008}.portrait-avatar~.portrait-caption{padding:20px 9px 8px;right:10px;left:10px;background:linear-gradient(transparent,#0005)}.folio,.portrait-caption{position:absolute;z-index:1;color:#716e65;font-family:Georgia,serif;font-size:8px;letter-spacing:.15em}.folio{top:17px;left:17px}.portrait-caption{bottom:17px;left:17px;font-size:7px}.card-meta{display:flex;align-items:flex-start;justify-content:space-between;gap:6px;padding:10px 1px}.card-meta h2{margin:0;color:#4b4942;font-family:Georgia,"PingFang SC",serif;font-size:14px;font-weight:500}.card-meta p{margin:4px 0 0;color:#a09c91;font-size:9px}.status{padding:4px 6px;border:1px solid #eae7df;border-radius:10px;color:#969185;font-size:8px}.page-footer{display:flex;align-items:center;justify-content:center;gap:9px;padding:17px 0 2px;border-top:1px solid var(--line);color:#aaa69c;font-family:Georgia,serif;font-size:8px;letter-spacing:.1em}.page-footer i{width:3px;height:3px;border-radius:50%;background:#c4bfae}.modal-backdrop{position:fixed;inset:0;z-index:40;display:grid;place-items:center;padding:22px;background:#25272a24;backdrop-filter:blur(5px)}.create-modal{width:min(100%,360px);position:relative;padding:30px 25px 23px;border:1px solid #eee;border-radius:15px;background:#fff;box-shadow:none;text-align:center}.modal-close{position:absolute;top:12px;right:14px;width:28px;height:28px;border:0;border-radius:50%;color:#888;background:#f1f1f1;font-size:20px;cursor:pointer}.modal-kicker{color:#999;font-size:8px;font-weight:600;letter-spacing:.19em}.create-modal h2{margin:10px 0 7px;font-family:Georgia,"PingFang SC",serif;font-size:20px;font-weight:500}.create-modal p{margin:0 0 18px;color:#888;font-size:11px}.create-modal input{width:100%;height:42px;padding:0 12px;border:1px solid #e2e2e2;border-radius:7px;outline:none;color:var(--ink);background:#fff;font-size:12px}.create-modal input:focus{border-color:#bfc1c4}.modal-actions{display:flex;gap:9px;margin-top:16px}.modal-actions button{flex:1;height:37px;border:0;border-radius:7px;font-size:11px;cursor:pointer}.cancel{color:#555;background:#eee}.confirm{color:#444;background:#e5e5e5;box-shadow:none}.confirm:disabled{opacity:.55;cursor:default}.fade-enter-active,.fade-leave-active{transition:opacity .18s}.fade-enter-from,.fade-leave-to{opacity:0}@media(max-width:420px){.content{padding:20px 19px 22px}.portrait{height:160px}}

.profile-backdrop{position:fixed;inset:0;z-index:45;display:grid;place-items:center;padding:clamp(12px,3vw,30px);overflow:auto;background:rgba(45,47,50,.28);backdrop-filter:blur(8px)}.profile-sheet{width:min(100%,760px);max-height:min(92vh,900px);position:relative;overflow:auto;padding:clamp(18px,4vw,34px);border:1px solid #eee;background:#fff;box-shadow:none;transform-origin:center;scrollbar-width:thin;scrollbar-color:#dedede transparent}.profile-sheet:before{position:absolute;inset:8px;content:'';border:1px solid #e9e6df;pointer-events:none}.sheet-close{position:absolute;z-index:2;top:17px;right:17px;width:30px;height:30px;border:1px solid #e8e5de;border-radius:50%;color:#88847b;background:#faf9f6;font-size:20px;cursor:pointer}.sheet-topline,.sheet-footer{position:relative;display:flex;justify-content:space-between;gap:10px;color:#aaa69c;font-family:Georgia,serif;font-size:8px;letter-spacing:.16em}.sheet-topline{padding:1px 0 15px;border-bottom:1px solid #e8e5dd}.sheet-layout{position:relative;display:grid;grid-template-columns:minmax(170px,.78fr) minmax(0,1.22fr);gap:clamp(18px,4vw,36px);padding:22px 0}.sheet-portrait{min-height:350px;position:relative;display:flex;align-items:center;justify-content:center;overflow:hidden;border:1px solid #e8e5dc;background:radial-gradient(ellipse at 50% 34%,#fff9,transparent 56%),var(--portrait)}.sheet-portrait:after{position:absolute;inset:10px;content:'';border:1px solid #ffffff99;pointer-events:none}.sheet-portrait>img{width:100%;height:100%;position:absolute;inset:0;object-fit:cover}.sheet-portrait :deep(svg){width:92px;height:92px;opacity:.66}.avatar-change{position:absolute;z-index:1;bottom:36px;padding:7px 12px;border:1px solid #ffffffc7;border-radius:20px;color:#5d5a51;background:#ffffffb8;font-size:9px;cursor:pointer;backdrop-filter:blur(6px)}.avatar-change input{display:none}.portrait-label{position:absolute;z-index:1;bottom:15px;left:13px;color:#77736b;font-family:Georgia,serif;font-size:7px;letter-spacing:.13em}.sheet-fields{min-width:0}.sheet-kicker{display:block;margin:1px 0 16px;color:#aaa69d;font-size:8px;letter-spacing:.16em}.field{min-width:0;display:flex;flex-direction:column;gap:6px;margin-bottom:13px}.field>span{display:flex;align-items:center;gap:8px;color:#706d64;font-size:10px}.field>span i{color:#b6b1a5;font-family:Georgia,serif;font-size:7px;font-style:normal;letter-spacing:.12em}.field input,.field textarea{width:100%;min-width:0;padding:9px 10px;border:1px solid #e8e5de;border-radius:4px;outline:none;color:#494740;background:#fffdfb;font-size:11px}.field input:focus,.field textarea:focus{border-color:#c2bcad}.field textarea{resize:vertical;line-height:1.7}.field small{align-self:flex-end;color:#aaa69d;font-size:8px}.field-row{display:grid;grid-template-columns:1fr 1fr;gap:10px}.sheet-actions{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-top:5px}.sheet-actions button{min-height:36px;padding:0 14px;border-radius:4px;font-size:10px;letter-spacing:.04em;cursor:pointer;transition:background .18s,border-color .18s,color .18s}.delete-character{border:1px solid #e8e2dc;color:#a17d74;background:transparent}.delete-character:hover{border-color:#c9aaa2;background:#fff8f6}.save-character{border:1px solid #858477;color:#fff;background:#858477}.save-character:hover{border-color:#706f62;background:#706f62}.save-character span{padding-left:9px}.delete-confirm{margin:12px 0;padding:13px;border:1px solid #e2e2e2;border-radius:5px;background:#fff}.delete-kicker{color:#888;font-size:7px;letter-spacing:.14em}.delete-confirm p{margin:8px 0 12px;color:#555;font-size:10px;line-height:1.6}.delete-confirm>div{display:flex;justify-content:flex-end;gap:8px}.delete-confirm button{padding:7px 10px;border:1px solid #ddd;border-radius:4px;font-size:9px;cursor:pointer}.keep-character{color:#555;background:#eee}.delete-confirm .confirm-delete{border-color:#ddd;color:#444;background:#e5e5e5;box-shadow:none}
@media(max-width:560px){.profile-backdrop{padding:9px}.profile-sheet{max-height:96vh;padding:20px 16px}.sheet-layout{grid-template-columns:1fr;gap:16px;padding:17px 0}.sheet-portrait{min-height:170px;max-height:220px}.sheet-portrait>img{object-position:center 35%}.sheet-portrait :deep(svg){width:70px;height:70px}.sheet-kicker{margin-bottom:12px}.field-row{gap:8px}.sheet-topline{font-size:7px}}
</style>
