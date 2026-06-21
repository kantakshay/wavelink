import { useState } from "react"

export default function JoinScreen({ name, room, setName, setRoom, pin, setPin, isHost, joinRoom, createRoom }) {
  const [copiedLink, setCopiedLink] = useState(false)
  const [copiedPin, setCopiedPin]   = useState(false)

  const isInvited = !isHost && !!new URLSearchParams(window.location.search).get("room")
  const shareUrl  = room ? `${window.location.origin}?room=${room}` : null

  const handleKeyDown = (e) => {
    if (e.key === "Enter") joinRoom()
  }

  const copyLink = () => {
    navigator.clipboard.writeText(shareUrl).then(() => {
      setCopiedLink(true)
      setTimeout(() => setCopiedLink(false), 2000)
    })
  }

  const copyPin = () => {
    navigator.clipboard.writeText(pin).then(() => {
      setCopiedPin(true)
      setTimeout(() => setCopiedPin(false), 2000)
    })
  }

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center px-6 py-8">
      <div className="w-full max-w-sm border border-zinc-900 rounded-[32px] bg-zinc-950/50 backdrop-blur-xl p-8">
        <h1 className="text-3xl font-bold tracking-[0.25em] text-center mb-8">
          WAVELINK
        </h1>

        {isInvited && (
          <p className="text-center text-zinc-400 text-xs tracking-[0.15em] mb-6">
            YOU'VE BEEN INVITED — ENTER YOUR NAME AND PIN TO JOIN
          </p>
        )}

        <div className="space-y-4">
          {/* Name input */}
          <input
            type="text"
            placeholder="YOUR NAME"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={handleKeyDown}
            className="w-full bg-black border border-zinc-800 rounded-2xl px-5 py-4 outline-none text-sm tracking-[0.15em] focus:border-green-400 transition-all"
          />

          {/* Room field */}
          <input
            type="text"
            placeholder="ROOM NAME"
            value={room}
            readOnly={isHost || isInvited}
            onChange={(e) => !isHost && !isInvited && setRoom(e.target.value)}
            onKeyDown={handleKeyDown}
            className={`w-full bg-black border rounded-2xl px-5 py-4 outline-none text-sm tracking-[0.15em] transition-all
              ${isHost || isInvited
                ? "border-green-400/40 text-green-400 cursor-default"
                : "border-zinc-800 focus:border-green-400"
              }`}
          />

          {/* Create Room button */}
          {!isHost && !isInvited && !room && (
            <button
              onClick={createRoom}
              className="w-full py-3 rounded-2xl border border-zinc-700 text-zinc-400 text-xs tracking-[0.2em] hover:border-green-400/40 hover:text-green-400 transition-all"
            >
              + CREATE ROOM
            </button>
          )}

          {/* Host PIN — shown as soon as pin exists and not an invitee */}
          {pin && !isInvited && (
            <div className="rounded-2xl border-2 border-yellow-400/60 bg-yellow-400/10 px-5 py-5">
              <p className="text-[10px] tracking-[0.2em] text-yellow-300/80 mb-3">
                SHARE THIS PIN WITH YOUR FRIENDS
              </p>
              <div className="flex items-center justify-between gap-4">
                <span className="text-5xl font-black text-yellow-400 tabular-nums">{pin}</span>
                <button
                  onClick={copyPin}
                  className="shrink-0 px-4 py-2 rounded-xl bg-yellow-400 text-black text-xs font-bold tracking-[0.15em] hover:bg-yellow-300 active:scale-95 transition-all"
                >
                  {copiedPin ? "COPIED!" : "COPY"}
                </button>
              </div>
            </div>
          )}

          {/* Share link — host and direct-join; not invitees (they already have the URL) */}
          {shareUrl && !isInvited && (
            <div className="flex items-center gap-2 bg-zinc-900/80 border border-zinc-800 rounded-xl px-4 py-2.5">
              <span className="flex-1 text-zinc-500 text-[10px] tracking-wide truncate">
                {shareUrl}
              </span>
              <button
                onClick={copyLink}
                className="shrink-0 text-[10px] tracking-[0.15em] text-green-400 hover:text-green-300 transition-colors"
              >
                {copiedLink ? "COPIED!" : "COPY LINK"}
              </button>
            </div>
          )}

          {/* Invitee PIN entry */}
          {isInvited && (
            <input
              type="text"
              inputMode="numeric"
              maxLength={4}
              placeholder="ENTER PIN"
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
              onKeyDown={handleKeyDown}
              className="w-full bg-black border border-zinc-800 rounded-2xl px-5 py-4 outline-none text-sm tracking-[0.5em] text-center focus:border-yellow-400 transition-all"
            />
          )}

          <button
            onClick={() => joinRoom()}
            className="w-full py-4 rounded-2xl bg-green-400 text-black font-bold tracking-[0.2em] hover:scale-[1.02] active:scale-[0.98] transition-all"
          >
            {isInvited ? "REQUEST TO JOIN" : "JOIN ROOM"}
          </button>
        </div>
      </div>
    </div>
  )
}
