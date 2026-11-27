<script setup>
// 世界面板：新建、编辑、删除世界；设置角色之间的认识关系（单向 / 双向）。
// 由人物页打开，关闭时回到贴纸墙。
import { computed, ref } from 'vue'
import { ChevronLeft, Plus } from 'lucide-vue-next'
import { worldData, saveWorld, deleteWorld, setRelation } from '@/stores/worlds'

const props = defineProps({
  // 所有角色（来自 jyos_characters）
  characters: { type: Array, default: () => [] }
})
const emit = defineEmits(['close', 'changed'])

const selectedWorldId = ref('')
const draft = ref({ id: '', name: '', setting: '' })
const error = ref('')
const confirmDeleteId = ref('')

const selectedWorld = computed(() => worldData.worlds.find((w) => w.id === selectedWorldId.value) || null)
const membersOfSelected = computed(() => props.characters.filter((c) => c.worldId === selectedWorldId.value))
const unassigned = computed(() => props.characters.filter((c) => !c.worldId || !worldData.worlds.some((w) => w.id === c.worldId)))

// 关系编辑：从 fromId 到 toId 的认识方式
function relationBetween(fromId, toId) {
  const forward = worldData.relations.find((r) => r.from === fromId && r.to === toId)
  if (!forward) return 'none'
  const back = worldData.relations.find((r) => r.from === toId && r.to === fromId)
  return forward.mode === 'both' || (back && back.mode === 'both') ? 'both' : 'one'
}

function selectWorld(id) {
  selectedWorldId.value = id
  const w = worldData.worlds.find((x) => x.id === id)
  draft.value = w ? { ...w } : { id: '', name: '', setting: '' }
  error.value = ''
}

function startNew() {
  selectedWorldId.value = ''
  draft.value = { id: '', name: '', setting: '' }
  error.value = ''
}

async function save() {
  error.value = ''
  try {
    const saved = await saveWorld(draft.value)
    selectWorld(saved.id)
    emit('changed')
  } catch (e) {
    error.value = e.message
  }
}

async function removeWorld(id) {
  await deleteWorld(id)
  confirmDeleteId.value = ''
  startNew()
  emit('changed')
}

// 把角色加入或移出当前世界（写入角色的 worldId，由父组件保存角色）
function toggleMember(character) {
  const inWorld = character.worldId === selectedWorldId.value
  character.worldId = inWorld ? '' : selectedWorldId.value
  emit('changed')
}

async function changeRelation(fromId, toId, mode) {
  await setRelation({ worldId: selectedWorldId.value, from: fromId, to: toId, mode })
  emit('changed')
}

function nameOf(id) {
  return props.characters.find((c) => c.id === id)?.name || '未命名'
}
</script>

