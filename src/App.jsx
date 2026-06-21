import { useWavelink } from "./hooks/useWavelink"
import JoinScreen from "./components/JoinScreen"
import WaitingRoom from "./components/WaitingRoom"
import Header from "./components/Header"
import UserList from "./components/UserList"
import PushToTalkButton from "./components/PushToTalkButton"
import JoinRequestPanel from "./components/JoinRequestPanel"

export default function App() {
  const {
    name, setName,
    room, setRoom,
    pin, setPin,
    isHost,
    joined, talking,
    users, connectedRoom,
    pendingRequests,
    joinPhase, denyReason,
    joinRoom, leaveRoom,
    createRoom, handleManualRoomChange, resetJoin,
    approveRequest, denyRequest,
    handlePttPointerDown, handlePttPointerUp,
    isUserSpeaking,
  } = useWavelink()

  // Invitee is waiting or was denied
  if (!joined && joinPhase !== "idle") {
    return (
      <WaitingRoom
        joinPhase={joinPhase}
        denyReason={denyReason}
        onRetry={resetJoin}
      />
    )
  }

  if (!joined) {
    return (
      <JoinScreen
        name={name}
        room={room}
        setName={setName}
        setRoom={handleManualRoomChange}
        pin={pin}
        setPin={setPin}
        isHost={isHost}
        joinRoom={joinRoom}
        createRoom={createRoom}
      />
    )
  }

  return (
    <div className="relative h-screen bg-black text-white flex flex-col overflow-hidden select-none">
      <Header
        connectedRoom={connectedRoom}
        userCount={users.length}
        pin={isHost ? pin : null}
        onLeave={leaveRoom}
      />

      <div className="flex-1 overflow-y-auto min-h-0 px-4 md:px-8">
        <UserList users={users} isUserSpeaking={isUserSpeaking} />
      </div>

      <PushToTalkButton
        talking={talking}
        onPointerDown={handlePttPointerDown}
        onPointerUp={handlePttPointerUp}
      />

      {isHost && (
        <JoinRequestPanel
          requests={pendingRequests}
          onApprove={approveRequest}
          onDeny={denyRequest}
        />
      )}
    </div>
  )
}
