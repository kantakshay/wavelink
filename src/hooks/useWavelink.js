import { useEffect, useRef, useState } from "react"
import { useAgoraRtc } from "./useAgoraRtc"
import { useAgoraRtm } from "./useAgoraRtm"
import { useSession } from "./useSession"

export function useWavelink() {
  // ── PTT ref ────────────────────────────────────────────────────────────────
  const pttActiveRef = useRef(false)

  // ── Name cache ref (bridges RTM ↔ RTC race) ───────────────────────────────
  const nameCacheRef = useRef({})

  // ── Session guard ref ──────────────────────────────────────────────────────
  const sessionRestoredRef = useRef(false)

  // ── State ──────────────────────────────────────────────────────────────────
  const [joined, setJoined]               = useState(false)
  const [talking, setTalking]             = useState(false)
  const [name, setName]                   = useState("")
  const [room, setRoom]                   = useState("")
  const [users, setUsers]                 = useState([])
  const [connectedRoom, setConnectedRoom] = useState("")

  // ── Sub-hooks ──────────────────────────────────────────────────────────────
  const rtc     = useAgoraRtc(pttActiveRef, setTalking)
  const rtm     = useAgoraRtm()
  const session = useSession()

  // ── PTT handlers ───────────────────────────────────────────────────────────
  const handlePttPointerDown = (e) => {
    e.preventDefault()
    e.currentTarget.setPointerCapture(e.pointerId)
    if (!pttActiveRef.current) {
      pttActiveRef.current = true
      rtc.startTalking()
    }
  }

  const handlePttPointerUp = (e) => {
    e.preventDefault()
    if (pttActiveRef.current) {
      pttActiveRef.current = false
      rtc.stopTalking()
    }
    try {
      e.currentTarget.releasePointerCapture(e.pointerId)
    } catch {
      // pointer may already be released
    }
  }

  // ── Join room ──────────────────────────────────────────────────────────────
  const joinRoom = async (nameArg = name, roomArg = room) => {
    if (!nameArg || !roomArg) return

    try {
      const agoraUid = await rtc.connect(nameArg, roomArg, { setUsers, nameCacheRef })

      // RTM presence — isolated so failure never blocks voice
      try {
        await rtm.connect(agoraUid, nameArg, roomArg, { setUsers, nameCacheRef })
      } catch (err) {
        console.error("RTM presence unavailable:", err)
      }

      session.save(nameArg, roomArg)
      setConnectedRoom(roomArg)
      setJoined(true)
    } catch (err) {
      console.error(err)
    }
  }

  // ── Leave room ─────────────────────────────────────────────────────────────
  const leaveRoom = async () => {
    try {
      pttActiveRef.current = false
      await rtc.disconnect()
      await rtm.disconnect()
      session.clear()
      nameCacheRef.current = {}

      setTalking(false)
      setJoined(false)
      setUsers([])
      setRoom("")
      setName("")
      setConnectedRoom("")
    } catch (err) {
      console.error(err)
    }
  }

  // ── Effects ────────────────────────────────────────────────────────────────

  // Release PTT if pointer lifts outside the button
  useEffect(() => {
    if (!joined) return
    const releasePtt = () => {
      if (pttActiveRef.current) {
        pttActiveRef.current = false
        rtc.stopTalking()
      }
    }
    window.addEventListener("pointerup", releasePtt)
    window.addEventListener("pointercancel", releasePtt)
    return () => {
      window.removeEventListener("pointerup", releasePtt)
      window.removeEventListener("pointercancel", releasePtt)
    }
  }, [joined, rtc.stopTalking])

  // Clean up on tab close — only fires on actual unload, NOT on StrictMode remount
  useEffect(() => {
    const handleBeforeUnload = () => {
      try {
        rtc.localTrackRef.current?.close()
        rtc.clientRef.current?.leave()
        rtm.rtmChannelRef.current?.leave()
        rtm.rtmClientRef.current?.logout()
        rtc.rawStreamRef.current?.getTracks().forEach((t) => t.stop())
        rtc.audioContextRef.current?.close()
      } catch (err) {
        console.error(err)
      }
    }
    window.addEventListener("beforeunload", handleBeforeUnload)
    return () => window.removeEventListener("beforeunload", handleBeforeUnload)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Restore session on page refresh
  useEffect(() => {
    if (sessionRestoredRef.current) return
    sessionRestoredRef.current = true
    const saved = session.restore()
    if (saved) {
      setName(saved.name)
      setRoom(saved.room)
      joinRoom(saved.name, saved.room)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Helpers ────────────────────────────────────────────────────────────────
  const isUserSpeaking = (user) => (user.isLocal ? talking : user.talking)

  return {
    name, setName,
    room, setRoom,
    joined, talking,
    users, connectedRoom,
    joinRoom, leaveRoom,
    handlePttPointerDown, handlePttPointerUp,
    isUserSpeaking,
  }
}
