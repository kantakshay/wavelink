export const APP_ID = "b3cd40a1996a4956b20284b9733320be"
export const TOKEN = null
export const CHANNEL = "wavelink-room"

// Prevents localhost dev sessions from bleeding into production rooms
export const envChannel = (room) =>
  (import.meta.env.DEV ? `dev_${room}` : room)
