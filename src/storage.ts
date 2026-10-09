import { useEffect, useState } from 'react'

// localStorage 在隐私模式等情况下可能不可用，所有读写都要兜底
export function usePersistentState<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(key)
      return raw ? (JSON.parse(raw) as T) : initial
    } catch {
      return initial
    }
  })
  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value))
    } catch {
      // 存不了就只在本次会话里生效
    }
  }, [key, value])
  return [value, setValue] as const
}
