import { useWavelink } from "./hooks/useWavelink"
import JoinForm from "./components/JoinForm"
import UserList from "./components/UserList"
import PttButton from "./components/PttButton"

export default function App() {
  const {
    name, setName,
    room, setRoom,
    joined, talking,
    users, connectedRoom,
    joinRoom, leaveRoom,
    handlePttPointerDown, handlePttPointerUp,
    isUserSpeaking,
  } = useWavelink()

  if (!joined) {
    return (
      <JoinForm
        name={name}
        room={room}
        setName={setName}
        setRoom={setRoom}
        joinRoom={joinRoom}
      />
    )
  }

  return (
    <div className="h-screen bg-black text-white flex flex-col overflow-hidden select-none">
      {/* Header */}
      <div className="px-4 md:px-8 py-4 md:py-6 flex items-center justify-between shrink-0">
        <h1 className="text-lg md:text-2xl font-bold tracking-[0.25em]">WAVELINK</h1>
        <button
          onClick={leaveRoom}
          className="px-4 py-2 rounded-full border border-red-500/20 text-red-400 text-[10px] md:text-xs tracking-[0.2em] hover:bg-red-500/10 transition-all"
        >
          LEAVE
        </button>
      </div>

      {/* Room stats + user list */}
      <div className="flex-1 flex flex-col px-4 md:px-8 min-h-0">
        <div className="shrink-0 mb-4 space-y-1">
          <p className="text-[10px] md:text-xs tracking-[0.3em] text-zinc-400">
            ROOM: {connectedRoom.toUpperCase()}
          </p>
          <p className="text-[10px] md:text-xs tracking-[0.3em] text-green-400/80">
            {users.length} CONNECTED
          </p>
        </div>

        <div className="flex-1 overflow-y-auto min-h-0 -mx-1 px-1">
          <UserList users={users} isUserSpeaking={isUserSpeaking} />
        </div>
      </div>

      {/* PTT */}
      <PttButton
        talking={talking}
        onPointerDown={handlePttPointerDown}
        onPointerUp={handlePttPointerUp}
      />
    </div>
  )
}
