import { useWavelink } from "./hooks/useWavelink"
import JoinScreen from "./components/JoinScreen"
import Header from "./components/Header"
import UserList from "./components/UserList"
import PushToTalkButton from "./components/PushToTalkButton"

export default function App() {
  const {
    name, setName,
    room, setRoom,
    joined, talking,
    users, connectedRoom,
    joinRoom, leaveRoom,
    createRoom,
    handlePttPointerDown, handlePttPointerUp,
    isUserSpeaking,
  } = useWavelink()

  if (!joined) {
    return (
      <JoinScreen
        name={name}
        room={room}
        setName={setName}
        setRoom={setRoom}
        joinRoom={joinRoom}
        createRoom={createRoom}
      />
    )
  }

  return (
    <div className="h-screen bg-black text-white flex flex-col overflow-hidden select-none">
      <Header
        connectedRoom={connectedRoom}
        userCount={users.length}
        onLeave={leaveRoom}
      />

      <div className="flex-1 overflow-y-auto min-h-0 px-4 md:px-8 -mx-0">
        <UserList users={users} isUserSpeaking={isUserSpeaking} />
      </div>

      <PushToTalkButton
        talking={talking}
        onPointerDown={handlePttPointerDown}
        onPointerUp={handlePttPointerUp}
      />
    </div>
  )
}
