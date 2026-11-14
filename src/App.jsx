import { useState, useEffect } from "react"
import { supabase } from "./supabaseClient"
import Sidebar from "./components/Sidebar"
import ScheduleBoard from "./components/ScheduleBoard"
import AdminPanel from "./components/AdminPanel"
import LoginScreen from "./components/LoginScreen"
import Toast from "./components/Toast"

export default function App() {
  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem("runfit_user")
    return savedUser ? JSON.parse(savedUser) : null
  })

  const [activeTab, setActiveTab] = useState(() => {
    const savedUser = localStorage.getItem("runfit_user")
    if (savedUser) {
      const u = JSON.parse(savedUser)
      return u.role === "admin" ? "admin" : "schedule"
    }
    return "schedule"
  })

  const [trainings, setTrainings] = useState([])
  const [userBookings, setUserBookings] = useState([]) 
  const [toast, setToast] = useState(null) 

  const fetchTrainings = async () => {
    try {
      const { data, error } = await supabase.from('trainings').select('*')
      if (error) throw error

      const formatted = (data || []).map(item => ({
        ...item,
        availableSlots: item.available_slots,
        maxSlots: item.max_slots,
      }))
      setTrainings(formatted)
    } catch (err) {
      console.error("Ошибка загрузки расписания:", err.message)
    }
  }

  const fetchUserBookings = async () => {
    if (!user || user.role !== 'client') return
    try {
      const { data, error } = await supabase
        .from('bookings')
        .select('training_id')
        .eq('user_email', user.email)

      if (error) throw error

      setUserBookings((data || []).map(b => b.training_id))
    } catch (err) {
      console.error("Ошибка загрузки бронирований:", err.message)
    }
  }

  useEffect(() => {
    if (user) {
      fetchTrainings()
      fetchUserBookings()
    }
  }, [user])

  const handleLogin = (userData) => {
    setUser(userData)
    localStorage.setItem("runfit_user", JSON.stringify(userData))
    setActiveTab(userData.role === "admin" ? "admin" : "schedule")
    setToast({
      message: `Добро пожаловать, ${userData.name}!`,
      type: "success",
    })
  }

  const handleLogout = () => {
    setUser(null)
    setUserBookings([])
    localStorage.removeItem("runfit_user")
    setToast({
      message: "Вы вышли из системы",
      type: "info",
    })
  }

  const handleBook = async (id) => {
    const training = trainings.find(t => t.id === id)
    if (!training || training.availableSlots <= 0) return

    try {
      const { data: existingBooking, error: checkError } = await supabase
        .from('bookings')
        .select('*')
        .eq('user_email', user.email)
        .eq('training_id', id)
        .maybeSingle()

      if (checkError) throw checkError

      if (existingBooking) {
        setToast({
          message: `Вы уже записаны на тренировку "${training.title}"!`,
          type: "info",
        })
        return
      }

      const originalSlots = training.availableSlots
      const newSlots = originalSlots - 1

      const { error: updateError } = await supabase
        .from('trainings')
        .update({ available_slots: newSlots })
        .eq('id', id)

      if (updateError) throw updateError

      const { data: bookingData, error: bookingError } = await supabase
        .from('bookings')
        .insert([{ user_email: user.email, training_id: id }])
        .select()

      if (bookingError) throw bookingError

      const createdBookingId = bookingData && bookingData[0] ? bookingData[0].id : null

      setTrainings(prev => prev.map(t => t.id === id ? { ...t, availableSlots: newSlots } : t))
      setUserBookings(prev => [...prev, id]) 

      setToast({
        message: `Вы успешно записаны на "${training.title}"!`,
        type: "success",
        actionText: "Отменить",
        onAction: async () => {
          try {
            const { error: restoreError } = await supabase
              .from('trainings')
              .update({ available_slots: originalSlots })
              .eq('id', id)

            if (restoreError) throw restoreError

            if (createdBookingId) {
              const { error: deleteError } = await supabase
                .from('bookings')
                .delete()
                .eq('id', createdBookingId)

              if (deleteError) throw deleteError
            }

            setTrainings(prev => prev.map(t => t.id === id ? { ...t, availableSlots: originalSlots } : t))
            setUserBookings(prev => prev.filter(bId => bId !== id)) 
            setToast({ message: "Запись успешно отменена", type: "error" })
          } catch (cancelErr) {
            console.error("Ошибка отмены бронирования:", cancelErr.message)
            setToast({ message: "Не удалось отменить запись", type: "error" })
          }
        },
      })
    } catch (err) {
      console.error("Ошибка бронирования:", err.message)
      setToast({ message: "Не удалось записаться", type: "error" })
    }
  }

  if (!user) {
    return (
      <>
        <LoginScreen onLogin={handleLogin} />
        {toast && <Toast {...toast} onClose={() => setToast(null)} />}
      </>
    )
  }

  const handleCancelBooking = async (id) => {
    const training = trainings.find(t => t.id === id)
    if (!training) return

    try {
      const originalSlots = training.availableSlots
      const newSlots = originalSlots + 1

      const { error: updateError } = await supabase
        .from('trainings')
        .update({ available_slots: newSlots })
        .eq('id', id)

      if (updateError) throw updateError

      const { error: deleteError } = await supabase
        .from('bookings')
        .delete()
        .eq('user_email', user.email)
        .eq('training_id', id)

      if (deleteError) throw deleteError

      setTrainings(prev => prev.map(t => t.id === id ? { ...t, availableSlots: newSlots } : t))
      setUserBookings(prev => prev.filter(bId => bId !== id))

      setToast({
        message: `Запись на "${training.title}" отменена`,
        type: "info",
      })
    } catch (err) {
      console.error("Ошибка отмены бронирования:", err.message)
      setToast({ message: "Не удалось отменить запись", type: "error" })
    }
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
          <ScheduleBoard 
            trainings={trainings} 
            onBook={handleBook} 
            onCancel={handleCancelBooking} 
            userBookings={userBookings}  
          />
        )}
        {user.role === "admin" && activeTab === "admin" && (
          <AdminPanel trainings={trainings} fetchTrainings={fetchTrainings} />
        )}
      </main>

      {toast && <Toast {...toast} onClose={() => setToast(null)} />}
    </div>
  )
}