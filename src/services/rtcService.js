import AgoraRTC from "agora-rtc-sdk-ng"
import { APP_ID, TOKEN, envChannel } from "../agora"

export function createRtcClient() {
  return AgoraRTC.createClient({ mode: "rtc", codec: "vp8" })
}

export async function joinRtcChannel(client, roomArg) {
  return client.join(APP_ID, envChannel(roomArg), TOKEN, null)
}

export async function subscribeAndPlay(client, user, mediaType) {
  await client.subscribe(user, mediaType)
  if (mediaType === "audio") {
    user.audioTrack?.setVolume(200)
    user.audioTrack?.play()
  }
}

export async function buildAudioChain() {
  const rawStream = await navigator.mediaDevices.getUserMedia({
    audio: {
      echoCancellation: true,
      noiseSuppression: false,
      autoGainControl: true,
      sampleRate: { ideal: 48000 },
      channelCount: { ideal: 1 },
    },
  })

  const ctx = new AudioContext({ sampleRate: 48000 })

  const hpf = ctx.createBiquadFilter()
  hpf.type = "highpass"
  hpf.frequency.value = 80

  const presence = ctx.createBiquadFilter()
  presence.type = "peaking"
  presence.frequency.value = 3000
  presence.gain.value = 6
  presence.Q.value = 1.0

  const comp = ctx.createDynamicsCompressor()
  comp.threshold.value = -24
  comp.knee.value = 30
  comp.ratio.value = 4
  comp.attack.value = 0.005
  comp.release.value = 0.15

  const makeup = ctx.createGain()
  makeup.gain.value = 2.5

  const dst = ctx.createMediaStreamDestination()
  ctx.createMediaStreamSource(rawStream)
    .connect(hpf)
    .connect(presence)
    .connect(comp)
    .connect(makeup)
    .connect(dst)

  const processedTrack = await AgoraRTC.createCustomAudioTrack({
    mediaStreamTrack: dst.stream.getAudioTracks()[0],
    encoderConfig: { sampleRate: 48000, stereo: false, bitrate: 128 },
  })

  return { processedTrack, ctx, rawStream }
}
