import "../styles/ScheduleBoard.css"

export default function ScheduleBoard({ trainings, onBook }) {
  return (
    <div className="schedule-board">
      <div className="board-header">
        <h2>Расписание тренировок</h2>
        <p>Выберите подходящее занятие и запишитесь в один клик</p>
      </div>

      <div className="cards-grid">
        {trainings.map((item) => (
          <div key={item.id} className="training-card">
            <div className="card-top">
              <span className="category-badge">{item.category}</span>
              <span className="status-badge">
                {item.availableSlots > 0 ? `Свободно: ${item.availableSlots}` : "Мест нет"}
              </span>
            </div>

            <h3>{item.title}</h3>
            <p className="trainer-name">👨‍🏫 Тренер: {item.trainer}</p>
            <p className="time-info">⏰ {item.day}, {item.time}</p>

            <button
              disabled={item.availableSlots === 0}
              onClick={() => onBook(item.id)}
              className={`book-btn ${item.availableSlots === 0 ? "disabled" : ""}`}
            >
              {item.availableSlots > 0 ? "Записаться" : "Мест нет"}
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}