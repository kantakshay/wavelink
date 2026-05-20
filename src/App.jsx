import { useEffect, useRef, useState } from "react"
import { motion } from "framer-motion"
import AgoraRTC from "agora-rtc-sdk-ng"

import { APP_ID, TOKEN, CHANNEL } from "./agora"

export default function App() {

  const clientRef = useRef(null)
  const localTrackRef = useRef(null)

  const [joined, setJoined] = useState(false)
  const [talking, setTalking] = useState(false)

  useEffect(() => {

    const init = async () => {

      const client = AgoraRTC.createClient({
        mode: "rtc",
        codec: "vp8",
      })

      clientRef.current = client

      await client.join(
        APP_ID,
        CHANNEL,
        TOKEN,
        null
      )

      const micTrack =
        await AgoraRTC.createMicrophoneAudioTrack()

      localTrackRef.current = micTrack

      await client.publish([micTrack])

      micTrack.setEnabled(false)

      setJoined(true)

      client.on("user-published",
        async (user, mediaType) => {

          await client.subscribe(user, mediaType)

          if (mediaType === "audio") {
            user.audioTrack.play()
          }
        }
      )
    }

    init()

    return () => {
      localTrackRef.current?.close()
      clientRef.current?.leave()
    }

  }, [])

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

  return (
    <div className="h-screen bg-black text-white flex flex-col overflow-hidden">

      {/* HEADER */}
      <div className="px-8 py-6 flex items-center justify-between">

        <div>
          <h1 className="text-2xl font-bold tracking-[0.25em]">
            WAVELINK
          </h1>

          <p className="text-green-400 text-xs mt-2 tracking-[0.3em]">
            ROOM 07 • {joined ? "CONNECTED" : "CONNECTING"}
          </p>
        </div>

        <div className="
          px-4 py-2
          rounded-full
          border border-green-400/20
          text-green-400
          text-xs
          tracking-[0.2em]
        ">
          LIVE
        </div>

      </div>

      {/* ROOM */}
      <div className="flex-1 flex items-center justify-center px-8">

        <motion.div

          animate={
            talking
              ? { scale: [1, 1.03, 1] }
              : {}
          }

          transition={{
            repeat: Infinity,
            duration: 1.5,
          }}

          className="
            w-40 h-40
            rounded-full
            border
            flex items-center justify-center
            text-5xl font-bold
            backdrop-blur-xl
            relative
            transition-all duration-300
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
              absolute inset-0
              rounded-full
              border border-green-400/30
              animate-ping
            " />
          )}

          <div className="relative z-10">
            Y
          </div>

        </motion.div>

      </div>

      {/* PTT BUTTON */}
      <div className="
        p-5
        flex justify-center
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
            w-48 h-48
            rounded-full
            border
            overflow-hidden
            flex items-center justify-center
            transition-all duration-200
          "

          style={{
            borderColor: talking
              ? "#00ff99"
              : "rgba(0,255,153,0.2)",

            boxShadow: talking
              ? "0 0 80px rgba(0,255,153,0.45)"
              : "0 0 60px rgba(0,255,153,0.12)"
          }}
        >

          <div className="
            absolute
            w-28 h-28
            rounded-full
            bg-green-400/10
            blur-3xl
          " />

          <div className="
            absolute inset-3
            rounded-full
            border border-green-400/20
            animate-pulse
          " />

          <div className="relative z-10 text-center">

            <div className="text-4xl mb-3">
              🎙
            </div>

            <p className="
              text-green-400
              text-xs
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