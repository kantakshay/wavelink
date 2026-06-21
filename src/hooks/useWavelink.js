import { useEffect, useRef, useState } from "react"
import { useAgoraRtc } from "./useAgoraRtc"
import { useAgoraRtm } from "./useAgoraRtm"
import { useSession } from "./useSession"
import { trackEvent } from "../lib/analytics"

export function useWavelink() {
  // ── Refs ───────────────────────────────────────────────────────────────────
  const pttActiveRef        = useRef(false)
  const joinedAtRef         = useRef(null)
  const nameCacheRef        = useRef({})
  const sessionRestoredRef  = useRef(false)
  const approvalTimeoutRef  = useRef(null)
  const requestTimersRef    = useRef({}) // { [rtmUid]: timeoutId } — per-request 60s auto-expire

  // ── Core state ─────────────────────────────────────────────────────────────
  const [joined, setJoined]               = useState(false)
  const [talking, setTalking]             = useState(false)
  const [name, setName]                   = useState("")
  const [room, setRoom]                   = useState("")
  const [users, setUsers]                 = useState([])
  const [connectedRoom, setConnectedRoom] = useState("")

  // ── Security state ─────────────────────────────────────────────────────────
  const [pin, setPin]                 = useState("")
  const [isHost, setIsHost]           = useState(false)
  const [pendingRequests, setPending] = useState([])
  const [joinPhase, setJoinPhase]     = useState("idle") // "idle"|"waiting"|"denied"
  const [denyReason, setDenyReason]   = useState(null)   // "wrong_pin"|"rejected"|"timeout"

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
      trackEvent("ptt_start", "voice", { label: connectedRoom })
    }
  }

  const handlePttPointerUp = (e) => {
    e.preventDefault()
    if (pttActiveRef.current) {
      pttActiveRef.current = false
      rtc.stopTalking()
      trackEvent("ptt_stop", "voice", { label: connectedRoom })
    }
    try {
      e.currentTarget.releasePointerCapture(e.pointerId)
    } catch { /* pointer may already be released */ }
  }

  // ── Join room ──────────────────────────────────────────────────────────────
  const joinRoom = async (nameArg = name, roomArg = room, isHostArg = isHost, pinArg = pin) => {
    if (!nameArg || !roomArg) return

    if (isHostArg) {
      // ── Host: full RTC + RTM connect ────────────────────────────────────────
      try {
        const agoraUid = await rtc.connect(nameArg, roomArg, { setUsers, nameCacheRef })

        try {
          await rtm.connect(agoraUid, nameArg, roomArg, {
            setUsers,
            nameCacheRef,
            onJoinRequest: ({ name: requesterName, rtmUid, pin: enteredPin }) => {
              if (enteredPin !== pinArg) {
                rtm.replyToPeer(rtmUid, { type: "join_denied", reason: "wrong_pin" })
                return
              }
              setPending((prev) => {
                if (prev.some((r) => r.rtmUid === rtmUid)) return prev
                return [...prev, { name: requesterName, rtmUid }]
              })
              // Auto-remove request and notify invitee after 60s if host ignores it
              requestTimersRef.current[rtmUid] = setTimeout(() => {
                rtm.replyToPeer(rtmUid, { type: "join_denied", reason: "timeout" })
                setPending((prev) => prev.filter((r) => r.rtmUid !== rtmUid))
                delete requestTimersRef.current[rtmUid]
              }, 60_000)
            },
          })
        } catch (err) {
          console.error("RTM presence unavailable:", err)
        }

        session.save(nameArg, roomArg, { pin: pinArg, isHost: true })
        setConnectedRoom(roomArg)
        joinedAtRef.current = Date.now()
        setJoined(true)
        history.replaceState(null, "", "?room=" + roomArg)
        trackEvent("join_room", "engagement", { label: roomArg })
      } catch (err) {
        console.error(err)
        trackEvent("join_failure", "error", { label: err?.message ?? "unknown" })
      }
    } else if (pinArg && !isHostArg && !new URLSearchParams(window.location.search).get("room")) {
      // ── User typed room name → has auto-PIN → join as host ───────────────────
      setIsHost(true)
      return joinRoom(nameArg, roomArg, true, pinArg)

    } else if (!pinArg) {
      // ── Direct join: no PIN (edge case fallback) ──────────────────────────────
      try {
        const agoraUid = await rtc.connect(nameArg, roomArg, { setUsers, nameCacheRef })
        try {
          await rtm.connect(agoraUid, nameArg, roomArg, { setUsers, nameCacheRef, onJoinRequest: null })
        } catch (err) {
          console.error("RTM presence unavailable:", err)
        }
        session.save(nameArg, roomArg, {})
        setConnectedRoom(roomArg)
        joinedAtRef.current = Date.now()
        setJoined(true)
        history.replaceState(null, "", "?room=" + roomArg)
        trackEvent("join_room", "engagement", { label: roomArg })
      } catch (err) {
        console.error(err)
        trackEvent("join_failure", "error", { label: err?.message ?? "unknown" })
      }
    } else {
      // ── Invitee: RTM lobby only, wait for host approval ─────────────────────
      try {
        const lobbyUid = String(Date.now())

        await rtm.connectLobby(lobbyUid, nameArg, roomArg, {
          onJoinResponse: async (msg) => {
            clearTimeout(approvalTimeoutRef.current)

            if (msg.type === "join_approved") {
              try {
                await rtm.disconnect()
                const agoraUid = await rtc.connect(nameArg, roomArg, { setUsers, nameCacheRef })
                try {
                  await rtm.connect(agoraUid, nameArg, roomArg, {
                    setUsers, nameCacheRef, onJoinRequest: null,
                  })
                } catch (err) {
                  console.error("RTM reconnect:", err)
                }
                session.save(nameArg, roomArg, {})
                setConnectedRoom(roomArg)
                joinedAtRef.current = Date.now()
                setJoined(true)
                setJoinPhase("idle")
                history.replaceState(null, "", "?room=" + roomArg)
                trackEvent("join_room", "engagement", { label: roomArg })
              } catch (err) {
                console.error(err)
                setJoinPhase("denied")
                setDenyReason("rejected")
              }
            } else {
              setJoinPhase("denied")
              setDenyReason(msg.reason ?? "rejected")
              rtm.disconnect()
            }
          },
        })

        rtm.sendJoinRequest(nameArg, lobbyUid, pinArg)
        setJoinPhase("waiting")

        approvalTimeoutRef.current = setTimeout(async () => {
          setJoinPhase("denied")
          setDenyReason("timeout")
          await rtm.disconnect()
        }, 60_000)
      } catch (err) {
        console.error(err)
        setJoinPhase("idle")
      }
    }
  }

  // ── Leave room ─────────────────────────────────────────────────────────────
  const leaveRoom = async () => {
    try {
      clearTimeout(approvalTimeoutRef.current)
      for (const id of Object.values(requestTimersRef.current)) clearTimeout(id)
      requestTimersRef.current = {}

      const sessionSecs = joinedAtRef.current
        ? Math.round((Date.now() - joinedAtRef.current) / 1000)
        : 0

      for (const req of pendingRequests) {
        rtm.replyToPeer(req.rtmUid, { type: "join_denied", reason: "host_left" })
      }

      pttActiveRef.current = false
      await rtc.disconnect()
      await rtm.disconnect()
      session.clear()
      nameCacheRef.current = {}
      joinedAtRef.current = null

      trackEvent("leave_room", "engagement", { label: connectedRoom, value: sessionSecs })

      setTalking(false)
      setJoined(false)
      setUsers([])
      setRoom("")
      setName("")
      setPin("")
      setIsHost(false)
      setPending([])
      setConnectedRoom("")
      history.replaceState(null, "", "/")
    } catch (err) {
      console.error(err)
    }
  }

  // ── Create room (generates random room ID + PIN, marks as host) ─────────────
  const createRoom = () => {
    setRoom(Math.random().toString(36).slice(2, 8))
    setPin(Math.floor(1000 + Math.random() * 9000).toString())
    setIsHost(true)
  }

  // ── Manual room typing: generate PIN so the typer is always the host ─────────
  const handleManualRoomChange = (val) => {
    setRoom(val)
    const isInvitee = !!new URLSearchParams(window.location.search).get("room")
    if (!isInvitee) {
      if (val && !pin) setPin(Math.floor(1000 + Math.random() * 9000).toString())
      if (!val)        setPin("")
    }
  }

  // ── Host: approve a pending request ───────────────────────────────────────
  const approveRequest = (rtmUid) => {
    clearTimeout(requestTimersRef.current[rtmUid])
    delete requestTimersRef.current[rtmUid]
    rtm.replyToPeer(rtmUid, { type: "join_approved" })
    setPending((prev) => prev.filter((r) => r.rtmUid !== rtmUid))
  }

  // ── Host: deny a pending request ──────────────────────────────────────────
  const denyRequest = (rtmUid) => {
    clearTimeout(requestTimersRef.current[rtmUid])
    delete requestTimersRef.current[rtmUid]
    rtm.replyToPeer(rtmUid, { type: "join_denied", reason: "rejected" })
    setPending((prev) => prev.filter((r) => r.rtmUid !== rtmUid))
  }

  // ── Invitee: go back to join screen after denial ──────────────────────────
  const resetJoin = () => {
    clearTimeout(approvalTimeoutRef.current)
    rtm.disconnect()
    setJoinPhase("idle")
    setDenyReason(null)
    setPin("")
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

  // Clean up on tab close — NOT on StrictMode remount
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

  // Restore host session; pre-fill room for invitees
  useEffect(() => {
    if (sessionRestoredRef.current) return
    sessionRestoredRef.current = true
    const saved = session.restore()
    if (saved) {
      setName(saved.name)
      setRoom(saved.room)
      if (saved.isHost && saved.pin) {
        setPin(saved.pin)
        setIsHost(true)
        joinRoom(saved.name, saved.room, true, saved.pin)
      }
      return
    }
    const urlRoom = new URLSearchParams(window.location.search).get("room")
    if (urlRoom) setRoom(urlRoom)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Helpers ────────────────────────────────────────────────────────────────
  const isUserSpeaking = (user) => (user.isLocal ? talking : user.talking)

  return {
    name, setName,
    room, setRoom,
    pin, setPin,
    isHost,
    joined, talking,
    users, connectedRoom,
    pendingRequests,
    joinPhase, denyReason,
    joinRoom, leaveRoom,
    createRoom, handleManualRoomChange, resetJoin,
    approveRequest, denyRequest,
    handlePttPointerDown, handlePttPointerUp,
    isUserSpeaking,
  }
}
