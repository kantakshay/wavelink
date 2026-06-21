export default function JoinRequestPanel({ requests, onApprove, onDeny }) {
  if (!requests.length) return null

  return (
    <div className="absolute top-20 right-4 md:right-8 z-50 w-72 space-y-2">
      {requests.map((req) => (
        <div
          key={req.rtmUid}
          className="bg-zinc-950 border border-zinc-700 rounded-2xl px-4 py-3 shadow-xl"
        >
          <p className="text-xs tracking-[0.2em] text-zinc-400 mb-0.5">JOIN REQUEST</p>
          <p className="text-sm font-semibold text-white mb-3 truncate">{req.name}</p>
          <div className="flex gap-2">
            <button
              onClick={() => onApprove(req.rtmUid)}
              className="flex-1 py-2 rounded-xl bg-green-400 text-black text-xs font-bold tracking-[0.15em] hover:bg-green-300 transition-all"
            >
              ACCEPT
            </button>
            <button
              onClick={() => onDeny(req.rtmUid)}
              className="flex-1 py-2 rounded-xl border border-red-500/30 text-red-400 text-xs font-bold tracking-[0.15em] hover:bg-red-500/10 transition-all"
            >
              DENY
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}
