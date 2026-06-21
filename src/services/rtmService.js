import AgoraRTM from "agora-rtm-sdk"
import { APP_ID, envChannel } from "../agora"

export function createRtmClient() {
  return AgoraRTM.createInstance(APP_ID)
}

export async function loginRtm(rtmClient, uid) {
  await rtmClient.login({ uid: String(uid), token: null })
}

export function createRtmChannel(rtmClient, roomArg) {
  return rtmClient.createChannel(envChannel(roomArg))
}

export function sendHello(channel, name) {
  channel
    .sendMessage({ text: JSON.stringify({ type: "hello", name }) })
    .catch(() => {})
}

export function sendPeerMessage(rtmClient, targetUid, payload) {
  rtmClient
    ?.sendMessageToPeer({ text: JSON.stringify(payload) }, String(targetUid))
    .catch(() => {})
}
