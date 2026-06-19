import { motion } from "framer-motion"

function UserCard({ user, speaking }) {
  const initial = user.name.charAt(0).toUpperCase()

  return (
    <motion.li
      layout
      className={`
        flex items-center gap-3
        px-4 py-3 md:py-3.5
        rounded-2xl border
        transition-all duration-200
        ${speaking
          ? "border-green-400/50 bg-green-400/5 speaker-glow"
          : "border-zinc-900 bg-zinc-950/50"
        }
      `}
    >
      <span
        className={`
          shrink-0 w-9 h-9 md:w-10 md:h-10
          rounded-xl flex items-center justify-center
          text-xs md:text-sm font-bold border
          ${speaking
            ? "border-green-400/40 text-green-400 bg-green-400/10"
            : "border-zinc-800 text-zinc-400 bg-zinc-900"
          }
        `}
      >
        [{initial}]
      </span>

      <span
        className={`
          flex-1 text-sm md:text-base truncate
          ${speaking ? "text-green-100" : "text-zinc-300"}
        `}
      >
        {user.name}
        {user.isLocal && (
          <span className="text-zinc-600 text-xs ml-2">(you)</span>
        )}
      </span>

      {speaking && (
        <span className="shrink-0 text-base" aria-label="Speaking">🔊</span>
      )}
    </motion.li>
  )
}

export default function UserList({ users, isUserSpeaking }) {
  return (
    <ul className="space-y-1">
      {users.map((user) => (
        <UserCard key={user.uid} user={user} speaking={isUserSpeaking(user)} />
      ))}
    </ul>
  )
}
