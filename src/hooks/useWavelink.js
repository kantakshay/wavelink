import { useCallback, useEffect, useRef, useState } from "react"
import AgoraRTC from "agora-rtc-sdk-ng"
import AgoraRTM from "agora-rtm-sdk"
import { APP_ID, TOKEN, envChannel } from "../agora"

const VOLUME_THRESHOLD = 10

export function useWavelink() {
  // ── Refs ──────────────────────────────────────────────────────────────────
  const clientRef = useRef(null)
  const localTrackRef = useRef(null)
  const localUidRef = useRef(null)
  const pttActiveRef = useRef(false)
  const rtmClientRef = useRef(null)
  const rtmChannelRef = useRef(null)
  const nameCacheRef = useRef({})
  const audioContextRef = useRef(null)
  const rawStreamRef = useRef(null)
  const sessionRestoredRef = useRef(false)

  // ── State ─────────────────────────────────────────────────────────────────
  const [joined, setJoined] = useState(false)
  const [talking, setTalking] = useState(false)
  const [name, setName] = useState("")
  const [room, setRoom] = useState("")
  const [users, setUsers] = useState([])
  const [connectedRoom, setConnectedRoom] = useState("")

  // ── PTT audio ─────────────────────────────────────────────────────────────
  const stopTalking = useCallback(async () => {
    try {
      if (!localTrackRef.current) return
      await localTrackRef.current.setEnabled(false)
      // Restore receive audio (half-duplex: listen again after transmit)
      clientRef.current?.remoteUsers.forEach(u => u.audioTrack?.setVolume(200))
      setTalking(false)
    } catch (err) {
      console.error(err)
    }
  }, [])

  const startTalking = useCallback(async () => {
    try {
      // Mute receive while transmitting — true half-duplex, eliminates echo loop
      clientRef.current?.remoteUsers.forEach(u => u.audioTrack?.setVolume(0))

      if (!localTrackRef.current) {
        const rawStream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: false, // browser ANS off — custom compressor chain handles dynamics
            autoGainControl: true,
            sampleRate: { ideal: 48000 },
            channelCount: { ideal: 1 },
          },
        })

        const ctx = new AudioContext({ sampleRate: 48000 })

        const hpf = ctx.createBiquadFilter()
        hpf.type = "highpass"
        hpf.frequency.value = 80

        const presence = ctx.createBiquadFilter()
        presence.type = "peaking"
        presence.frequency.value = 3000
        presence.gain.value = 6
        presence.Q.value = 1.0

        const comp = ctx.createDynamicsCompressor()
        comp.threshold.value = -24
        comp.knee.value = 30
        comp.ratio.value = 4
        comp.attack.value = 0.005
        comp.release.value = 0.15

        const makeup = ctx.createGain()
        makeup.gain.value = 2.5

        const dst = ctx.createMediaStreamDestination()
        ctx.createMediaStreamSource(rawStream)
          .connect(hpf)
          .connect(presence)
          .connect(comp)
          .connect(makeup)
          .connect(dst)

        audioContextRef.current = ctx
        rawStreamRef.current = rawStream

        const processedTrack = await AgoraRTC.createCustomAudioTrack({
          mediaStreamTrack: dst.stream.getAudioTracks()[0],
          encoderConfig: { sampleRate: 48000, stereo: false, bitrate: 128 },
        })

        localTrackRef.current = processedTrack
        await clientRef.current.publish([processedTrack])
      }

      await localTrackRef.current.setEnabled(true)
      setTalking(true)
    } catch (err) {
      console.error("Mic Error:", err)
      pttActiveRef.current = false
    }
  }, [])

  // ── PTT pointer handlers ──────────────────────────────────────────────────
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

  // ── Room join / leave ─────────────────────────────────────────────────────
  const joinRoom = async (nameArg = name, roomArg = room) => {
    if (!nameArg || !roomArg) return

    try {
      // Unlock audio on next interaction if browser blocks autoplay
      AgoraRTC.onAutoplayFailed = () => {
        console.warn("[WL] Autoplay blocked — click anywhere to unlock audio")
        const unlock = () => {
          document.removeEventListener("pointerdown", unlock)
        }
        document.addEventListener("pointerdown", unlock)
      }

      const client = AgoraRTC.createClient({ mode: "rtc", codec: "vp8" })
      clientRef.current = client

      client.on("user-published", async (user, mediaType) => {
        try {
          await client.subscribe(user, mediaType)
          if (mediaType === "audio") {
            user.audioTrack.setVolume(200)
            user.audioTrack.play()
          }
        } catch (err) {
          console.error("[WL] Subscribe/play error:", err)
        }
      })

      client.on("user-unpublished", (user, mediaType) => {
        if (mediaType === "audio") {
          setUsers((prev) =>
            prev.map((u) => (u.uid === user.uid ? { ...u, talking: false } : u))
          )
        }
      })

      client.on("user-joined", (user) => {
        const cachedName = nameCacheRef.current[String(user.uid)]
        setUsers((prev) => {
          if (prev.some((u) => u.uid === user.uid)) return prev
          return [
            ...prev,
            { uid: user.uid, name: cachedName || `User ${user.uid}`, talking: false, isLocal: false },
          ]
        })
      })

      client.on("user-left", (user) => {
        setUsers((prev) => prev.filter((u) => u.uid !== user.uid))
      })

      client.enableAudioVolumeIndicator()
      client.on("volume-indicator", (volumes) => {
        const speaking = new Set(
          volumes.filter((v) => v.level > VOLUME_THRESHOLD).map((v) => v.uid)
        )
        setUsers((prev) =>
          prev.map((u) => (u.isLocal ? u : { ...u, talking: speaking.has(u.uid) }))
        )
      })

      const agoraUid = await client.join(APP_ID, envChannel(roomArg), TOKEN, null)
      localUidRef.current = agoraUid

      const localUser = { uid: agoraUid, name: nameArg, talking: false, isLocal: true }
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
          user.audioTrack?.setVolume(200)
          user.audioTrack?.play()
        }
      }

      // RTM presence — isolated so failure never blocks voice
      try {
        const rtmClient = AgoraRTM.createInstance(APP_ID)
        rtmClientRef.current = rtmClient
        await rtmClient.login({ uid: String(agoraUid), token: null })

        const rtmChannel = rtmClient.createChannel(envChannel(roomArg))
        rtmChannelRef.current = rtmChannel

        rtmChannel.on("ChannelMessage", ({ text }, senderId) => {
          try {
            const msg = JSON.parse(text)
            if (msg.type === "hello" && msg.name) {
              nameCacheRef.current[senderId] = msg.name
              setUsers((prev) =>
                prev.map((u) => (String(u.uid) === senderId ? { ...u, name: msg.name } : u))
              )
            }
          } catch { /* ignore non-JSON */ }
        })

        rtmChannel.on("MemberJoined", () => {
          rtmChannel
            .sendMessage({ text: JSON.stringify({ type: "hello", name: nameArg }) })
            .catch(() => {})
        })

        await rtmChannel.join()
        rtmChannel
          .sendMessage({ text: JSON.stringify({ type: "hello", name: nameArg }) })
          .catch(() => {})
      } catch (err) {
        console.error("RTM presence unavailable:", err)
      }

      sessionStorage.setItem("wl_session", JSON.stringify({ name: nameArg, room: roomArg }))
      setConnectedRoom(roomArg)
      setJoined(true)
    } catch (err) {
      console.error(err)
    }
  }

  const leaveRoom = async () => {
    try {
      pttActiveRef.current = false

      localTrackRef.current?.close()
      localTrackRef.current = null

      if (clientRef.current) {
        await clientRef.current.leave()
        clientRef.current = null
      }

      if (rtmChannelRef.current) {
        try { await rtmChannelRef.current.leave() } catch { /* ignore */ }
        rtmChannelRef.current = null
      }

      if (rtmClientRef.current) {
        try { await rtmClientRef.current.logout() } catch { /* ignore */ }
        rtmClientRef.current = null
      }

      rawStreamRef.current?.getTracks().forEach(t => t.stop())
      rawStreamRef.current = null
      audioContextRef.current?.close()
      audioContextRef.current = null

      sessionStorage.removeItem("wl_session")
      nameCacheRef.current = {}
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

  // ── Effects ───────────────────────────────────────────────────────────────

  // Release PTT if pointer lifts outside the button
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

  // Clean up on tab close
  useEffect(() => {
    const cleanup = () => {
      try {
        localTrackRef.current?.close()
        clientRef.current?.leave()
        rtmChannelRef.current?.leave()
        rtmClientRef.current?.logout()
        rawStreamRef.current?.getTracks().forEach(t => t.stop())
        audioContextRef.current?.close()
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

  // Restore session on page refresh (ref guard prevents StrictMode double-invoke)
  useEffect(() => {
    if (sessionRestoredRef.current) return
    sessionRestoredRef.current = true
    try {
      const saved = sessionStorage.getItem("wl_session")
      if (!saved) return
      const { name: n, room: r } = JSON.parse(saved)
      if (n && r) {
        setName(n)
        setRoom(r)
        joinRoom(n, r)
      }
    } catch {
      sessionStorage.removeItem("wl_session")
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Helpers ───────────────────────────────────────────────────────────────
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
