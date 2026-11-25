// 让模型根据世界观和角色的基本信息写一段简要人设。只返回文字，由界面填入设定框，用户可修改后保存。

export async function generateCharacterBrief({ preset, world, character, signal }) {
  if (!preset?.baseUrl?.trim() || !preset?.apiKey?.trim() || !preset?.model?.trim()) {
    throw new Error('所选预设缺少接口地址、模型或密钥，请到设置里补全。')
  }
  const base = preset.baseUrl.trim().replace(/\/+$/, '')
  const system = [
    '你是小说和角色扮演的人物摘要写手。根据世界观和角色的详细设定，写一段极简的人物摘要，给同世界里认识他的其他角色看。',
    '只输出摘要正文，不要标题，不要解释，不要代码围栏。',
    '篇幅 40 到 80 字，一到两句话，只写别人能知道的身份、最显眼的特点或他在这个世界里的大致身份（如某某店主、某某的同学），不要写内心活动和隐私细节。',
    '摘要要符合世界观和详细设定，不要矛盾；不要写成空泛的形容词堆砌。',
    '不要出现真实的个人信息、电话号码或网址。'
  ].join('\n')

  const user = [
    `世界观：${world?.name ? `【${world.name}】` : '未设定'}`,
    world?.setting ? world.setting : '（没有填写世界观）',
    '',
    '角色信息：',
    `姓名：${character.name || '未填'}`,
    `性别：${character.gender || '未填'}`,
    `年龄：${character.age || '未填'}`,
    `身份：${character.occupation || '未填'}`,
    character.details ? `已有的设定（可以在此基础上完善）：${character.details}` : ''
  ].filter(Boolean).join('\n')

  const response = await fetch(`${base}/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${preset.apiKey.trim()}` },
    body: JSON.stringify({
      model: preset.model.trim(),
      temperature: 0.9,
      max_tokens: 2000,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user }
      ]
    }),
    signal
  })
  if (!response.ok) throw new Error(`接口返回 ${response.status}`)
  const data = await response.json()
  const text = String(data?.choices?.[0]?.message?.content || '').replace(/```(?:json|text)?/gi, '').trim()
  if (!text) throw new Error('模型没有返回人设内容，请重试')
  return text.slice(0, 400)
}
