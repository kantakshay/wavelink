import { useRef } from "react"
import { createRtmClient, loginRtm, createRtmChannel, sendHello, sendPeerMessage } from "../services/rtmService"

export function useAgoraRtm() {
  // ── RTM refs ───────────────────────────────────────────────────────────────
  const rtmClientRef  = useRef(null)
  const rtmChannelRef = useRef(null)

  // ── Full connect (host, or invitee after approval) ─────────────────────────
  const connect = async (agoraUid, nameArg, roomArg, { setUsers, nameCacheRef, onJoinRequest }) => {
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
        if (msg.type === "join_request" && onJoinRequest) {
          onJoinRequest({ name: msg.name, rtmUid: msg.rtmUid, pin: msg.pin })
        }
      } catch { /* ignore non-JSON */ }
    })

    channel.on("MemberJoined", () => sendHello(channel, nameArg))

    await channel.join()
    sendHello(channel, nameArg)
  }

  // ── Lobby connect (invitee waiting for host approval) ─────────────────────
  const connectLobby = async (lobbyUid, nameArg, roomArg, { onJoinResponse }) => {
    const rtmClient = createRtmClient()
    rtmClientRef.current = rtmClient
    await loginRtm(rtmClient, lobbyUid)

    // Listen for peer-to-peer approve / deny from host
    rtmClient.on("MessageFromPeer", ({ text }) => {
      try {
        const msg = JSON.parse(text)
        if (msg.type === "join_approved" || msg.type === "join_denied") {
          onJoinResponse(msg)
        }
      } catch { /* ignore */ }
    })

    const channel = createRtmChannel(rtmClient, roomArg)
    rtmChannelRef.current = channel
    await channel.join()
  }

  // ── Send join request (invitee → channel) ──────────────────────────────────
  const sendJoinRequest = (nameArg, lobbyUid, pin) => {
    rtmChannelRef.current
      ?.sendMessage({ text: JSON.stringify({ type: "join_request", name: nameArg, rtmUid: lobbyUid, pin }) })
      .catch(() => {})
  }

  // ── Send peer message (host → specific invitee) ────────────────────────────
  const replyToPeer = (targetUid, payload) => {
    sendPeerMessage(rtmClientRef.current, targetUid, payload)
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

  return { rtmClientRef, rtmChannelRef, connect, connectLobby, sendJoinRequest, replyToPeer, disconnect }
}
