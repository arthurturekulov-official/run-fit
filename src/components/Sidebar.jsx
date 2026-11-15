import { Calendar, BookmarkCheck, Users, ClipboardList, LogOut } from "lucide-react"
import "../styles/Sidebar.css"

export default function Sidebar({ activeTab, setActiveTab, user, onLogout }) {
  return (
    <aside className="sidebar">
      <div className="sidebar-logo" title={user?.name}>
        <span>🏋️‍♂️</span>
      </div>

      <nav className="sidebar-nav">
        {user?.role === "client" && (
          <>
            <button
              className={`nav-item ${activeTab === "schedule" ? "active" : ""}`}
              onClick={() => setActiveTab("schedule")}
              title="Все тренировки (Витрина)"
            >
              <Calendar size={22} />
            </button>

            <button
              className={`nav-item ${activeTab === "my-bookings" ? "active" : ""}`}
              onClick={() => setActiveTab("my-bookings")}
              title="Мои записи и быстрая бронь"
            >
              <BookmarkCheck size={22} />
            </button>
          </>
        )}

        {user?.role === "admin" && (
          <>
            <button
              className={`nav-item ${activeTab === "admin" ? "active" : ""}`}
              onClick={() => setActiveTab("admin")}
              title="Управление тренировками"
            >
              <Users size={22} />
            </button>

            <button
              className={`nav-item ${activeTab === "bookings" ? "active" : ""}`}
              onClick={() => setActiveTab("bookings")}
              title="Записи клиентов (Live)"
            >
              <ClipboardList size={22} />
            </button>
          </>
        )}
      </nav>

      <button
        className="nav-item logout-btn"
        onClick={onLogout}
        title="Выйти из аккаунта"
      >
        <LogOut size={20} />
      </button>
    </aside>
  )
}