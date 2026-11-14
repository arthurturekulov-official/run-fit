import { useState } from "react"
import Sidebar from "./components/Sidebar"
import ScheduleBoard from "./components/ScheduleBoard"
import AdminPanel from "./components/AdminPanel"
import LoginScreen from "./components/LoginScreen"
import Toast from "./components/Toast"
import { INITIAL_TRAININGS } from "./data/mockData.js"

export default function App() {
  const [user, setUser] = useState(null)
  const [activeTab, setActiveTab] = useState("schedule")
  const [trainings, setTrainings] = useState(INITIAL_TRAININGS)
  
  const [toast, setToast] = useState(null) 

  const handleLogin = (userData) => {
    setUser(userData)
    setActiveTab(userData.role === "admin" ? "admin" : "schedule")
    setToast({
      message: `Добро пожаловать, ${userData.name}!`,
      type: "success",
    })
  }

  const handleLogout = () => {
    setUser(null)
    setToast({
      message: "Вы вышли из системы",
      type: "info",
    })
  }

  const handleBook = (id) => {
    setTrainings((prev) =>
      prev.map((item) => {
        if (item.id === id && item.availableSlots > 0) {

          setToast({
            message: `Вы записаны на "${item.title}"!`,
            type: "success",
            actionText: "Отменить",
            onAction: () => {

              setTrainings((current) =>
                current.map((t) => (t.id === id ? { ...t, availableSlots: t.availableSlots + 1 } : t))
              )
              setToast({ message: "Запись отменена", type: "error" })
            },
          })

          return { ...item, availableSlots: item.availableSlots - 1 }
        }
        return item
      })
    )
  }

  if (!user) {
    return (
      <>
        <LoginScreen onLogin={handleLogin} />
        {toast && <Toast {...toast} onClose={() => setToast(null)} />}
      </>
    )
  }

  return (
    <div className="app-layout">
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        user={user}
        onLogout={handleLogout}
      />

      <main className="main-viewport">
        {user.role === "client" && activeTab === "schedule" && (
          <ScheduleBoard trainings={trainings} onBook={handleBook} />
        )}
        {user.role === "admin" && activeTab === "admin" && (
          <AdminPanel trainings={trainings} setTrainings={setTrainings} />
        )}
      </main>

      {toast && <Toast {...toast} onClose={() => setToast(null)} />}
    </div>
  )
}