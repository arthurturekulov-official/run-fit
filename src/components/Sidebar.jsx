import { Calendar, Users, LogOut } from "lucide-react"
import "../styles/Sidebar.css"

export default function Sidebar({ activeTab, setActiveTab, user, onLogout }) {
  return (
    <aside className="sidebar">
      <div className="sidebar-logo" title={user?.name}>
        <span>🏋️‍♂️</span>
      </div>

      <nav className="sidebar-nav">
        {user?.role === "client" && (
          <button
            className={`nav-item ${activeTab === "schedule" ? "active" : ""}`}
            onClick={() => setActiveTab("schedule")}
            title="Расписание тренировок"
          >
            <Calendar size={22} />
          </button>
        )}

        {user?.role === "admin" && (
          <button
            className={`nav-item ${activeTab === "admin" ? "active" : ""}`}
            onClick={() => setActiveTab("admin")}
            title="Панель администратора"
          >
            <Users size={22} />
          </button>
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