const SESSION_KEY = "wl_session"

export function useSession() {
  const save = (name, room, { pin = null, isHost = false } = {}) => {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify({ name, room, pin, isHost }))
  }

  const clear = () => {
    sessionStorage.removeItem(SESSION_KEY)
  }

  const restore = () => {
    try {
      const saved = sessionStorage.getItem(SESSION_KEY)
      if (!saved) return null
      const { name, room, pin = null, isHost = false } = JSON.parse(saved)
      return name && room ? { name, room, pin, isHost } : null
    } catch {
      sessionStorage.removeItem(SESSION_KEY)
      return null
    }
  }

  return { save, clear, restore }
}
