import { useCallback, useRef } from "react"
import { createRtcClient, joinRtcChannel, subscribeAndPlay, buildAudioChain } from "../services/rtcService"
import { trackEvent } from "../lib/analytics"

const VOLUME_THRESHOLD = 10

export function useAgoraRtc(pttActiveRef, setTalking) {
  // ── RTC refs ───────────────────────────────────────────────────────────────
  const clientRef   = useRef(null)
  const localUidRef = useRef(null)

  // ── Audio refs ─────────────────────────────────────────────────────────────
  const localTrackRef   = useRef(null)
  const audioContextRef = useRef(null)
  const rawStreamRef    = useRef(null)

  // ── Connect ────────────────────────────────────────────────────────────────
  const connect = async (nameArg, roomArg, { setUsers, nameCacheRef }) => {
    const client = createRtcClient()
    clientRef.current = client

    client.on("user-published", async (user, mediaType) => {
      await subscribeAndPlay(client, user, mediaType)
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
      const speaking = new Set()
      for (const { uid, level } of volumes) {
        if (level > VOLUME_THRESHOLD) speaking.add(uid)
      }
      setUsers((prev) =>
        prev.map((u) => (u.isLocal ? u : { ...u, talking: speaking.has(u.uid) }))
      )
    })

    const agoraUid = await joinRtcChannel(client, roomArg)
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
        await subscribeAndPlay(client, user, "audio")
      }
    }

    return agoraUid
  }

  // ── Disconnect ─────────────────────────────────────────────────────────────
  const disconnect = async () => {
    localTrackRef.current?.close()
    localTrackRef.current = null
    rawStreamRef.current?.getTracks().forEach((t) => t.stop())
    rawStreamRef.current = null
    audioContextRef.current?.close()
    audioContextRef.current = null

    if (clientRef.current) {
      await clientRef.current.leave()
      clientRef.current = null
    }
    localUidRef.current = null
  }

  // ── PTT: start transmitting ────────────────────────────────────────────────
  const startTalking = useCallback(async () => {
    try {
      if (!localTrackRef.current) {
        const { processedTrack, ctx, rawStream } = await buildAudioChain()
        audioContextRef.current = ctx
        rawStreamRef.current = rawStream
        localTrackRef.current = processedTrack
        await clientRef.current.publish([processedTrack])
      }
      // Guard: user may have released PTT before the async chain finished
      if (!pttActiveRef.current) return
      await localTrackRef.current.setEnabled(true)
      setTalking(true)
    } catch (err) {
      console.error("Mic Error:", err)
      pttActiveRef.current = false
      if (err?.name === "NotAllowedError" || err?.name === "PermissionDeniedError") {
        trackEvent("mic_permission_denied", "error")
      } else {
        trackEvent("mic_error", "error", { label: err?.name ?? "unknown" })
      }
    }
  }, [pttActiveRef, setTalking])

  // ── PTT: stop transmitting ─────────────────────────────────────────────────
  const stopTalking = useCallback(async () => {
    try {
      if (!localTrackRef.current) return
      await localTrackRef.current.setEnabled(false)
      setTalking(false)
    } catch (err) {
      console.error(err)
    }
  }, [setTalking])

  return {
    clientRef,
    localUidRef,
    localTrackRef,
    audioContextRef,
    rawStreamRef,
    connect,
    disconnect,
    startTalking,
    stopTalking,
  }
}
