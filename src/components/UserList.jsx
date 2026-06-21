import UserCard from "./UserCard"

export default function UserList({ users, isUserSpeaking }) {
  return (
    <ul className="space-y-1">
      {users.map((user) => (
        <UserCard key={user.uid} user={user} speaking={isUserSpeaking(user)} />
      ))}
    </ul>
  )
}
