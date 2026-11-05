import type { DatabaseSync } from 'node:sqlite'
import { rebuild } from '../server/db.ts'

/** 每个测试文件一份内存数据库，建一次就够（约 100ms） */
let cached: DatabaseSync | undefined
export function freshDb(): DatabaseSync {
  return rebuild(':memory:')
}
export function sharedDb(): DatabaseSync {
  return (cached ??= freshDb())
}

/** 可复现的伪随机数（mulberry32），让随机测试每次结果一样 */
export function rng(seed: number) {
  return () => {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
