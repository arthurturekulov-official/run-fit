import { Calendar, Users } from "lucide-react"
import "../styles/Sidebar.css"

export default function Sidebar({ activeTab, setActiveTab }) {
  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <span>🏋️‍♂️</span>
      </div>
      <nav className="sidebar-nav">
        <button
          className={`nav-item ${activeTab === "schedule" ? "active" : ""}`}
          onClick={() => setActiveTab("schedule")}
          title="Расписание"
        >
          <Calendar size={22} />
        </button>
        <button
          className={`nav-item ${activeTab === "admin" ? "active" : ""}`}
          onClick={() => setActiveTab("admin")}
          title="Админ-панель"
        >
          <Users size={22} />
        </button>
      </nav>
    </aside>
  )
}