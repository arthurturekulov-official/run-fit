import { useState } from "react"
import { supabase } from "../supabaseClient"
import "../styles/AdminPanel.css"

// Список доступных временных слотов с 09:00 до 23:00
const TIME_SLOTS = [
  "09:00 - 10:30",
  "10:30 - 12:00",
  "12:00 - 13:30",
  "13:30 - 15:00",
  "15:00 - 16:30",
  "16:30 - 18:00",
  "18:00 - 19:30",
  "19:30 - 21:00",
  "21:00 - 22:30"
]

const getTodayDate = () => {
  const today = new Date()
  return today.toISOString().split('T')[0]
}

export default function AdminPanel({ trainings, fetchTrainings }) {
  const [newTitle, setNewTitle] = useState("")
  const [newTrainer, setNewTrainer] = useState("")
  const [newTime, setNewTime] = useState(TIME_SLOTS[0])
  const [newDate, setNewDate] = useState(getTodayDate())
  const [newSlots, setNewSlots] = useState(10)

  // Состояние для отслеживания редактируемой тренировки (null, если создаем новую)
  const [editingId, setEditingId] = useState(null)

  // Очистка формы и сброс режима редактирования
  const resetForm = () => {
    setNewTitle("")
    setNewTrainer("")
    setNewTime(TIME_SLOTS[0])
    setNewDate(getTodayDate())
    setNewSlots(10)
    setEditingId(null)
  }

  // Обработка отправки формы (Добавление или Обновление)
  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!newTitle.trim() || !newTrainer.trim()) return

    const slotsNumber = parseInt(newSlots) || 10

    try {
      if (editingId) {
        // --- РЕЖИМ РЕДАКТИРОВАНИЯ ---
        // Получаем текущие данные тренировки, чтобы скорректировать available_slots при изменении max_slots
        const oldTraining = trainings.find(t => t.id === editingId)
        let slotDiff = 0
        if (oldTraining) {
          const bookedCount = oldTraining.max_slots - oldTraining.available_slots
          slotDiff = slotsNumber - bookedCount // новые свободные места
          if (slotDiff < 0) {
            alert("Нельзя установить максимальное мест меньше, чем уже записано клиентов!")
            return
          }
        }

        const { error } = await supabase
          .from('trainings')
          .update({
            title: newTitle.trim(),
            trainer: newTrainer.trim(),
            time: newTime,
            date: newDate,
            max_slots: slotsNumber,
            available_slots: slotDiff >= 0 ? slotDiff : slotsNumber
          })
          .eq('id', editingId)

        if (error) throw error
        alert("Тренировка успешно обновлена!")
      } else {
        // --- РЕЖИМ СОЗДАНИЯ ---
        const { error } = await supabase.from('trainings').insert([{
          title: newTitle.trim(),
          trainer: newTrainer.trim(),
          time: newTime,
          date: newDate,
          category: "Общая",
          max_slots: slotsNumber,
          available_slots: slotsNumber,
        }])

        if (error) throw error
        alert("Тренировка успешно добавлена!")
      }

      resetForm()
      if (fetchTrainings) fetchTrainings()
    } catch (err) {
      console.error("Ошибка при сохранении тренировки:", err.message)
      alert("Не удалось сохранить тренировку в базу данных.")
    }
  }

  // Заполнение формы данными выбранной тренировки для редактирования
  const handleEditClick = (training) => {
    setEditingId(training.id)
    setNewTitle(training.title)
    setNewTrainer(training.trainer)
    setNewTime(training.time || TIME_SLOTS[0])
    setNewDate(training.date || getTodayDate())
    setNewSlots(training.max_slots)
    
    // Плавный скролл к форме наверх
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleDelete = async (id) => {
    if (!window.confirm("Вы уверены, что хотите удалить эту тренировку?")) return

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
    <div className="admin-panel" style={{ padding: '20px', maxWidth: '900px', margin: '0 auto', color: '#fff' }}>
      <div className="board-header" style={{ marginBottom: '24px' }}>
        <h2>Панель администратора</h2>
        <p style={{ color: '#8c92b0' }}>Управление расписанием и данными спортивного центра</p>
      </div>

      {/* Форма добавления / редактирования */}
      <form onSubmit={handleSubmit} className="admin-form" style={{ background: '#131629', padding: '20px', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.08)', marginBottom: '30px' }}>
        <h3 style={{ marginBottom: '16px', color: editingId ? '#a29bfe' : '#fff' }}>
          {editingId ? "✏️ Редактировать тренировку" : "➕ Добавить новую тренировку"}
        </h3>
        
        <div className="form-group" style={{ display: 'grid', gap: '12px' }}>
          <input
            type="text"
            placeholder="Название тренировки (например, Йога)"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            required
            style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', background: '#1a1e36', color: '#fff', boxSizing: 'border-box', outline: 'none' }}
          />
          <input
            type="text"
            placeholder="Имя тренера"
            value={newTrainer}
            onChange={(e) => setNewTrainer(e.target.value)}
            required
            style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', background: '#1a1e36', color: '#fff', boxSizing: 'border-box', outline: 'none' }}
          />
          
          <div style={{ display: 'flex', gap: '10px' }}>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: '13px', color: '#8c92b0', display: 'block', marginBottom: '4px' }}>
                Время (с 09:00 до 23:00):
              </label>
              <select
                value={newTime}
                onChange={(e) => setNewTime(e.target.value)}
                style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', background: '#1a1e36', color: '#fff', outline: 'none' }}
              >
                {TIME_SLOTS.map((slot) => (
                  <option key={slot} value={slot} style={{ background: '#131629', color: '#fff' }}>
                    {slot}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ flex: 1 }}>
              <label style={{ fontSize: '13px', color: '#8c92b0', display: 'block', marginBottom: '4px' }}>
                Дата:
              </label>
              <input
                type="date"
                value={newDate}
                onChange={(e) => setNewDate(e.target.value)}
                required
                style={{ 
                  width: '100%', 
                  padding: '11px', 
                  borderRadius: '8px', 
                  border: '1px solid rgba(255,255,255,0.1)', 
                  background: '#1a1e36', 
                  color: '#fff', 
                  boxSizing: 'border-box',
                  colorScheme: 'dark',
                  outline: 'none'
                }}
              />
            </div>
          </div>

          <div>
            <label style={{ fontSize: '13px', color: '#8c92b0', display: 'block', marginBottom: '4px' }}>
              Максимальное количество мест:
            </label>
            <input
              type="number"
              min="1"
              max="50"
              value={newSlots}
              onChange={(e) => setNewSlots(e.target.value)}
              required
              style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', background: '#1a1e36', color: '#fff', boxSizing: 'border-box', outline: 'none' }}
            />
          </div>

          <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
            <button 
              type="submit" 
              className="add-btn" 
              style={{ 
                flex: 1, 
                padding: '12px', 
                background: editingId ? '#6c5ce7' : '#00b894', 
                color: '#fff', 
                border: 'none', 
                borderRadius: '8px', 
                fontWeight: '600', 
                cursor: 'pointer' 
              }}
            >
              {editingId ? "Сохранить изменения" : "Добавить тренировку"}
            </button>

            {editingId && (
              <button 
                type="button" 
                onClick={resetForm}
                style={{ 
                  padding: '12px 20px', 
                  background: 'rgba(255,255,255,0.1)', 
                  color: '#fff', 
                  border: 'none', 
                  borderRadius: '8px', 
                  fontWeight: '500', 
                  cursor: 'pointer' 
                }}
              >
                Отмена
              </button>
            )}
          </div>
        </div>
      </form>

      {/* Список занятий с кнопками Редактировать и Удалить */}
      <div className="admin-list">
        <h3 style={{ marginBottom: '14px' }}>Список текущих занятий</h3>
        {trainings.length === 0 ? (
          <div style={{ background: '#131629', padding: '25px', borderRadius: '12px', textAlign: 'center', color: '#8c92b0' }}>
            Список тренировок пуст.
          </div>
        ) : (
          <div style={{ display: 'grid', gap: '12px' }}>
            {trainings.map((item) => (
              <div key={item.id} className="admin-item" style={{ 
                background: '#131629', 
                border: editingId === item.id ? '1px solid #6c5ce7' : '1px solid rgba(255,255,255,0.08)', 
                padding: '16px', 
                borderRadius: '12px', 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center' 
              }}>
                <div>
                  <strong style={{ fontSize: '16px', color: '#fff' }}>{item.title}</strong>
                  <div style={{ fontSize: '13px', color: '#8c92b0', marginTop: '4px' }}>
                    👤 {item.trainer} | ⏰ {item.date}, {item.time} | 🪑 Мест: {item.available_slots}/{item.max_slots}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button 
                    onClick={() => handleEditClick(item)} 
                    style={{ 
                      background: 'rgba(108, 92, 231, 0.15)', 
                      color: '#a29bfe', 
                      border: 'none', 
                      padding: '8px 12px', 
                      borderRadius: '8px', 
                      cursor: 'pointer', 
                      fontSize: '13px', 
                      fontWeight: '500' 
                    }}
                  >
                    Редактировать
                  </button>
                  <button 
                    onClick={() => handleDelete(item.id)} 
                    className="delete-btn"
                    style={{ 
                      background: 'rgba(231, 76, 60, 0.15)', 
                      color: '#ff6b6b', 
                      border: 'none', 
                      padding: '8px 12px', 
                      borderRadius: '8px', 
                      cursor: 'pointer', 
                      fontSize: '13px', 
                      fontWeight: '500' 
                    }}
                  >
                    Удалить
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}