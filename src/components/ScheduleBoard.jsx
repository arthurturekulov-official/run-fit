import "../styles/ScheduleBoard.css"

export default function ScheduleBoard({ trainings, onBook, onCancel, userBookings = [] }) {
  return (
    <div className="schedule-board">
      <div className="board-header">
        <h2>Расписание тренировок</h2>
        <p>Выберите подходящее занятие и запишитесь в один клик</p>
      </div>

      <div className="cards-grid">
        {trainings.map((item) => {
          const isBooked = userBookings.includes(item.id)
          const isSoldOut = item.availableSlots === 0

          return (
            <div key={item.id} className="training-card">
              <div className="card-top">
                <span className="category-badge">{item.category}</span>
                <span className="status-badge">
                  {item.availableSlots > 0 ? `Свободно: ${item.availableSlots}` : "Мест нет"}
                </span>
              </div>

              <h3>{item.title}</h3>
              <p className="trainer-name">👨‍🏫 Тренер: {item.trainer}</p>
              <p className="time-info">⏰ {item.date || "Сегодня"}, {item.time}</p>

              <button
                disabled={!isBooked && isSoldOut}
                onClick={() => (isBooked ? onCancel(item.id) : onBook(item.id))}
                className={`book-btn ${isBooked ? "cancel-btn" : isSoldOut ? "disabled" : ""}`}
              >
                {isBooked ? "Отменить запись" : isSoldOut ? "Мест нет" : "Записаться"}
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}