import { useState } from "react"
import Sidebar from "./components/Sidebar"
import AdminPanel from "./components/AdminPanel"
import {INITIAL_TRAININGS} from "./data/mockData.js"
import ScheduleBoard from "./components/ScheduleBoard.jsx"

export default function App() {
  const [trainings, setTrainings] = useState(INITIAL_TRAININGS)
  const [activeTab, setActiveTab] = useState("schedule") 

  const handleBook = (id) => {
      setTrainings((prev) =>
        prev.map((item) =>
          item.id === id && item.availableSlots > 0
            ? { ...item, availableSlots: item.availableSlots - 1 }
            : item
        )
      )
  }

  return (
    <div className="app-layout">
          <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />

          <main className="main-viewport">
            {activeTab === "schedule" && (
              <ScheduleBoard trainings={trainings} onBook={handleBook} />
            )}
            {activeTab === "admin" && (
              <AdminPanel trainings={trainings} setTrainings={setTrainings} />
            )}
          </main>
        </div>
  )
}