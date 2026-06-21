import { motion } from "framer-motion"

export default function PushToTalkButton({ talking, onPointerDown, onPointerUp }) {
  return (
    <div className="py-4 md:py-5 flex justify-center bg-black/80 backdrop-blur-xl shrink-0 touch-none">
      <motion.button
        whileTap={{ scale: 0.95 }}
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onContextMenu={(e) => e.preventDefault()}
        className={`
          relative
          w-36 h-36 md:w-48 md:h-48
          rounded-full border bg-zinc-950
          overflow-hidden flex items-center justify-center
          transition-all duration-200
          ${talking
            ? "border-green-400/60 shadow-[0_0_60px_rgba(0,255,153,0.35)]"
            : "border-green-400/20 shadow-[0_0_60px_rgba(0,255,153,0.12)]"
          }
        `}
      >
        <div className="absolute w-24 h-24 md:w-28 md:h-28 rounded-full bg-green-400/10 blur-3xl" />

        <div
          className={`
            absolute inset-3 rounded-full border
            ${talking ? "border-green-400/40 animate-pulse" : "border-green-400/20"}
          `}
        />

        <div className="relative z-10 text-center">
          <div className="text-3xl md:text-4xl mb-2 md:mb-3">🎙</div>
          <p className="text-green-400 text-[10px] md:text-xs tracking-[0.35em] font-semibold">
            {talking ? "TRANSMITTING" : "HOLD TO TALK"}
          </p>
        </div>
      </motion.button>
    </div>
  )
}
