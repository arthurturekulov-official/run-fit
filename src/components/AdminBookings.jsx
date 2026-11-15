import { useEffect, useState } from "react"
import { Search, X, Trash2, User, RefreshCw, Check, Ban } from "lucide-react"
import Toast from "./Toast"

export default function AdminBookings({ supabase }) {
  const [bookings, setBookings] = useState([])
  const [allTrainings, setAllTrainings] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedUserEmail, setSelectedUserEmail] = useState(null)
  const [rescheduleTargets, setRescheduleTargets] = useState({})
  const [toast, setToast] = useState(null)

  const showToast = (message, type = "success") => {
    setToast({ message, type })
  }

  const fetchAllData = async () => {
    try {
      const { data: trainingsData, error: trainingsError } = await supabase
        .from('trainings')
        .select('*')
        .order('date', { ascending: true })

      if (trainingsError) throw trainingsError
      setAllTrainings(trainingsData || [])

      const { data: bookingsData, error: bookingsError } = await supabase
        .from('bookings')
        .select('*')
        .order('created_at', { ascending: false })

      if (bookingsError) throw bookingsError

      const enrichedBookings = await Promise.all(
        (bookingsData || []).map(async (booking) => {
          let trainingDetails = null
          if (booking.training_id) {
            const { data: tData } = await supabase
              .from('trainings')
              .select('*')
              .eq('id', booking.training_id)
              .maybeSingle()
            trainingDetails = tData
          }

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

      setBookings(enrichedBookings)
    } catch (err) {
      console.error("Ошибка загрузки данных:", err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAllData()

    const bookingsChannel = supabase
      .channel('admin-bookings-channel')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings' }, () => fetchAllData())
      .subscribe()

    const trainingsChannel = supabase
      .channel('admin-trainings-channel')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'trainings' }, () => fetchAllData())
      .subscribe()

    return () => {
      supabase.removeChannel(bookingsChannel)
      supabase.removeChannel(trainingsChannel)
    }
  }, [])

  const handleApproveReschedule = async (booking) => {
    const newTraining = booking.requested_training
    if (!newTraining || newTraining.available_slots <= 0) {
      showToast("На выбранной тренировке уже закончились места!", "error")
      return
    }

    try {
      const { error: updateError } = await supabase
        .from('bookings')
        .update({
          training_id: newTraining.id,
          requested_training_id: null,
          reschedule_status: 'none'
        })
        .eq('id', booking.id)

      if (updateError) throw updateError

      const oldTraining = booking.trainings
      if (oldTraining) {
        await supabase
          .from('trainings')
          .update({ available_slots: Math.min(oldTraining.max_slots, oldTraining.available_slots + 1) })
          .eq('id', oldTraining.id)
      }

      await supabase
        .from('trainings')
        .update({ available_slots: Math.max(0, newTraining.available_slots - 1) })
        .eq('id', newTraining.id)

      showToast("Перенос одобрен, слоты обновлены!")
      fetchAllData()
    } catch (err) {
      showToast("Ошибка при одобрении переноса.", "error")
    }
  }

  const handleRejectReschedule = async (bookingId) => {
    try {
      const { error } = await supabase
        .from('bookings')
        .update({
          requested_training_id: null,
          reschedule_status: 'none'
        })
        .eq('id', bookingId)

      if (error) throw error
      showToast("Запрос на перенос отклонён", "info")
      fetchAllData()
    } catch (err) {
      showToast("Не удалось отклонить запрос.", "error")
    }
  }

  const handleDeleteBooking = async (bookingId, trainingId) => {
    if (!window.confirm("Вы уверены, что хотите отменить эту запись клиента?")) return

    try {
      await supabase.from('bookings').delete().eq('id', bookingId)

      const { data: trainingData } = await supabase
        .from('trainings')
        .select('available_slots, max_slots')
        .eq('id', trainingId)
        .single()

      if (trainingData) {
        const restoredSlots = Math.min(trainingData.max_slots, trainingData.available_slots + 1)
        await supabase.from('trainings').update({ available_slots: restoredSlots }).eq('id', trainingId)
      }

      showToast("Запись успешно отменена, место возвращено")
      fetchAllData()
    } catch (err) {
      showToast("Не удалось отменить запись.", "error")
    }
  }

  const handleReschedule = async (bookingId, oldTrainingId) => {
    const newTrainingId = rescheduleTargets[bookingId]
    if (!newTrainingId) {
      showToast("Выберите новую тренировку для переноса!", "error")
      return
    }

    if (newTrainingId === oldTrainingId) {
      showToast("Клиент уже записан на эту тренировку.", "error")
      return
    }

    const targetTraining = allTrainings.find(t => t.id == newTrainingId)
    if (!targetTraining || targetTraining.available_slots <= 0) {
      showToast("На выбранной тренировке нет свободных мест!", "error")
      return
    }

    try {
      const { error: updateError } = await supabase
        .from('bookings')
        .update({ training_id: newTrainingId, requested_training_id: null, reschedule_status: 'none' })
        .eq('id', bookingId)

      if (updateError) throw updateError

      const oldTraining = allTrainings.find(t => t.id == oldTrainingId)
      if (oldTraining) {
        await supabase
          .from('trainings')
          .update({ available_slots: Math.min(oldTraining.max_slots, oldTraining.available_slots + 1) })
          .eq('id', oldTrainingId)
      }

      await supabase
        .from('trainings')
        .update({ available_slots: Math.max(0, targetTraining.available_slots - 1) })
        .eq('id', newTrainingId)

      setRescheduleTargets(prev => ({ ...prev, [bookingId]: "" }))
      showToast("Запись клиента успешно перенесена!")
      fetchAllData()
    } catch (err) {
      showToast("Не удалось перенести запись.", "error")
    }
  }

  const groupedByUser = bookings.reduce((acc, booking) => {
    const email = booking.user_email || "Неизвестный"
    if (!acc[email]) acc[email] = []
    acc[email].push(booking)
    return acc
  }, {})

  const filteredUsers = Object.keys(groupedByUser).filter((email) =>
    email.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const userBookingsInModal = selectedUserEmail ? groupedByUser[selectedUserEmail] || [] : []

  if (loading) return <div style={{ color: '#fff', padding: '20px', textAlign: 'center' }}>Загрузка записей...</div>

  return (
    <div className="admin-bookings" style={{ padding: '20px', color: '#fff', maxWidth: '900px', margin: '0 auto', position: 'relative' }}>
      {toast && (
        <div style={{ position: 'fixed', top: '20px', right: '20px', zIndex: 9999 }}>
          <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
        </div>
      )}

      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '24px', fontWeight: '600', marginBottom: '6px' }}>Записи клиентов</h2>
        <p style={{ color: '#8c92b0', fontSize: '14px' }}>Управление бронированиями и одобрение заявок на перенос</p>
      </div>

      <div style={{ position: 'relative', marginBottom: '20px' }}>
        <Search size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#8c92b0' }} />
        <input
          type="text"
          placeholder="Поиск по email клиента..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{ width: '100%', padding: '12px 12px 12px 42px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.08)', background: '#131629', color: '#fff', fontSize: '14px', outline: 'none' }}
        />
      </div>

      {filteredUsers.length === 0 ? (
        <div style={{ background: '#131629', padding: '30px', borderRadius: '12px', textAlign: 'center', color: '#8c92b0' }}>
          {searchTerm ? "По вашему запросу ничего не найдено." : "Пока нет ни одной активной записи от клиентов."}
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '12px' }}>
          {filteredUsers.map((email) => {
            const userItems = groupedByUser[email]
            const hasPendingRequest = userItems.some(b => b.reschedule_status === 'pending')

            return (
              <div 
                key={email} 
                onClick={() => setSelectedUserEmail(email)}
                style={{ 
                  background: '#131629', 
                  border: hasPendingRequest ? '1px solid rgba(241, 196, 15, 0.5)' : '1px solid rgba(255,255,255,0.08)', 
                  padding: '18px', 
                  borderRadius: '14px', 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center', 
                  cursor: 'pointer' 
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ background: 'rgba(108, 92, 231, 0.15)', padding: '10px', borderRadius: '10px', color: '#a29bfe' }}>
                    <User size={20} />
                  </div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                      <h4 style={{ margin: 0, fontSize: '16px', fontWeight: '600', color: '#fff' }}>{email}</h4>
                      {hasPendingRequest && (
                        <span style={{ background: 'rgba(241, 196, 15, 0.2)', color: '#f1c40f', fontSize: '11px', padding: '2px 8px', borderRadius: '6px', fontWeight: '600' }}>
                          🔔 Запрос на перенос
                        </span>
                      )}
                    </div>
                    <p style={{ margin: 0, fontSize: '13px', color: '#8c92b0' }}>Активных записей: <strong style={{ color: '#a29bfe' }}>{userItems.length}</strong></p>
                  </div>
                </div>
                <span style={{ background: 'rgba(255,255,255,0.05)', color: '#8c92b0', padding: '8px 14px', borderRadius: '8px', fontSize: '13px' }}>
                  Управлять записями →
                </span>
              </div>
            )
          })}
        </div>
      )}

      {/* МОДАЛЬНОЕ ОКНО */}
      {selectedUserEmail && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0, 0, 0, 0.7)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: '20px' }}>
          <div style={{ background: '#131629', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px', width: '100%', maxWidth: '650px', maxHeight: '85vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{ padding: '20px', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ margin: '0 0 4px 0', fontSize: '18px', color: '#fff' }}>Клиент: {selectedUserEmail}</h3>
                <p style={{ margin: 0, fontSize: '13px', color: '#8c92b0' }}>Все забронированные тренировки ({userBookingsInModal.length})</p>
              </div>
              <button onClick={() => setSelectedUserEmail(null)} style={{ background: 'transparent', border: 'none', color: '#8c92b0', cursor: 'pointer' }}>
                <X size={22} />
              </button>
            </div>

            <div style={{ padding: '20px', overflowY: 'auto', display: 'grid', gap: '14px', flex: 1 }}>
              {userBookingsInModal.map((booking) => (
                <div key={booking.id} style={{ background: '#1a1e36', border: '1px solid rgba(255,255,255,0.06)', padding: '14px', borderRadius: '10px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <h4 style={{ margin: '0 0 4px 0', fontSize: '15px', color: '#fff' }}>{booking.trainings?.title || "Тренировка удалена"}</h4>
                      <p style={{ margin: 0, fontSize: '13px', color: '#8c92b0' }}>📅 {booking.trainings?.date} | ⏰ {booking.trainings?.time} | 👤 {booking.trainings?.trainer}</p>
                    </div>
                    <button onClick={() => handleDeleteBooking(booking.id, booking.training_id)} style={{ background: 'rgba(231, 76, 60, 0.15)', color: '#ff6b6b', border: 'none', padding: '6px 10px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Trash2 size={13} /> Отменить
                    </button>
                  </div>

                  {/* Заявка на перенос */}
                  {booking.reschedule_status === 'pending' && booking.requested_training && (
                    <div style={{ background: 'rgba(241, 196, 15, 0.1)', border: '1px solid rgba(241, 196, 15, 0.3)', padding: '12px', borderRadius: '8px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <div style={{ fontSize: '13px', color: '#f1c40f' }}>
                        🔔 Клиент просит перенести на: <strong>{booking.requested_training.title} ({booking.requested_training.date}, {booking.requested_training.time})</strong>
                      </div>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                          onClick={() => handleApproveReschedule(booking)}
                          style={{ background: '#00b894', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '4px' }}
                        >
                          <Check size={14} /> Одобрить перенос
                        </button>
                        <button
                          onClick={() => handleRejectReschedule(booking.id)}
                          style={{ background: 'rgba(231, 76, 60, 0.2)', color: '#ff6b6b', border: 'none', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '4px' }}
                        >
                          <Ban size={14} /> Отклонить
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Ручной перенос */}
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center', paddingTop: '8px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                    <select
                      value={rescheduleTargets[booking.id] || ""}
                      onChange={(e) => setRescheduleTargets(prev => ({ ...prev, [booking.id]: e.target.value }))}
                      style={{ flex: 1, padding: '8px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', background: '#131629', color: '#fff', fontSize: '13px' }}
                    >
                      <option value="">Перенести вручную на...</option>
                      {allTrainings.map(t => (
                        <option key={t.id} value={t.id}>
                          {t.title} ({t.date}, {t.time}) — мест: {t.available_slots}
                        </option>
                      ))}
                    </select>
                    <button onClick={() => handleReschedule(booking.id, booking.training_id)} style={{ background: '#6c5ce7', color: '#fff', border: 'none', padding: '8px 12px', borderRadius: '8px', cursor: 'pointer', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <RefreshCw size={13} /> Перенести
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div style={{ padding: '16px 20px', borderTop: '1px solid rgba(255,255,255,0.08)', textAlign: 'right' }}>
              <button onClick={() => setSelectedUserEmail(null)} style={{ background: '#6c5ce7', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', fontSize: '14px' }}>
                Закрыть
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}