// 兜底：渲染出错时不要白屏，给出备份和清空的出路
import { Component, type ReactNode } from 'react'
import { EMPTY, load, save, toFile } from '../lib/progress'

export class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null }

  static getDerivedStateFromError(error: Error) {
    return { error }
  }

  private download = () => {
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([toFile(load())], { type: 'application/json' }))
    a.download = 'cs-skill-tree-backup.json'
    a.click()
  }

  private reset = () => {
    save(EMPTY)
    location.hash = ''
    location.reload()
  }

  render() {
    if (!this.state.error) return this.props.children
    return (
      <div className="boot error">
        <p>页面出错了：{this.state.error.message}</p>
        <div className="row-actions">
          <button onClick={() => location.reload()}>重新加载</button>
          {load().lit.size > 0 && <button onClick={this.download}>先备份进度</button>}
          <button className="danger" onClick={this.reset}>清空本地进度后重试</button>
        </div>
      </div>
    )
  }
}