<template>
  <div class="wa-page" role="dialog" aria-modal="true" aria-label="世界档案">
    <header class="wa-top">
      <button type="button" class="wa-icon-btn" aria-label="关闭" @click="emit('close')"><ChevronLeft :size="22" :stroke-width="1.8" /></button>
      <div class="wa-title">
        <h2>WORLD ARCHIVE</h2>
        <p>世界 · 档案</p>
      </div>
      <button type="button" class="wa-icon-btn" aria-label="新建世界" @click="startNew"><Plus :size="20" :stroke-width="1.8" /></button>
    </header>

    <div class="wa-body">
      <section class="wa-block">
        <div class="wa-block-head"><span>01</span><h3>世界索引</h3></div>
        <div class="wa-index">
          <button v-for="(w, i) in worldData.worlds" :key="w.id" type="button" class="wa-row" :class="{ on: w.id === selectedWorldId }" @click="selectWorld(w.id)">
            <small>{{ String(i + 1).padStart(2, '0') }}</small>
            <strong>{{ w.name }}</strong>
            <em>{{ characters.filter((c) => c.worldId === w.id).length }} 人</em>
          </button>
          <button type="button" class="wa-row wa-row-new" @click="startNew"><small>+</small><strong>新建世界</strong></button>
        </div>
      </section>

      <section class="wa-block">
        <div class="wa-block-head"><span>02</span><h3>{{ selectedWorld ? '编辑世界' : '新建世界' }}</h3></div>
        <label class="wa-field"><span>世界名字</span><input v-model="draft.name" maxlength="40" placeholder="例如：雾港、2077 新东京" /></label>
        <label class="wa-field"><span>世界观</span><textarea v-model="draft.setting" rows="8" maxlength="2000" placeholder="这个世界的背景、规则、地点、时代……角色都会在这个设定里生活。" /></label>
        <p v-if="error" class="wa-error">{{ error }}</p>
        <div class="wa-actions">
          <button v-if="selectedWorldId" type="button" class="wa-btn wa-btn-ghost" @click="confirmDeleteId = selectedWorldId">删除世界</button>
          <button type="button" class="wa-btn" :disabled="!draft.name.trim()" @click="save">保存世界</button>
        </div>
      </section>
      <section v-if="selectedWorld" class="wa-block">
        <div class="wa-block-head"><span>03</span><h3>成员</h3></div>
        <p class="wa-hint">勾选属于这个世界的角色。不属于任何世界的角色不受影响。</p>
        <ul class="wa-members">
          <li v-for="c in characters" :key="c.id">
            <label :class="{ on: c.worldId === selectedWorldId }">
              <input type="checkbox" :checked="c.worldId === selectedWorldId" @change="toggleMember(c)" />
              <span class="wa-check" aria-hidden="true"></span>
              <strong>{{ c.name || '未命名' }}</strong>
            </label>
          </li>
        </ul>
      </section>

      <section v-if="selectedWorld" class="wa-block">
        <div class="wa-block-head"><span>04</span><h3>认识关系</h3></div>
        <p class="wa-hint">选择一个角色认识另一个角色的方式。「单向」只有前者知道后者；「双向」两人都知道对方。</p>
        <p v-if="membersOfSelected.length < 2" class="wa-hint">这个世界里至少要有两个角色，才能设定认识关系。</p>
        <div v-for="a in membersOfSelected" :key="a.id" class="wa-rel-block">
          <p class="wa-rel-name">{{ a.name }} 认识：</p>
          <div v-for="b in membersOfSelected.filter((x) => x.id !== a.id)" :key="b.id" class="wa-rel-row">
            <span>{{ b.name }}</span>
            <select :value="relationBetween(a.id, b.id)" @change="changeRelation(a.id, b.id, $event.target.value === 'none' ? null : $event.target.value)">
              <option value="none">不认识</option>
              <option value="one">单向（他知道{{ b.name }}）</option>
              <option value="both">双向（两人互相知道）</option>
            </select>
          </div>
        </div>
      </section>

      <section v-if="unassigned.length && !selectedWorld" class="wa-block">
        <div class="wa-block-head"><span>--</span><h3>未归属的角色</h3></div>
        <p class="wa-hint">{{ unassigned.map((c) => c.name).join('、') }}，选中一个世界后在成员里勾选即可加入。</p>
      </section>
    </div>

    <div v-if="confirmDeleteId" class="wa-mask" @click.self="confirmDeleteId = ''">
      <section class="wa-dialog" role="alertdialog" aria-modal="true" aria-labelledby="wa-del-title">
        <h2 id="wa-del-title">删除这个世界？</h2>
        <p>角色不会被删除，只会移出这个世界，它们之间的认识关系也会清除。</p>
        <div class="wa-dialog-btns">
          <button type="button" @click="confirmDeleteId = ''">取消</button>
          <button type="button" class="danger" @click="removeWorld(confirmDeleteId)">确认删除</button>
        </div>
      </section>
    </div>
  </div>
</template>

