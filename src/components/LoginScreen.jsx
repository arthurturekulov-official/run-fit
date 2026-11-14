import { useState } from "react"
import { LogIn, UserPlus } from "lucide-react"
import { supabase } from "../supabaseClient"
import "../styles/LoginScreen.css"

export default function LoginScreen({ onLogin }) {
  const [isRegisterMode, setIsRegisterMode] = useState(false) 
  
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")

  const [fieldErrors, setFieldErrors] = useState({
    name: "",
    email: "",
    password: ""
  })
  
  const [generalError, setGeneralError] = useState("")

  const validateForm = () => {
    let isValid = true
    const errors = { name: "", email: "", password: "" }

    const cleanName = name.trim()
    const cleanEmail = email.trim()
    const cleanPassword = password.trim()

    if (isRegisterMode) {
      if (!cleanName) {
        errors.name = "Введите ваше имя"
        isValid = false
      } else if (cleanName.length < 4) {
        errors.name = "Имя должно содержать не менее 4 символов"
        isValid = false
      }
    }

    if (!cleanEmail) {
      errors.email = "Введите email"
      isValid = false
    } else if (!cleanEmail.includes("@") || !cleanEmail.includes(".")) {
      errors.email = "Введите корректный email адрес"
      isValid = false
    }

    if (!cleanPassword) {
      errors.password = "Введите пароль"
      isValid = false
    } else if (cleanPassword.length < 6) {
      errors.password = "Пароль должен содержать не менее 6 символов"
      isValid = false
    }

    setFieldErrors(errors)
    return isValid
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setGeneralError("")

    if (!validateForm()) return

    const trimmedName = name.trim()
    const trimmedEmail = email.trim().toLowerCase()
    const trimmedPassword = password.trim() 

    try {
      if (isRegisterMode) {
        const { data: existingUser, error: checkError } = await supabase
          .from('profiles')
          .select('*')
          .eq('email', trimmedEmail)
          .maybeSingle()

        if (checkError) throw checkError

        if (existingUser) {
          setFieldErrors(prev => ({
            ...prev,
            email: "Пользователь с таким email уже зарегистрирован в системе"
          }))
          return
        }

        const role = trimmedEmail === "admin@sportcenter.kz" ? "admin" : "client"

        const { error: insertError } = await supabase
          .from('profiles')
          .insert([{ 
            name: trimmedName, 
            email: trimmedEmail, 
            password: trimmedPassword, 
            role: role 
          }])

        if (insertError) throw insertError

        onLogin({ name: trimmedName, email: trimmedEmail, role })

      } else {
        if (trimmedEmail === "admin@sportcenter.kz" && trimmedPassword === "admin123") {
          onLogin({ name: "Администратор", email: trimmedEmail, role: "admin" })
          return
        }

        const { data: userProfile, error: fetchError } = await supabase
          .from('profiles')
          .select('*')
          .eq('email', trimmedEmail)
          .maybeSingle()

        if (fetchError) throw fetchError

        if (!userProfile) {
          setFieldErrors(prev => ({
            ...prev,
            email: "Пользователь с таким email не найден. Зарегистрируйтесь."
          }))
          return
        }

        if (userProfile.password !== trimmedPassword) {
          setFieldErrors(prev => ({
            ...prev,
            password: "Неверный пароль"
          }))
          return
        }

        onLogin({
          name: userProfile.name,
          email: userProfile.email,
          role: userProfile.role || "client"
        })
      }
    } catch (err) {
      console.error("Ошибка авторизации:", err.message)
      setGeneralError("Ошибка соединения с базой данных Supabase.")
    }
  }

  return (
    <div className="login-wrapper">
      <div className="login-card">
        <div className="login-header">
          <div className="login-logo">🏋️‍♂️</div>
          <h1>Run Fit</h1>
          <p>Система онлайн-записи и управления центром</p>
        </div>

        <div className="role-switcher">
          <button
            type="button"
            className={`role-btn ${!isRegisterMode ? "active" : ""}`}
            onClick={() => {
              setIsRegisterMode(false)
              setFieldErrors({ name: "", email: "", password: "" })
              setGeneralError("")
            }}
          >
            <LogIn size={16} /> Вход
          </button>
          <button
            type="button"
            className={`role-btn ${isRegisterMode ? "active" : ""}`}
            onClick={() => {
              setIsRegisterMode(true)
              setFieldErrors({ name: "", email: "", password: "" })
              setGeneralError("")
            }}
          >
            <UserPlus size={16} /> Регистрация
          </button>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          {isRegisterMode && (
            <div className="input-group">
              <label>Ваше имя (мин. 4 символа)</label>
              <input
                type="text"
                placeholder="Например: Артур"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
              {fieldErrors.name && <span className="field-error" style={{ color: "#ff4d4f", fontSize: "12px", marginTop: "4px", display: "block" }}>{fieldErrors.name}</span>}
            </div>
          )}

          <div className="input-group">
            <label>Email адрес</label>
            <input
              type="email"
              placeholder="example@mail.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            {fieldErrors.email && <span className="field-error" style={{ color: "#ff4d4f", fontSize: "12px", marginTop: "4px", display: "block" }}>{fieldErrors.email}</span>}
          </div>

          <div className="input-group">
            <label>Пароль (мин. 6 символов)</label>
            <input
              type="password"
              placeholder="Введите пароль"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            {fieldErrors.password && <span className="field-error" style={{ color: "#ff4d4f", fontSize: "12px", marginTop: "4px", display: "block" }}>{fieldErrors.password}</span>}
          </div>

          {generalError && <p className="login-error" style={{ color: "#ff4d4f", textAlign: "center", margin: "10px 0" }}>{generalError}</p>}

          <button type="submit" className="submit-login-btn">
            {isRegisterMode ? <UserPlus size={18} /> : <LogIn size={18} />}
            {isRegisterMode ? "Зарегистрироваться" : "Войти в систему"}
          </button>
        </form>
      </div>
    </div>
  )
}