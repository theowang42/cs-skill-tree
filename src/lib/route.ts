// 你选定要学的岗位（首页点“就学这个”）。存在浏览器里：下次打开首页直接进这条路线，技能树里把路线外的技能变浅。
// 首页是不经打包的静态页，自己的脚本里用同样的两个名字。

export const ROUTE_KEY = 'cs-skill-tree:route'
/** 这个标签页已经进过站：再回首页就是想换方向，不再自动跳走 */
export const SEEN_KEY = 'cs-skill-tree:seen'

export function loadRoute(): string | null {
  try {
    sessionStorage.setItem(SEEN_KEY, '1')
  } catch {}
  try {
    return localStorage.getItem(ROUTE_KEY)
  } catch {
    return null
  }
}
