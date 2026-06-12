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
  const [users, setUsers] = useState([])
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

      setUsers([
        {
          uid: "local",
          name: name,
          talking: false,
        },
      ])

      client.on("user-joined", (user) => {

        setUsers((prev) => [

          ...prev,

          {
            uid: user.uid,
            name: `User ${user.uid}`,
            talking: false,
          },

        ])

      })
      client.on("user-left", (user) => {

        setUsers((prev) =>
          prev.filter((u) => u.uid !== user.uid)
        )

      })
    } catch (err) {
      console.error(err)
    }
  }
  const leaveRoom = async () => {

    try {

      if (localTrackRef.current) {

        localTrackRef.current.close()
        localTrackRef.current = null

      }

      if (clientRef.current) {

        await clientRef.current.leave()
        clientRef.current = null

      }

      setTalking(false)
      setJoined(false)
      setRoom("")
      setName("")

      setConnectedRoom("")

    } catch (err) {

      console.error(err)

    }
  }

  const startTalking = async () => {

    try {

      if (!localTrackRef.current) {

        console.log("Creating microphone...")

        const micTrack =
          await AgoraRTC.createMicrophoneAudioTrack()

        localTrackRef.current = micTrack

        await clientRef.current.publish([micTrack])
      }

      await localTrackRef.current.setEnabled(true)

      setTalking(true)

      console.log("Talking ON")

    } catch (err) {

      console.error("Mic Error:", err)

    }
  }

  const stopTalking = async () => {

    try {

      if (!localTrackRef.current) return

      await localTrackRef.current.setEnabled(false)

      setTalking(false)

      console.log("Talking OFF")

    } catch (err) {

      console.error(err)

    }
  }
  useEffect(() => {

    const cleanup = async () => {

      try {

        localTrackRef.current?.close()

        if (clientRef.current) {
          await clientRef.current.leave()
        }

      } catch (err) {

        console.error(err)

      }
    }

    window.addEventListener(
      "beforeunload",
      cleanup
    )

    return () => {

      cleanup()

      window.removeEventListener(
        "beforeunload",
        cleanup
      )
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
        <button

          onClick={leaveRoom}

          className="
    px-4
    py-2
    rounded-full
    border
    border-red-500/20
    text-red-400
    text-[10px] md:text-xs
    tracking-[0.2em]
    hover:bg-red-500/10
    transition-all
  "
        >
          LEAVE
        </button>

      </div>

      {/* ROOM PANEL */}
{/* ROOM PANEL */}
<div
  className="
    flex-1
    flex
    items-center
    justify-center
    px-4
    md:px-8
  "
>
  <div
    className="
      flex
      flex-wrap
      justify-center
      gap-8
      max-w-4xl
    "
  >
    {users.map((user) => (
      <motion.div
        key={user.uid}
        className="flex flex-col items-center"
        animate={
          user.uid === "local" && talking
            ? { scale: [1, 1.05, 1] }
            : {}
        }
        transition={{
          repeat: Infinity,
          duration: 1.5,
        }}
      >
        <div
          className="
            relative
            w-24 h-24
            md:w-32 md:h-32
            rounded-full
            border
            flex
            items-center
            justify-center
            text-3xl
            md:text-4xl
            font-bold
            bg-zinc-950
          "
          style={{
            borderColor:
              user.uid === "local" && talking
                ? "#00ff99"
                : "#27272a",

            boxShadow:
              user.uid === "local" && talking
                ? "0 0 35px rgba(0,255,153,0.4)"
                : "none",
          }}
        >
          {user.uid === "local" && talking && (
            <div
              className="
                absolute
                inset-0
                rounded-full
                border
                border-green-400/30
                animate-ping
              "
            />
          )}

          <div className="relative z-10">
            {user.name.charAt(0).toUpperCase()}
          </div>
        </div>

        <p className="mt-3 text-sm text-zinc-300">
          {user.name}
        </p>
      </motion.div>
    ))}
  </div>
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
          onTouchStart={(e) => {
            e.preventDefault()
            startTalking()
          }}

          onTouchEnd={(e) => {
            e.preventDefault()
            stopTalking()
          }}

          onTouchCancel={(e) => {
            e.preventDefault()
            stopTalking()
          }}

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