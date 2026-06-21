import { useState } from "react"

export default function JoinScreen({ name, room, setName, setRoom, joinRoom, createRoom }) {
  const [copied, setCopied] = useState(false)

  const isInvited = !!new URLSearchParams(window.location.search).get("room")
  const shareUrl = room ? `${window.location.origin}?room=${room}` : null

  const handleKeyDown = (e) => {
    if (e.key === "Enter") joinRoom()
  }

  const copyLink = () => {
    navigator.clipboard.writeText(shareUrl).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <div className="h-screen bg-black text-white flex items-center justify-center px-6">
      <div className="w-full max-w-sm border border-zinc-900 rounded-[32px] bg-zinc-950/50 backdrop-blur-xl p-8">
        <h1 className="text-3xl font-bold tracking-[0.25em] text-center mb-10">
          WAVELINK
        </h1>

        {isInvited && (
          <p className="text-center text-zinc-400 text-xs tracking-[0.15em] mb-6">
            YOU'VE BEEN INVITED — ENTER YOUR NAME TO JOIN
          </p>
        )}

        <div className="space-y-5">
          <input
            type="text"
            placeholder="YOUR NAME"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={handleKeyDown}
            className="w-full bg-black border border-zinc-800 rounded-2xl px-5 py-4 outline-none text-sm tracking-[0.15em] focus:border-green-400 transition-all"
          />

          <div className="space-y-2">
            <input
              type="text"
              placeholder="ROOM NAME"
              value={room}
              readOnly={isInvited}
              onChange={(e) => !isInvited && setRoom(e.target.value)}
              onKeyDown={handleKeyDown}
              className={`w-full bg-black border rounded-2xl px-5 py-4 outline-none text-sm tracking-[0.15em] transition-all
                ${isInvited
                  ? "border-green-400/40 text-green-400 cursor-default"
                  : "border-zinc-800 focus:border-green-400"
                }`}
            />

            {!isInvited && !room && (
              <button
                onClick={createRoom}
                className="w-full py-3 rounded-2xl border border-zinc-700 text-zinc-400 text-xs tracking-[0.2em] hover:border-green-400/40 hover:text-green-400 transition-all"
              >
                + CREATE ROOM
              </button>
            )}

            {shareUrl && (
              <div className="flex items-center gap-2 bg-zinc-900/80 border border-zinc-800 rounded-xl px-4 py-2.5">
                <span className="flex-1 text-zinc-500 text-[10px] tracking-wide truncate">
                  {shareUrl}
                </span>
                <button
                  onClick={copyLink}
                  className="shrink-0 text-[10px] tracking-[0.15em] text-green-400 hover:text-green-300 transition-colors"
                >
                  {copied ? "COPIED!" : "COPY"}
                </button>
              </div>
            )}
          </div>

          <button
            onClick={() => joinRoom()}
            className="w-full py-4 rounded-2xl bg-green-400 text-black font-bold tracking-[0.2em] mt-4 hover:scale-[1.02] active:scale-[0.98] transition-all"
          >
            JOIN ROOM
          </button>
        </div>
      </div>
    </div>
  )
}
