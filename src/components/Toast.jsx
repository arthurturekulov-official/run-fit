import { useEffect } from "react"
import { CheckCircle, AlertCircle, X } from "lucide-react"
import "../styles/Toast.css"

export default function Toast({ message, type = "success", onClose, actionText, onAction }) {
  // Автоматически скрываем уведомление через 4 секунды
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose()
    }, 4000)
    return () => clearTimeout(timer)
  }, [onClose])

  return (
    <div className={`toast-notification ${type}`}>
      <div className="toast-content">
        {type === "success" && <CheckCircle size={18} className="toast-icon" />}
        {type === "error" && <AlertCircle size={18} className="toast-icon" />}
        <span>{message}</span>
      </div>

      {/* Опциональная интерактивная кнопка в тосте */}
      {actionText && (
        <button className="toast-action-btn" onClick={onAction}>
          {actionText}
        </button>
      )}

      <button className="toast-close" onClick={onClose} title="Закрыть">
        <X size={16} />
      </button>
    </div>
  )
}