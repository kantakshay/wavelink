import { useEffect, useRef, useState } from "react"
import { motion } from "framer-motion"
import AgoraRTC from "agora-rtc-sdk-ng"

import { APP_ID, TOKEN } from "./agora"

export default function App() {

  const clientRef = useRef(null)
  const localTrackRef = useRef(null)

  const [joined, setJoined] = useState(false)
  const [talking, setTalking] = useState(false)

  const [name, setName] = useState("")
  const [room, setRoom] = useState("")

  const [connectedRoom, setConnectedRoom] =
    useState("")

  const joinRoom = async () => {

    if (!name || !room) return

    try {

      const client = AgoraRTC.createClient({
        mode: "rtc",
        codec: "vp8",
      })

      clientRef.current = client

      await client.join(
        APP_ID,
        room,
        TOKEN,
        null
      )

      const micTrack =
        await AgoraRTC.createMicrophoneAudioTrack()

      localTrackRef.current = micTrack

      await client.publish([micTrack])

      await micTrack.setEnabled(false)

      client.on(
        "user-published",
        async (user, mediaType) => {

          await client.subscribe(user, mediaType)

          if (mediaType === "audio") {
            user.audioTrack.play()
          }
        }
      )

      setConnectedRoom(room)
      setJoined(true)

    } catch (err) {
      console.error(err)
    }
  }

  const startTalking = async () => {

    if (!localTrackRef.current) return

    await localTrackRef.current.setEnabled(true)

    setTalking(true)
  }

  const stopTalking = async () => {

    if (!localTrackRef.current) return

    await localTrackRef.current.setEnabled(false)

    setTalking(false)
  }

  useEffect(() => {

    return () => {
      localTrackRef.current?.close()
      clientRef.current?.leave()
    }

  }, [])

  // JOIN SCREEN
  if (!joined) {

    return (

      <div className="
        h-screen
        bg-black
        text-white
        flex
        items-center
        justify-center
        px-6
      ">

        <div className="
          w-full
          max-w-sm
          border
          border-zinc-900
          rounded-[32px]
          bg-zinc-950/50
          backdrop-blur-xl
          p-8
        ">

          <h1 className="
            text-3xl
            font-bold
            tracking-[0.25em]
            text-center
            mb-10
          ">
            WAVELINK
          </h1>

          <div className="space-y-5">

            <input
              type="text"
              placeholder="YOUR NAME"
              value={name}
              onChange={(e) =>
                setName(e.target.value)
              }

              className="
                w-full
                bg-black
                border
                border-zinc-800
                rounded-2xl
                px-5
                py-4
                outline-none
                text-sm
                tracking-[0.15em]
                focus:border-green-400
                transition-all
              "
            />

            <input
              type="text"
              placeholder="ROOM NAME"
              value={room}
              onChange={(e) =>
                setRoom(e.target.value)
              }

              className="
                w-full
                bg-black
                border
                border-zinc-800
                rounded-2xl
                px-5
                py-4
                outline-none
                text-sm
                tracking-[0.15em]
                focus:border-green-400
                transition-all
              "
            />

            <button

              onClick={joinRoom}

              className="
                w-full
                py-4
                rounded-2xl
                bg-green-400
                text-black
                font-bold
                tracking-[0.2em]
                mt-4
                hover:scale-[1.02]
                active:scale-[0.98]
                transition-all
              "
            >
              JOIN ROOM
            </button>

          </div>

        </div>

      </div>
    )
  }

  // ROOM UI
  return (

    <div className="
      h-screen
      bg-black
      text-white
      flex
      flex-col
      overflow-hidden
      select-none
    ">

      {/* HEADER */}
      <div className="
        px-4 md:px-8
        py-4 md:py-6
        flex
        items-center
        justify-between
      ">

        <div>

          <h1 className="
            text-lg md:text-2xl
            font-bold
            tracking-[0.25em]
          ">
            WAVELINK
          </h1>

          <p className="
            text-green-400
            text-[10px] md:text-xs
            mt-2
            tracking-[0.3em]
          ">
            {connectedRoom.toUpperCase()} • CONNECTED
          </p>

        </div>

        <div className="
          px-3 md:px-4
          py-2
          rounded-full
          border
          border-green-400/20
          text-green-400
          text-[10px] md:text-xs
          tracking-[0.2em]
        ">
          LIVE
        </div>

      </div>

      {/* ROOM PANEL */}
      <div className="
        flex-1
        flex
        items-center
        justify-center
        px-4 md:px-8
      ">

        <motion.div

          animate={
            talking
              ? { scale: [1, 1.05, 1] }
              : {}
          }

          transition={{
            repeat: Infinity,
            duration: 1.5,
          }}

          className="
            relative
            w-28 h-28 md:w-40 md:h-40
            rounded-full
            border
            flex
            items-center
            justify-center
            text-4xl md:text-5xl
            font-bold
            backdrop-blur-xl
            transition-all
            duration-300
          "

          style={{
            borderColor: talking
              ? "#00ff99"
              : "#27272a",

            boxShadow: talking
              ? "0 0 45px rgba(0,255,153,0.45)"
              : "none"
          }}
        >

          {talking && (
            <div className="
              absolute
              inset-0
              rounded-full
              border
              border-green-400/30
              animate-ping
            " />
          )}

          <div className="relative z-10">
            {name.charAt(0).toUpperCase()}
          </div>

        </motion.div>

      </div>

      {/* PTT BUTTON */}
      <div className="
        py-4 md:py-5
        flex
        justify-center
        bg-black/80
        backdrop-blur-xl
      ">

        <motion.button

          whileTap={{
            scale: 0.95
          }}

          onMouseDown={startTalking}
          onMouseUp={stopTalking}
          onTouchStart={startTalking}
          onTouchEnd={stopTalking}

          className="
            relative
            w-36 h-36 md:w-48 md:h-48
            rounded-full
            border
            border-green-400/20
            bg-zinc-950
            overflow-hidden
            flex
            items-center
            justify-center
            shadow-[0_0_60px_rgba(0,255,153,0.12)]
          "
        >

          <div className="
            absolute
            w-24 h-24 md:w-28 md:h-28
            rounded-full
            bg-green-400/10
            blur-3xl
          " />

          <div className="
            absolute
            inset-3
            rounded-full
            border
            border-green-400/20
            animate-pulse
          " />

          <div className="relative z-10 text-center">

            <div className="
              text-3xl md:text-4xl
              mb-2 md:mb-3
            ">
              🎙
            </div>

            <p className="
              text-green-400
              text-[10px] md:text-xs
              tracking-[0.35em]
              font-semibold
            ">
              {talking
                ? "TRANSMITTING"
                : "HOLD TO TALK"}
            </p>

          </div>

        </motion.button>

      </div>

    </div>
  )
}