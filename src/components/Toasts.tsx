import { useApp } from '../state'

export function Toasts() {
  const { toasts, dismissToast } = useApp()
  return (
    <div className="toasts" role="status" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} className="toast">
          <span>{t.text}</span>
          {t.action && (
            <button onClick={() => { t.action!.run(); dismissToast(t.id) }}>{t.action.label}</button>
          )}
          <button className="close" aria-label="关闭" onClick={() => dismissToast(t.id)}>×</button>
        </div>
      ))}
    </div>
  )
}
