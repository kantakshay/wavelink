import { useCallback, useEffect, useRef, useState } from "react"
import { motion } from "framer-motion"
import AgoraRTC from "agora-rtc-sdk-ng"

import { APP_ID, TOKEN } from "./agora"

const VOLUME_THRESHOLD = 10

export default function App() {
  const clientRef = useRef(null)
  const localTrackRef = useRef(null)
  const localUidRef = useRef(null)
  const pttActiveRef = useRef(false)

  const [joined, setJoined] = useState(false)
  const [talking, setTalking] = useState(false)

  const [name, setName] = useState("")
  const [room, setRoom] = useState("")
  const [users, setUsers] = useState([])
  const [connectedRoom, setConnectedRoom] = useState("")

  const stopTalking = useCallback(async () => {
    try {
      if (!localTrackRef.current) return
      await localTrackRef.current.setEnabled(false)
      setTalking(false)
    } catch (err) {
      console.error(err)
    }
  }, [])

  const startTalking = useCallback(async () => {
    try {
      if (!localTrackRef.current) {
        const micTrack = await AgoraRTC.createMicrophoneAudioTrack()
        localTrackRef.current = micTrack
        await clientRef.current.publish([micTrack])
      }
      await localTrackRef.current.setEnabled(true)
      setTalking(true)
    } catch (err) {
      console.error("Mic Error:", err)
      pttActiveRef.current = false
    }
  }, [])

  const joinRoom = async () => {
    if (!name || !room) return

    try {
      const client = AgoraRTC.createClient({
        mode: "rtc",
        codec: "vp8",
      })

      clientRef.current = client

      client.on("user-published", async (user, mediaType) => {
        await client.subscribe(user, mediaType)
        if (mediaType === "audio") {
          user.audioTrack.play()
        }
      })

      client.on("user-unpublished", (user, mediaType) => {
        if (mediaType === "audio") {
          setUsers((prev) =>
            prev.map((u) =>
              u.uid === user.uid ? { ...u, talking: false } : u
            )
          )
        }
      })

      client.on("user-joined", (user) => {
        setUsers((prev) => {
          if (prev.some((u) => u.uid === user.uid)) return prev
          return [
            ...prev,
            {
              uid: user.uid,
              name: `User ${user.uid}`,
              talking: false,
              isLocal: false,
            },
          ]
        })
      })

      client.on("user-left", (user) => {
        setUsers((prev) => prev.filter((u) => u.uid !== user.uid))
      })

      client.enableAudioVolumeIndicator()
      client.on("volume-indicator", (volumes) => {
        const speaking = new Set()
        for (const { uid, level } of volumes) {
          if (level > VOLUME_THRESHOLD) speaking.add(uid)
        }

        setUsers((prev) =>
          prev.map((u) =>
            u.isLocal
              ? u
              : { ...u, talking: speaking.has(u.uid) }
          )
        )
      })

      const agoraUid = await client.join(APP_ID, room, TOKEN, null)
      localUidRef.current = agoraUid

      const localUser = {
        uid: agoraUid,
        name,
        talking: false,
        isLocal: true,
      }

      const existingRemotes = client.remoteUsers.map((user) => ({
        uid: user.uid,
        name: `User ${user.uid}`,
        talking: false,
        isLocal: false,
      }))

      setUsers([localUser, ...existingRemotes])

      for (const user of client.remoteUsers) {
        if (user.hasAudio) {
          await client.subscribe(user, "audio")
          user.audioTrack?.play()
        }
      }

      setConnectedRoom(room)
      setJoined(true)
    } catch (err) {
      console.error(err)
    }
  }

  const leaveRoom = async () => {
    try {
      pttActiveRef.current = false

      if (localTrackRef.current) {
        localTrackRef.current.close()
        localTrackRef.current = null
      }

      if (clientRef.current) {
        await clientRef.current.leave()
        clientRef.current = null
      }

      localUidRef.current = null
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

  const handlePttPointerDown = (e) => {
    e.preventDefault()
    e.currentTarget.setPointerCapture(e.pointerId)
    if (!pttActiveRef.current) {
      pttActiveRef.current = true
      startTalking()
    }
  }

  const handlePttPointerUp = (e) => {
    e.preventDefault()
    if (pttActiveRef.current) {
      pttActiveRef.current = false
      stopTalking()
    }
    try {
      e.currentTarget.releasePointerCapture(e.pointerId)
    } catch {
      // pointer may already be released
    }
  }

  useEffect(() => {
    if (!joined) return

    const releasePtt = () => {
      if (pttActiveRef.current) {
        pttActiveRef.current = false
        stopTalking()
      }
    }

    window.addEventListener("pointerup", releasePtt)
    window.addEventListener("pointercancel", releasePtt)

    return () => {
      window.removeEventListener("pointerup", releasePtt)
      window.removeEventListener("pointercancel", releasePtt)
    }
  }, [joined, stopTalking])

  useEffect(() => {
    const cleanup = () => {
      try {
        localTrackRef.current?.close()
        clientRef.current?.leave()
      } catch (err) {
        console.error(err)
      }
    }

    window.addEventListener("beforeunload", cleanup)
    return () => {
      cleanup()
      window.removeEventListener("beforeunload", cleanup)
    }
  }, [])

  const isUserSpeaking = (user) =>
    user.isLocal ? talking : user.talking

  if (!joined) {
    return (
      <div className="h-screen bg-black text-white flex items-center justify-center px-6">
        <div className="w-full max-w-sm border border-zinc-900 rounded-[32px] bg-zinc-950/50 backdrop-blur-xl p-8">
          <h1 className="text-3xl font-bold tracking-[0.25em] text-center mb-10">
            WAVELINK
          </h1>

          <div className="space-y-5">
            <input
              type="text"
              placeholder="YOUR NAME"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-black border border-zinc-800 rounded-2xl px-5 py-4 outline-none text-sm tracking-[0.15em] focus:border-green-400 transition-all"
            />

            <input
              type="text"
              placeholder="ROOM NAME"
              value={room}
              onChange={(e) => setRoom(e.target.value)}
              className="w-full bg-black border border-zinc-800 rounded-2xl px-5 py-4 outline-none text-sm tracking-[0.15em] focus:border-green-400 transition-all"
            />

            <button
              onClick={joinRoom}
              className="w-full py-4 rounded-2xl bg-green-400 text-black font-bold tracking-[0.2em] mt-4 hover:scale-[1.02] active:scale-[0.98] transition-all"
            >
              JOIN ROOM
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen bg-black text-white flex flex-col overflow-hidden select-none">
      {/* HEADER */}
      <div className="px-4 md:px-8 py-4 md:py-6 flex items-center justify-between shrink-0">
        <h1 className="text-lg md:text-2xl font-bold tracking-[0.25em]">
          WAVELINK
        </h1>

        <button
          onClick={leaveRoom}
          className="px-4 py-2 rounded-full border border-red-500/20 text-red-400 text-[10px] md:text-xs tracking-[0.2em] hover:bg-red-500/10 transition-all"
        >
          LEAVE
        </button>
      </div>

      {/* USER PANEL + ROOM STATS */}
      <div className="flex-1 flex flex-col px-4 md:px-8 min-h-0">
        <div className="shrink-0 mb-4 space-y-1">
          <p className="text-[10px] md:text-xs tracking-[0.3em] text-zinc-400">
            ROOM: {connectedRoom.toUpperCase()}
          </p>
          <p className="text-[10px] md:text-xs tracking-[0.3em] text-green-400/80">
            {users.length} CONNECTED
          </p>
        </div>

        <div className="flex-1 overflow-y-auto min-h-0 -mx-1 px-1">
          <ul className="space-y-1">
            {users.map((user) => {
              const speaking = isUserSpeaking(user)
              const initial = user.name.charAt(0).toUpperCase()

              return (
                <motion.li
                  key={user.uid}
                  layout
                  className={`
                    flex items-center gap-3
                    px-4 py-3 md:py-3.5
                    rounded-2xl
                    border
                    transition-all duration-200
                    ${speaking
                      ? "border-green-400/50 bg-green-400/5 speaker-glow"
                      : "border-zinc-900 bg-zinc-950/50"
                    }
                  `}
                >
                  <span
                    className={`
                      shrink-0 w-9 h-9 md:w-10 md:h-10
                      rounded-xl
                      flex items-center justify-center
                      text-xs md:text-sm font-bold
                      border
                      ${speaking
                        ? "border-green-400/40 text-green-400 bg-green-400/10"
                        : "border-zinc-800 text-zinc-400 bg-zinc-900"
                      }
                    `}
                  >
                    [{initial}]
                  </span>

                  <span
                    className={`
                      flex-1 text-sm md:text-base truncate
                      ${speaking ? "text-green-100" : "text-zinc-300"}
                    `}
                  >
                    {user.name}
                    {user.isLocal && (
                      <span className="text-zinc-600 text-xs ml-2">(you)</span>
                    )}
                  </span>

                  {speaking && (
                    <span className="shrink-0 text-base" aria-label="Speaking">
                      🔊
                    </span>
                  )}
                </motion.li>
              )
            })}
          </ul>
        </div>
      </div>

      {/* PTT BUTTON */}
      <div className="py-4 md:py-5 flex justify-center bg-black/80 backdrop-blur-xl shrink-0 touch-none">
        <motion.button
          whileTap={{ scale: 0.95 }}
          onPointerDown={handlePttPointerDown}
          onPointerUp={handlePttPointerUp}
          onPointerCancel={handlePttPointerUp}
          onContextMenu={(e) => e.preventDefault()}
          className={`
            relative
            w-36 h-36 md:w-48 md:h-48
            rounded-full
            border
            bg-zinc-950
            overflow-hidden
            flex items-center justify-center
            transition-all duration-200
            ${talking
              ? "border-green-400/60 shadow-[0_0_60px_rgba(0,255,153,0.35)]"
              : "border-green-400/20 shadow-[0_0_60px_rgba(0,255,153,0.12)]"
            }
          `}
        >
          <div className="absolute w-24 h-24 md:w-28 md:h-28 rounded-full bg-green-400/10 blur-3xl" />

          <div
            className={`
              absolute inset-3 rounded-full border
              ${talking
                ? "border-green-400/40 animate-pulse"
                : "border-green-400/20"
              }
            `}
          />

          <div className="relative z-10 text-center">
            <div className="text-3xl md:text-4xl mb-2 md:mb-3">🎙</div>
            <p className="text-green-400 text-[10px] md:text-xs tracking-[0.35em] font-semibold">
              {talking ? "TRANSMITTING" : "HOLD TO TALK"}
            </p>
          </div>
        </motion.button>
      </div>
    </div>
  )
}
