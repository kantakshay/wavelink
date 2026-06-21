export default function WaitingRoom({ joinPhase, denyReason, onRetry }) {
  const isWaiting = joinPhase === "waiting"

  const message = {
    wrong_pin: { title: "Wrong PIN", sub: "Check the PIN and try again." },
    rejected:  { title: "Request Denied", sub: "The host did not let you in." },
    timeout:   { title: "No Response", sub: "The host did not respond. Try again." },
    host_left: { title: "Host Left", sub: "The host closed the room." },
  }[denyReason] ?? { title: "Access Denied", sub: "Try again." }

  return (
    <div className="h-screen bg-black text-white flex items-center justify-center px-6">
      <div className="w-full max-w-sm border border-zinc-900 rounded-[32px] bg-zinc-950/50 backdrop-blur-xl p-8 text-center">
        <h1 className="text-3xl font-bold tracking-[0.25em] mb-10">WAVELINK</h1>

        {isWaiting ? (
          <>
            <div className="w-14 h-14 rounded-full border-2 border-green-400/30 border-t-green-400 animate-spin mx-auto mb-6" />
            <p className="text-green-400 text-sm tracking-[0.2em] font-semibold mb-2">
              WAITING FOR APPROVAL
            </p>
            <p className="text-zinc-500 text-xs tracking-widest">
              The host will let you in shortly…
            </p>
          </>
        ) : (
          <>
            <div className="w-14 h-14 rounded-full border-2 border-red-400/40 flex items-center justify-center mx-auto mb-6">
              <span className="text-2xl text-red-400">✕</span>
            </div>
            <p className="text-red-400 text-sm tracking-[0.2em] font-semibold mb-2">
              {message.title.toUpperCase()}
            </p>
            <p className="text-zinc-500 text-xs tracking-widest mb-8">{message.sub}</p>
            <button
              onClick={onRetry}
              className="w-full py-4 rounded-2xl bg-zinc-800 text-white font-bold tracking-[0.2em] hover:bg-zinc-700 transition-all"
            >
              TRY AGAIN
            </button>
          </>
        )}
      </div>
    </div>
  )
}
