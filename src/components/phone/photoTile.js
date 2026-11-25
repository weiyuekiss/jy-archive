// 照片没有真实图片：用柔和渐变代替，按序号稳定取色。相册和相机缩略图共用这一份。
const TILE_PAIRS = [
  ['#9aa6ae', '#d5dce0'],
  ['#c4a689', '#ecdccd'],
  ['#7fa89a', '#cfe3db'],
  ['#8c86b8', '#d6d2ea'],
  ['#c99a94', '#f0d9d5'],
  ['#6f8fae', '#c9d9e8'],
  ['#b5ae6a', '#e8e4b8'],
  ['#6aa082', '#c4e3d2']
]

export function tileOf(index) {
  const [a, b] = TILE_PAIRS[index % TILE_PAIRS.length]
  return `linear-gradient(160deg, ${a}, ${b})`
}
