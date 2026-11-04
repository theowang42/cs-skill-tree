// 星云和远处的星尘，画在一张离屏画布上（世界坐标，1 像素 = 1 单位），
// 每帧只需要按当前视图 drawImage 一次。
import type { StarLayout } from './starmap.ts'

/** 每个领域一种色相，按扇区序号取。都是压暗的，和夜色融在一起。 */
const HUES = [
  [86, 110, 190], [70, 150, 160], [130, 95, 180], [170, 90, 130], [160, 130, 70],
  [80, 130, 190], [110, 150, 100], [170, 110, 80],
]

export function hueOf(sectorIndex: number) {
  return HUES[sectorIndex % HUES.length]
}

/** 可复现的伪随机数 */
function rng(seed: number) {
  return () => {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export interface SkyOptions {
  /** 每片星云的亮度 0~1；不在里面的不画 */
  cloudAlpha: Map<string, number>
  sectorIndex: Map<string, number>
}

/** 画一张以圆心为中心、边长 2 * extent 的离屏画布 */
export function paintSky(layout: StarLayout, opts: SkyOptions): HTMLCanvasElement {
  const size = Math.ceil(layout.extent * 2)
  const c = document.createElement('canvas')
  c.width = size
  c.height = size
  const ctx = c.getContext('2d')!
  ctx.translate(size / 2, size / 2)

  // 远处的星尘：三种大小，越小越多
  const rand = rng(11)
  for (let i = 0; i < 900; i++) {
    const a = rand() * Math.PI * 2
    const r = Math.sqrt(rand()) * layout.extent
    const s = rand()
    const rad = s < 0.85 ? 0.6 : s < 0.97 ? 1 : 1.6
    ctx.fillStyle = `rgba(233,227,211,${s < 0.85 ? 0.22 : 0.4})`
    ctx.beginPath()
    ctx.arc(Math.cos(a) * r, Math.sin(a) * r, rad, 0, Math.PI * 2)
    ctx.fill()
  }

  // 星云：每片是几团叠在一起的柔光，沿圈方向拉长
  ctx.globalCompositeOperation = 'lighter'
  for (const cl of layout.clouds) {
    const alpha = opts.cloudAlpha.get(`${cl.sector}/${cl.level}`) ?? 0
    if (alpha <= 0) continue
    const [R, G, B] = hueOf(opts.sectorIndex.get(cl.sector) ?? 0)
    const blobs = Math.max(2, Math.round(cl.rx / 70))
    for (let b = 0; b < blobs; b++) {
      const t = blobs === 1 ? 0 : (b / (blobs - 1) - 0.5) * 2
      // 沿圈的切线方向摆开
      const tx = -Math.sin(cl.angle)
      const ty = Math.cos(cl.angle)
      const cx = cl.x + tx * t * (cl.rx - 50)
      const cy = cl.y + ty * t * (cl.rx - 50)
      const rad = cl.ry * 1.9
      const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, rad)
      g.addColorStop(0, `rgba(${R},${G},${B},${0.26 * alpha})`)
      g.addColorStop(0.45, `rgba(${R},${G},${B},${0.1 * alpha})`)
      g.addColorStop(1, `rgba(${R},${G},${B},0)`)
      ctx.fillStyle = g
      ctx.beginPath()
      ctx.arc(cx, cy, rad, 0, Math.PI * 2)
      ctx.fill()
    }
  }
  return c
}
