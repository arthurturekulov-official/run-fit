import { useState } from "react"
import { ShieldCheck, User, LogIn } from "lucide-react"
import "../styles/LoginScreen.css"

export default function LoginScreen({ onLogin }) {
  const [role, setRole] = useState("client") 
  const [name, setName] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")

  const handleSubmit = (e) => {
    e.preventDefault()
    setError("")

    if (role === "admin") {
      if (password !== "admin") {
        setError("Неверный пароль администратора (подсказка: admin)")
        return
      }
      onLogin({
        name: name.trim() || "Администратор",
        role: "admin",
        email: "admin@sportcenter.kz",
      })
    } else {
      onLogin({
        name: name.trim() || "Артур Турекулов",
        role: "client",
        email: "client@sportcenter.kz",
      })
    }
  }

  const handleGoogleLogin = () => {
    onLogin({
      name: "Артур Турекулов",
      role: "client",
      email: "arthur.turekulov@gmail.com",
      isGoogle: true,
    })
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
            className={`role-btn ${role === "client" ? "active" : ""}`}
            onClick={() => {
              setRole("client")
              setError("")
            }}
          >
            <User size={16} /> Клиент
          </button>
          <button
            type="button"
            className={`role-btn ${role === "admin" ? "active" : ""}`}
            onClick={() => {
              setRole("admin")
              setError("")
            }}
          >
            <ShieldCheck size={16} /> Администратор
          </button>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          <div className="input-group">
            <label>{role === "client" ? "Ваше имя" : "Имя сотрудника"}</label>
            <input
              type="text"
              placeholder={role === "client" ? "Например: Артур" : "Администратор"}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          {role === "admin" && (
            <div className="input-group">
              <label>Пароль доступа</label>
              <input
                type="password"
                placeholder="Введите пароль (admin)"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          )}

          {error && <p className="login-error">{error}</p>}

          <button type="submit" className="submit-login-btn">
            <LogIn size={18} />
            {role === "client" ? "Войти в личный кабинет" : "Войти в панель управления"}
          </button>
        </form>

        {role === "client" && (
          <>
            <div className="divider">
              <span>или</span>
            </div>

            <button
              type="button"
              onClick={handleGoogleLogin}
              className="google-btn"
            >
              <svg width="18" height="18" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17Z"
                />
                <path
                  fill="#34A853"
                  d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.11-6.72-4.96H1.29v3.14C3.26 21.3 7.31 24 12 24Z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.28 14.24c-.24-.72-.38-1.49-.38-2.24s.14-1.52.38-2.24V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.99-3.14Z"
                />
                <path
                  fill="#EA4335"
                  d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.99 3.14c.95-2.85 3.6-4.96 6.72-4.96Z"
                />
              </svg>
              Продолжить с Google
            </button>
          </>
        )}
      </div>
    </div>
  )
}