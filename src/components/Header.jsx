import { useState } from "react"

export default function Header({ connectedRoom, userCount, pin, onLeave }) {
  const [copiedLink, setCopiedLink] = useState(false)
  const [copiedPin, setCopiedPin]   = useState(false)

  const shareLink = () => {
    navigator.clipboard.writeText(window.location.href).then(() => {
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
    <div className="px-4 md:px-8 py-4 md:py-6 shrink-0">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg md:text-2xl font-bold tracking-[0.25em]">WAVELINK</h1>
          <p className="text-[10px] md:text-xs tracking-[0.3em] text-zinc-400 mt-0.5">
            ROOM: {connectedRoom.toUpperCase()}
          </p>
        </div>

        <div className="flex items-center gap-2 md:gap-4">
          <p className="text-[10px] md:text-xs tracking-[0.3em] text-green-400/80">
            {userCount} CONNECTED
          </p>
          <button
            onClick={shareLink}
            className="px-4 py-2 rounded-full border border-zinc-700 text-zinc-400 text-[10px] md:text-xs tracking-[0.2em] hover:border-green-400/40 hover:text-green-400 transition-all"
          >
            {copiedLink ? "COPIED!" : "SHARE"}
          </button>
          <button
            onClick={onLeave}
            className="px-4 py-2 rounded-full border border-red-500/20 text-red-400 text-[10px] md:text-xs tracking-[0.2em] hover:bg-red-500/10 transition-all"
          >
            LEAVE
          </button>
        </div>
      </div>

      {/* PIN bar — host only */}
      {pin && (
        <div className="mt-3 flex items-center gap-3 bg-yellow-400/5 border border-yellow-400/20 rounded-xl px-4 py-2">
          <span className="text-[10px] tracking-[0.25em] text-yellow-400/60">ROOM PIN</span>
          <span className="text-sm font-bold tracking-[0.4em] text-yellow-400">{pin}</span>
          <button
            onClick={copyPin}
            className="ml-auto text-[10px] tracking-[0.15em] text-yellow-400/60 hover:text-yellow-400 transition-colors"
          >
            {copiedPin ? "COPIED!" : "COPY"}
          </button>
        </div>
      )}
    </div>
  )
}
