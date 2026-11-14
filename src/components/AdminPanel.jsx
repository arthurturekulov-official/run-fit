import { useState } from "react"
import { supabase } from "../supabaseClient"
import "../styles/AdminPanel.css"

export default function AdminPanel({ trainings, fetchTrainings }) {
  const [newTitle, setNewTitle] = useState("")
  const [newTrainer, setNewTrainer] = useState("")

  const handleAddTraining = async (e) => {
    e.preventDefault()
    if (!newTitle.trim() || !newTrainer.trim()) return

    try {
      const { error } = await supabase.from('trainings').insert([{
        title: newTitle.trim(),
        trainer: newTrainer.trim(),
        time: "14:00 - 15:30",
        date: "Сегодня",
        category: "Общая",
        max_slots: 10,
        available_slots: 10,
      }])

      if (error) throw error

      setNewTitle("")
      setNewTrainer("")

      if (fetchTrainings) fetchTrainings()
    } catch (err) {
      console.error("Ошибка при добавлении тренировки:", err.message)
      alert("Не удалось добавить тренировку в базу данных.")
    }
  }

  const handleDelete = async (id) => {
    try {
      const { error } = await supabase.from('trainings').delete().eq('id', id)
      if (error) throw error

      if (fetchTrainings) fetchTrainings()
    } catch (err) {
      console.error("Ошибка при удалении тренировки:", err.message)
      alert("Не удалось удалить тренировку из базы данных.")
    }
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
            required
          />
          <input
            type="text"
            placeholder="Имя тренера"
            value={newTrainer}
            onChange={(e) => setNewTrainer(e.target.value)}
            required
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
              <span className="admin-trainer"> — {item.trainer} ({item.date || item.time})</span>
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