export const animalFrames = [
  { id: 'bunny', name: '兔兔' },
  { id: 'cat', name: '猫猫' },
  { id: 'bear', name: '小熊' },
  { id: 'puppy', name: '小狗' },
  { id: 'fox', name: '狐狸' },
  { id: 'panda', name: '熊猫' },
  { id: 'hamster', name: '仓鼠' },
  { id: 'frog', name: '青蛙' }
]

export function characterFrame(character) {
  return character.avatarFrame || animalFrames[Math.abs(Number(character.id) || 0) % 3].id
}
