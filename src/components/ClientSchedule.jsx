import { useEffect, useState } from "react"
import { Trash2, CalendarCheck } from "lucide-react"
import Toast from "./Toast"

export default function ClientSchedule({ supabase, user }) {
  const [trainings, setTrainings] = useState([])
  const [userBookings, setUserBookings] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedTrainingId, setSelectedTrainingId] = useState("")
  const [toast, setToast] = useState(null)

  const showToast = (message, type = "success") => {
    setToast({ message, type })
  }

  const fetchData = async () => {
    try {
      // 1. Загружаем все тренировки
      const { data: trainingsData, error: tError } = await supabase
        .from('trainings')
        .select('*')
        .order('date', { ascending: true })

      if (tError) throw tError
      setTrainings(trainingsData || [])

      // 2. Загружаем записи текущего пользователя
      const { data: bookingsData, error: bError } = await supabase
        .from('bookings')
        .select('*')
        .eq('user_email', user.email)

      if (bError) throw bError

      // 3. Подтягиваем детальную информацию о тренировках вручную или через простой JOIN, 
      // чтобы избежать ошибок синтаксиса псевдонимов в Supabase JS-клиенте
      const enrichedBookings = await Promise.all(
        (bookingsData || []).map(async (booking) => {
          // Получаем основную тренировку
          let trainingDetails = null
          if (booking.training_id) {
            const { data: tData } = await supabase
              .from('trainings')
              .select('*')
              .eq('id', booking.training_id)
              .maybeSingle()
            trainingDetails = tData
          }

          // Получаем тренировку, на которую запрошен перенос (если есть)
          let requestedDetails = null
          if (booking.requested_training_id) {
            const { data: reqData } = await supabase
              .from('trainings')
              .select('*')
              .eq('id', booking.requested_training_id)
              .maybeSingle()
            requestedDetails = reqData
          }

          return {
            ...booking,
            trainings: trainingDetails,
            requested_training: requestedDetails
          }
        })
      )

      setUserBookings(enrichedBookings)
    } catch (err) {
      console.error("Ошибка загрузки данных:", err.message)
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => {
    if (!user?.email) return
    fetchData()

    const tChannel = supabase
      .channel('client-schedule-trainings')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'trainings' }, () => fetchData())
      .subscribe()

    const bChannel = supabase
      .channel('client-schedule-bookings')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings' }, () => fetchData())
      .subscribe()

    return () => {
      supabase.removeChannel(tChannel)
      supabase.removeChannel(bChannel)
    }
  }, [user])

  const handleBook = async (e) => {
    e.preventDefault()
    if (!selectedTrainingId) {
      showToast("Выберите тренировку для записи!", "error")
      return
    }

    const targetTraining = trainings.find(t => t.id == selectedTrainingId)
    if (!targetTraining) return

    if (targetTraining.available_slots <= 0) {
      showToast("На эту тренировку закончились свободные места.", "error")
      return
    }

    const hasTimeConflict = userBookings.some(b => 
      b.trainings?.date === targetTraining.date && 
      b.trainings?.time === targetTraining.time
    )

    if (hasTimeConflict) {
      showToast("Вы уже записаны на другую тренировку в это же время!", "error")
      return
    }

    const alreadyBooked = userBookings.some(b => b.training_id == selectedTrainingId)
    if (alreadyBooked) {
      showToast("Вы уже записаны на эту тренировку!", "error")
      return
    }

    try {
      const { error: bookError } = await supabase.from('bookings').insert([{
        training_id: targetTraining.id,
        user_email: user.email
      }])

      if (bookError) throw bookError

      const { error: updateError } = await supabase
        .from('trainings')
        .update({ available_slots: targetTraining.available_slots - 1 })
        .eq('id', targetTraining.id)

      if (updateError) throw updateError

      setSelectedTrainingId("")
      showToast("Вы успешно записались на тренировку!")
      fetchData()
    } catch (err) {
      console.error("Ошибка бронирования:", err.message)
      showToast("Не удалось записаться на тренировку.", "error")
    }
  }

  const handleCancelBooking = async (bookingId, trainingId) => {
    if (!window.confirm("Отменить запись на эту тренировку?")) return

    try {
      await supabase.from('bookings').delete().eq('id', bookingId)

      const training = trainings.find(t => t.id === trainingId)
      if (training) {
        await supabase
          .from('trainings')
          .update({ available_slots: Math.min(training.max_slots, training.available_slots + 1) })
          .eq('id', trainingId)
      }

      showToast("Запись отменена, место освобождено")
      fetchData()
    } catch (err) {
      console.error("Ошибка отмены:", err.message)
      showToast("Не удалось отменить запись.", "error")
    }
  }

  const userBusySlots = userBookings.map(b => `${b.trainings?.date}_${b.trainings?.time}`)
  const bookedTrainingIds = userBookings.map(b => b.training_id)

  const availableTrainings = trainings.filter(t => {
    if (bookedTrainingIds.includes(t.id)) return false
    if (userBusySlots.includes(`${t.date}_${t.time}`)) return false
    if (t.available_slots <= 0) return false
    return true
  })

  if (loading) return <div style={{ color: '#fff', padding: '20px', textAlign: 'center' }}>Загрузка ваших записей...</div>

  return (
    <div className="client-schedule" style={{ padding: '20px', color: '#fff', maxWidth: '850px', margin: '0 auto', position: 'relative' }}>
      {toast && (
        <div style={{ position: 'fixed', top: '20px', right: '20px', zIndex: 9999 }}>
          <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
        </div>
      )}

      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '24px', fontWeight: '600', marginBottom: '6px' }}>Мои записи и быстрая бронь</h2>
        <p style={{ color: '#8c92b0', fontSize: '14px' }}>Выбирайте свободные слоты без пересечения по времени</p>
      </div>

      {/* Форма записи через выпадающий список */}
      <form onSubmit={handleBook} style={{ background: '#131629', padding: '22px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.08)', marginBottom: '30px' }}>
        <h3 style={{ fontSize: '18px', marginBottom: '14px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <CalendarCheck size={20} color="#a29bfe" /> Записаться на тренировку
        </h3>
        
        {availableTrainings.length === 0 ? (
          <div style={{ color: '#8c92b0', fontSize: '14px', padding: '10px 0' }}>
            Нет доступных тренировок (все места заняты или на это время у вас уже есть запись).
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <select
              value={selectedTrainingId}
              onChange={(e) => setSelectedTrainingId(e.target.value)}
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '10px',
                border: '1px solid rgba(255,255,255,0.1)',
                background: '#1a1e36',
                color: '#fff',
                fontSize: '14px',
                outline: 'none',
                boxSizing: 'border-box'
              }}
              required
            >
              <option value="">-- Выберите тренировку и время --</option>
              {availableTrainings.map(t => (
                <option key={t.id} value={t.id}>
                  {t.title} ({t.date}, {t.time}) — Тренер: {t.trainer} | Мест: {t.available_slots}/{t.max_slots}
                </option>
              ))}
            </select>

            <button 
              type="submit" 
              style={{
                background: '#6c5ce7',
                color: '#fff',
                border: 'none',
                padding: '12px 20px',
                borderRadius: '10px',
                fontWeight: '600',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              Подтвердить запись
            </button>
          </div>
        )}
      </form>

      {/* Список активных записей клиента */}
      <div>
        <h3 style={{ fontSize: '18px', marginBottom: '14px', fontWeight: '600' }}>Ваши активные записи ({userBookings.length})</h3>
        {userBookings.length === 0 ? (
          <div style={{ background: '#131629', padding: '25px', borderRadius: '14px', textAlign: 'center', color: '#8c92b0' }}>
            У вас пока нет активных записей.
          </div>
        ) : (
          <div style={{ display: 'grid', gap: '12px' }}>
            {userBookings.map(b => (
              <div key={b.id} style={{
                background: '#131629',
                border: '1px solid rgba(255,255,255,0.08)',
                padding: '18px',
                borderRadius: '14px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <div>
                  <h4 style={{ margin: '0 0 4px 0', fontSize: '16px', fontWeight: '600' }}>{b.trainings?.title || "Тренировка удалена"}</h4>
                  <p style={{ margin: '0 0 2px 0', fontSize: '13px', color: '#8c92b0' }}>
                    📅 {b.trainings?.date} | ⏰ {b.trainings?.time}
                  </p>
                  <p style={{ margin: '0', fontSize: '12px', color: '#616685' }}>
                    👤 Тренер: {b.trainings?.trainer}
                  </p>
                </div>
                <button
                  onClick={() => handleCancelBooking(b.id, b.training_id)}
                  style={{
                    background: 'rgba(231, 76, 60, 0.15)',
                    color: '#ff6b6b',
                    border: 'none',
                    padding: '8px 14px',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontSize: '13px',
                    fontWeight: '500',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <Trash2 size={14} /> Отменить
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}