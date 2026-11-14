import { useState, useEffect } from "react"
import { supabase } from "./supabaseClient"
import Sidebar from "./components/Sidebar"
import ScheduleBoard from "./components/ScheduleBoard"
import AdminPanel from "./components/AdminPanel"
import LoginScreen from "./components/LoginScreen"
import Toast from "./components/Toast"

export default function App() {
  // Восстанавливаем сессию пользователя из localStorage при перезагрузке страницы
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
  const [toast, setToast] = useState(null) 

  // Функция загрузки тренировок из таблицы trainings в Supabase
  const fetchTrainings = async () => {
    try {
      const { data, error } = await supabase.from('trainings').select('*')
      if (error) throw error

      // Приводим поля к удобному для интерфейса виду (snake_case -> camelCase)
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

  // Загружаем тренировки при входе пользователя
  useEffect(() => {
    if (user) {
      fetchTrainings()
    }
  }, [user])

  const handleLogin = (userData) => {
    setUser(userData)
    // Сохраняем сессию в localStorage
    localStorage.setItem("runfit_user", JSON.stringify(userData))
    setActiveTab(userData.role === "admin" ? "admin" : "schedule")
    setToast({
      message: `Добро пожаловать, ${userData.name}!`,
      type: "success",
    })
  }

  const handleLogout = () => {
    setUser(null)
    localStorage.removeItem("runfit_user")
    setToast({
      message: "Вы вышли из системы",
      type: "info",
    })
  }

  // Обработчик бронирования с защитой от повторных записей и синхронизацией в Supabase
  const handleBook = async (id) => {
    const training = trainings.find(t => t.id === id)
    if (!training || training.availableSlots <= 0) return

    try {
      // 1. Проверяем, записывался ли этот пользователь на данную тренировку ранее
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

      // 2. Уменьшаем количество доступных мест в таблице trainings
      const { error: updateError } = await supabase
        .from('trainings')
        .update({ available_slots: newSlots })
        .eq('id', id)

      if (updateError) throw updateError

      // 3. Создаем запись в таблице bookings
      const { data: bookingData, error: bookingError } = await supabase
        .from('bookings')
        .insert([{ user_email: user.email, training_id: id }])
        .select()

      if (bookingError) throw bookingError

      const createdBookingId = bookingData && bookingData[0] ? bookingData[0].id : null

      // Мгновенное обновление локального стейта
      setTrainings(prev => prev.map(t => t.id === id ? { ...t, availableSlots: newSlots } : t))

      // 4. Тост с кнопкой отмены
      setToast({
        message: `Вы успешно записаны на "${training.title}"!`,
        type: "success",
        actionText: "Отменить",
        onAction: async () => {
          try {
            // Возвращаем места обратно в таблицу trainings
            const { error: restoreError } = await supabase
              .from('trainings')
              .update({ available_slots: originalSlots })
              .eq('id', id)

            if (restoreError) throw restoreError

            // Удаляем бронирование из таблицы bookings
            if (createdBookingId) {
              const { error: deleteError } = await supabase
                .from('bookings')
                .delete()
                .eq('id', createdBookingId)

              if (deleteError) throw deleteError
            }

            setTrainings(prev => prev.map(t => t.id === id ? { ...t, availableSlots: originalSlots } : t))
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

  // Если пользователь не вошел, показываем экран входа/регистрации
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
          <AdminPanel trainings={trainings} fetchTrainings={fetchTrainings} />
        )}
      </main>

      {toast && <Toast {...toast} onClose={() => setToast(null)} />}
    </div>
  )
}