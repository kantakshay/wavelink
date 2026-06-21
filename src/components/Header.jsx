import { useState } from "react"

export default function Header({ connectedRoom, userCount, onLeave }) {
  const [copied, setCopied] = useState(false)

  const shareLink = () => {
    navigator.clipboard.writeText(window.location.href).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <div className="px-4 md:px-8 py-4 md:py-6 flex items-center justify-between shrink-0">
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
          {copied ? "COPIED!" : "SHARE"}
        </button>
        <button
          onClick={onLeave}
          className="px-4 py-2 rounded-full border border-red-500/20 text-red-400 text-[10px] md:text-xs tracking-[0.2em] hover:bg-red-500/10 transition-all"
        >
          LEAVE
        </button>
      </div>
    </div>
  )
}
