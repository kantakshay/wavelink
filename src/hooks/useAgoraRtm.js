import { useRef } from "react"
import { createRtmClient, loginRtm, createRtmChannel, sendHello } from "../services/rtmService"

export function useAgoraRtm() {
  // ── RTM refs ───────────────────────────────────────────────────────────────
  const rtmClientRef  = useRef(null)
  const rtmChannelRef = useRef(null)

  // ── Connect ────────────────────────────────────────────────────────────────
  const connect = async (agoraUid, nameArg, roomArg, { setUsers, nameCacheRef }) => {
    const rtmClient = createRtmClient()
    rtmClientRef.current = rtmClient
    await loginRtm(rtmClient, agoraUid)

    const channel = createRtmChannel(rtmClient, roomArg)
    rtmChannelRef.current = channel

    channel.on("ChannelMessage", ({ text }, senderId) => {
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

    channel.on("MemberJoined", () => sendHello(channel, nameArg))

    await channel.join()
    sendHello(channel, nameArg)
  }

  // ── Disconnect ─────────────────────────────────────────────────────────────
  const disconnect = async () => {
    if (rtmChannelRef.current) {
      try { await rtmChannelRef.current.leave() } catch { /* ignore */ }
      rtmChannelRef.current = null
    }
    if (rtmClientRef.current) {
      try { await rtmClientRef.current.logout() } catch { /* ignore */ }
      rtmClientRef.current = null
    }
  }

  return { rtmClientRef, rtmChannelRef, connect, disconnect }
}
