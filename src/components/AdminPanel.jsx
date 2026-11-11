import { useState } from "react"
import "../styles/AdminPanel.css"

export default function AdminPanel({ trainings, setTrainings }) {
  const [newTitle, setNewTitle] = useState("")
  const [newTrainer, setNewTrainer] = useState("")

  const handleAddTraining = (e) => {
    e.preventDefault()
    if (!newTitle || !newTrainer) return

    const newItem = {
      id: Date.now(),
      title: newTitle,
      trainer: newTrainer,
      time: "14:00 - 15:30",
      day: "Ср, 22",
      category: "Общая",
      status: "OPEN",
      availableSlots: 10,
      maxSlots: 10,
    }

    setTrainings([...trainings, newItem])
    setNewTitle("")
    setNewTrainer("")
  }

  const handleDelete = (id) => {
    setTrainings(trainings.filter((item) => item.id !== id))
  }

  return (
    <div className="admin-panel">
      <div className="board-header">
        <h2>Панель администратора</h2>
        <p>Управление расписанием и данными спортивного центра</p>
      </div>

      <form onSubmit={handleAddTraining} className="admin-form">
        <h3>Добавить новую тренировку</h3>
        <div className="form-group">
          <input
            type="text"
            placeholder="Название тренировки"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
          />
          <input
            type="text"
            placeholder="Имя тренера"
            value={newTrainer}
            onChange={(e) => setNewTrainer(e.target.value)}
          />
          <button type="submit" className="add-btn">Добавить</button>
        </div>
      </form>

      <div className="admin-list">
        <h3>Список текущих занятий</h3>
        {trainings.map((item) => (
          <div key={item.id} className="admin-item">
            <div>
              <strong>{item.title}</strong>
              <span className="admin-trainer"> — {item.trainer} ({item.day})</span>
            </div>
            <button onClick={() => handleDelete(item.id)} className="delete-btn">
              Удалить
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}