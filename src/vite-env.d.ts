/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** '1' 表示走 /api，进度存数据库 */
  readonly VITE_API?: string
}
