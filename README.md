# WaveLink

A push-to-talk (PTT) walkie-talkie web app built with React, Vite, and Agora.

## Features

- Push-to-talk voice transmission with hold-to-talk button
- Real-time participant list with active speaker indicator
- Automatic session restore on page refresh
- Room isolation — join any named room independently
- Half-duplex audio with custom Web Audio processing pipeline
- Responsive layout for desktop and mobile browsers

## Tech Stack

- **React 18 + Vite** — UI and build
- **Agora RTC SDK** (`agora-rtc-sdk-ng`) — audio streaming
- **Agora RTM SDK** (`agora-rtm-sdk`) — presence and username sharing
- **Web Audio API** — custom send-side DSP (HPF + Presence EQ + Compressor + Gain)
- **Framer Motion** — animations
- **Tailwind CSS** — styling

## Project Structure

```
src/
├── App.jsx                    # Root component
├── agora.js                   # APP_ID, TOKEN, envChannel()
├── services/
│   ├── rtcService.js          # Pure Agora RTC functions (no React)
│   └── rtmService.js          # Pure Agora RTM functions (no React)
├── hooks/
│   ├── useAgoraRtc.js         # RTC client + Web Audio chain
│   ├── useAgoraRtm.js         # RTM presence / username sharing
│   ├── useSession.js          # sessionStorage save / restore
│   └── useWavelink.js         # Main orchestrator hook
└── components/
    ├── JoinScreen.jsx          # Name + room input form
    ├── Header.jsx              # Room info + LEAVE button
    ├── UserList.jsx            # List of connected users
    ├── UserCard.jsx            # Single user with speaking state
    └── PushToTalkButton.jsx    # Hold-to-talk button
```

## Getting Started

### 1. Clone and install

```bash
git clone https://github.com/kantakshay/wavelink.git
cd wavelink
npm install
```

### 2. Configure Agora

Edit `src/agora.js` and set your Agora App ID:

```js
export const APP_ID = "your-agora-app-id"
export const TOKEN = null  // set if token auth is enabled
```

### 3. Run locally

```bash
npm run dev
```

To test on a phone on the same network:

```bash
npm run dev -- --host
```

Then open `http://<your-local-ip>:5173` on the phone.

### 4. Build for production

```bash
npm run build
```

## Audio Pipeline

The send-side audio chain (in `rtcService.buildAudioChain`):

```
getUserMedia (noiseSuppression: false)
  → High-pass filter @ 80 Hz        (removes rumble)
  → Presence EQ @ 3 kHz +6 dB       (voice clarity)
  → DynamicsCompressor               (even volume)
  → Makeup gain ×2.5                 (loudness)
  → createCustomAudioTrack @ 128 kbps
```

Receive side: `setVolume(200)` on all remote tracks.

> `noiseSuppression: false` is required — browser ANS fights the compressor and causes robotic artifacts when both are active.

## Environment Isolation

Channels are prefixed with `dev_` in development to prevent local testing from bleeding into production rooms:

```js
export const envChannel = (room) =>
  import.meta.env.DEV ? `dev_${room}` : room
```

## Rollback

If anything breaks after a push:

```bash
git revert HEAD --no-edit
git push origin main
```