<style scoped>
/* 世界档案页：浅灰底、白色圆角卡片、虚线输入框、黑色胶囊按钮，与人物应用的新建和档案页一致。 */
.wa-page{position:fixed;inset:0;z-index:60;display:flex;flex-direction:column;box-sizing:border-box;padding:env(safe-area-inset-top) 0 env(safe-area-inset-bottom);background:#f2f2f7;color:#1c1c1e;font-size:14px;overflow:hidden}
.wa-top{flex:none;display:grid;grid-template-columns:38px 1fr 38px;align-items:center;gap:8px;padding:14px 16px 8px}
.wa-title{text-align:center}
.wa-title h2{margin:0;font-size:17px;font-weight:700 !important;letter-spacing:.02em}
.wa-title p{margin:2px 0 0;font-size:12px;color:#8e8e93}
.wa-icon-btn{width:38px;height:38px;display:grid;place-items:center;padding:0;border:0;border-radius:50%;background:#fff;color:#1c1c1e;box-shadow:0 1px 2px rgba(0,0,0,.06);cursor:pointer}
.wa-icon-btn:active{transform:scale(.94)}
.wa-body{flex:1;min-height:0;overflow-y:auto;padding:10px 16px calc(env(safe-area-inset-bottom) + 28px);display:flex;flex-direction:column;gap:14px}
.wa-block{background:#fff;border-radius:20px;padding:16px;box-shadow:0 1px 2px rgba(0,0,0,.04)}
.wa-block-head{display:flex;align-items:center;gap:10px;margin-bottom:12px}
.wa-block-head span{flex:none;min-width:30px;height:22px;display:grid;place-items:center;padding:0 8px;border-radius:6px;background:#2c3440;color:#fff;font-size:11px;letter-spacing:.04em}
.wa-block-head h3{margin:0;font-size:15px;font-weight:700 !important}
.wa-index{display:flex;flex-direction:column;gap:6px}
.wa-row{display:grid;grid-template-columns:30px 1fr auto;align-items:center;gap:8px;min-height:46px;padding:0 14px;border:0;border-radius:14px;background:#f7f7f9;color:#1c1c1e;text-align:left;font:inherit;cursor:pointer}
.wa-row small{font-size:11px;color:#8e8e93}
.wa-row strong{font-size:15px;font-weight:600 !important;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.wa-row em{font-style:normal;font-size:12px;color:#8e8e93}
.wa-row.on{background:#1c1c1e;color:#fff}
.wa-row.on small,.wa-row.on em{color:#aeaeb2}
.wa-row-new{grid-template-columns:30px 1fr;background:#fff;border:1.5px dashed #c7c7cc}
.wa-row-new small{font-size:16px;color:#1c1c1e}
.wa-field{display:flex;flex-direction:column;gap:6px;margin-bottom:12px}
.wa-field span{font-size:12px;color:#8e8e93}
.wa-field input,.wa-field textarea{box-sizing:border-box;width:100%;padding:10px 12px;border:1.5px dashed #c7c7cc;border-radius:12px;background:#f7f7f9;color:#1c1c1e;font:inherit;font-size:15px;line-height:1.6;outline:0}
.wa-field input{height:44px}
.wa-field input:focus,.wa-field textarea:focus{border-style:solid;border-color:#1c1c1e;background:#fff}
.wa-field textarea{resize:vertical;min-height:170px}
.wa-field input::placeholder,.wa-field textarea::placeholder{color:#aeaeb2}
.wa-error{margin:0 0 10px;font-size:12px;color:#ff3b30}
.wa-actions{display:flex;justify-content:flex-end;gap:10px;margin-top:4px}
.wa-btn{height:40px;padding:0 20px;border:0;border-radius:999px;background:#1c1c1e;color:#fff;font:inherit;font-size:14px;font-weight:600 !important;cursor:pointer}
.wa-btn:disabled{opacity:.35;cursor:not-allowed}
.wa-btn-ghost{background:#f2f2f7;color:#ff3b30}
.wa-hint{margin:0 0 10px;font-size:12px;line-height:1.6;color:#8e8e93}
.wa-members{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:6px}
.wa-members label{position:relative;display:flex;align-items:center;gap:12px;min-height:46px;padding:0 14px;border-radius:14px;background:#f7f7f9;cursor:pointer}
.wa-members label.on{background:#fff;box-shadow:inset 0 0 0 1.5px #1c1c1e}
.wa-members input{position:absolute;opacity:0;pointer-events:none}
.wa-members strong{font-size:15px;font-weight:600 !important}
.wa-check{flex:none;width:20px;height:20px;border-radius:50%;border:1.5px solid #c7c7cc;background:#fff;display:grid;place-items:center}
.wa-check::after{content:"";width:6px;height:6px;border-radius:50%;background:#fff;opacity:0}
.wa-members label.on .wa-check{background:#1c1c1e;border-color:#1c1c1e}
.wa-members label.on .wa-check::after{opacity:1}
.wa-rel-block{margin-bottom:12px}
.wa-rel-name{margin:0 0 6px;font-size:14px;font-weight:600 !important}
.wa-rel-row{display:flex;align-items:center;justify-content:space-between;gap:10px;min-height:46px;padding:0 14px;border-radius:14px;background:#f7f7f9;margin-bottom:6px}
.wa-rel-row span{font-size:14px}
.wa-rel-row select{font:inherit;font-size:13px;height:32px;padding:0 10px;border:0;border-radius:999px;background:#fff;color:#1c1c1e;box-shadow:0 1px 2px rgba(0,0,0,.06)}
.wa-mask{position:fixed;inset:0;z-index:70;display:grid;place-items:center;padding:24px;background:rgba(0,0,0,.28)}
.wa-dialog{width:min(100%,300px);box-sizing:border-box;padding:22px 20px 0;border-radius:22px;background:#fff;text-align:center;overflow:hidden;box-shadow:0 14px 40px rgba(0,0,0,.18)}
.wa-dialog h2{margin:0 0 6px;font-size:17px;font-weight:600 !important}
.wa-dialog p{margin:0 0 20px;font-size:13px;line-height:1.5;color:#8e8e93}
.wa-dialog-btns{display:grid;grid-template-columns:1fr 1fr;margin:0 -20px;border-top:.5px solid #d1d1d6}
.wa-dialog-btns button{min-height:46px;border:0;background:transparent;font:inherit;font-size:16px;color:#0a84ff;cursor:pointer}
.wa-dialog-btns button+button{border-left:.5px solid #d1d1d6}
.wa-dialog-btns button.danger{color:#ff3b30;font-weight:600 !important}
@media(max-width:420px){.wa-body{padding-left:12px;padding-right:12px}}
</style>
