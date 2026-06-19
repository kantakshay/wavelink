export default function JoinForm({ name, room, setName, setRoom, joinRoom }) {
  const handleKeyDown = (e) => {
    if (e.key === "Enter") joinRoom()
  }

  return (
    <div className="h-screen bg-black text-white flex items-center justify-center px-6">
      <div className="w-full max-w-sm border border-zinc-900 rounded-[32px] bg-zinc-950/50 backdrop-blur-xl p-8">
        <h1 className="text-3xl font-bold tracking-[0.25em] text-center mb-10">
          WAVELINK
        </h1>

        <div className="space-y-5">
          <input
            type="text"
            placeholder="YOUR NAME"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={handleKeyDown}
            className="w-full bg-black border border-zinc-800 rounded-2xl px-5 py-4 outline-none text-sm tracking-[0.15em] focus:border-green-400 transition-all"
          />

          <input
            type="text"
            placeholder="ROOM NAME"
            value={room}
            onChange={(e) => setRoom(e.target.value)}
            onKeyDown={handleKeyDown}
            className="w-full bg-black border border-zinc-800 rounded-2xl px-5 py-4 outline-none text-sm tracking-[0.15em] focus:border-green-400 transition-all"
          />

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
