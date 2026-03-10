"use client"

import { useParams, useRouter } from "next/navigation"
import { useEffect, useRef, useState } from "react"
import { socket } from "@/lib/socket"

export default function RoomPage() {

  const { roomId } = useParams()
  const router = useRouter()

  const [cameraOn, setCameraOn] = useState(true)
  const [micOn, setMicOn] = useState(true)

  const localVideo = useRef<HTMLVideoElement>(null)
  const remoteVideo = useRef<HTMLVideoElement>(null)

  const peerRef = useRef<RTCPeerConnection | null>(null)
  const streamRef = useRef<MediaStream | null>(null)

  const pendingCandidates = useRef<RTCIceCandidateInit[]>([])

  const initialized = useRef(false)

  useEffect(() => {

    if (initialized.current) return
    initialized.current = true

    async function startCall() {

      console.log("Starting call")

      /* Reset previous peer */

      peerRef.current?.close()
      peerRef.current = null

      streamRef.current?.getTracks().forEach(track => track.stop())

      /* Get camera */

      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true
      })

      streamRef.current = stream

      if (localVideo.current) {
        localVideo.current.srcObject = stream
      }

      /* Create peer */

      const peer = new RTCPeerConnection({
        iceServers: [
          { urls: "stun:stun.l.google.com:19302" }
        ]
      })

      peerRef.current = peer

      console.log("Peer created")

      /* Add local tracks */

      stream.getTracks().forEach(track => {
        peer.addTrack(track, stream)
      })

      /* Remote stream */

      const remoteStream = new MediaStream()


      peer.ontrack = (event) => {

  console.log("Remote track received")

  remoteStream.addTrack(event.track)

  if (remoteVideo.current) {
    remoteVideo.current.srcObject = remoteStream
  }

}

      /* ICE candidates */

      peer.onicecandidate = ({ candidate }) => {

        if (candidate) {

          console.log("Sending ICE candidate")

          socket.emit("ice-candidate", {
            roomId,
            candidate
          })

        }

      }

      socket.on("user-joined", async () => {


  if (!peerRef.current) return
  if (peerRef.current.signalingState === "closed") return

      console.log("User joined, creating offer")

      const offer = await peer.createOffer()

      await peer.setLocalDescription(offer)

      socket.emit("offer", {
        roomId,
        offer
      })

    })

     

      /* Receive offer */

      socket.on("offer", async ({ offer }) => {

        console.log("Offer received")

        if (!peerRef.current) return
  if (peerRef.current.signalingState === "closed") return


        await peer.setRemoteDescription(new RTCSessionDescription(offer))
        for (const c of pendingCandidates.current) {
            await peer.addIceCandidate(new RTCIceCandidate(c))
          }
          pendingCandidates.current = []
        console.log("Creating answer")

        const answer = await peer.createAnswer()

        await peer.setLocalDescription(answer)

        socket.emit("answer", {
          roomId,
          answer: peer.localDescription
        })

      })

      /* Receive answer */

      socket.on("answer", async ({ answer }) => {

        if (!peerRef.current) return
  if (peerRef.current.signalingState === "closed") return

        console.log("Answer received")

        if (peer.signalingState !== "have-local-offer") {
          console.log("Ignoring duplicate answer")
          return
  }

        await peer.setRemoteDescription(
          new RTCSessionDescription(answer)
        )
        for (const c of pendingCandidates.current) {
            await peer.addIceCandidate(new RTCIceCandidate(c))
          }
          pendingCandidates.current = []

      })

      /* Receive ICE */

      socket.on("ice-candidate", async ({ candidate }) => {

          console.log("ICE candidate received")

          if (!candidate) return

          try {

            if (peer.remoteDescription) {

              await peer.addIceCandidate(new RTCIceCandidate(candidate))

            } else {

              console.log("Queueing ICE candidate")

              pendingCandidates.current.push(candidate)

            }

          } catch (err) {

            console.error("ICE candidate error:", err)

          }

        })
      /* Join room */

      console.log("Joining room:", roomId)

      socket.emit("join-room", roomId)

    }

    startCall()

    return () => {

      console.log("Cleaning up listeners")

      socket.off("offer")
      socket.off("answer")
      socket.off("ice-candidate")

    }

  }, [])

  /* Toggle Camera */

  const toggleCamera = () => {

    const stream = streamRef.current
    if (!stream) return

    const track = stream.getVideoTracks()[0]

    if (track) {
      track.enabled = !track.enabled
      setCameraOn(track.enabled)
    }

  }

  /* Toggle Mic */

  const toggleMic = () => {

    const stream = streamRef.current
    if (!stream) return

    const track = stream.getAudioTracks()[0]

    if (track) {
      track.enabled = !track.enabled
      setMicOn(track.enabled)
    }

  }

  /* Leave call */

  const leaveCall = () => {

  console.log("Leaving call")

  peerRef.current?.close()
  peerRef.current = null

  streamRef.current?.getTracks().forEach(track => track.stop())

  router.push("/")

}

  return (

    <div className="h-screen w-screen bg-black relative">

      {/* Remote video */}

      <video
        ref={remoteVideo}
        autoPlay
        playsInline
        className="w-full h-full object-cover"
      />

      {/* Local preview */}

      <video
        ref={localVideo}
        autoPlay
        playsInline
        muted
        className="absolute bottom-24 right-6 w-56 rounded-lg border border-gray-700 shadow-lg"
      />

      {/* Controls */}

      <div className="absolute bottom-6 w-full flex justify-center gap-6">

        <button
          onClick={toggleMic}
          className="bg-gray-800 hover:bg-gray-700 text-white px-5 py-3 rounded-full"
        >
          {micOn ? "🎤" : "🔇"}
        </button>

        <button
          onClick={toggleCamera}
          className="bg-gray-800 hover:bg-gray-700 text-white px-5 py-3 rounded-full"
        >
          {cameraOn ? "📷" : "🚫📷"}
        </button>

        <button
          onClick={leaveCall}
          className="bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-full"
        >
          Leave
        </button>

      </div>

    </div>

  )

}