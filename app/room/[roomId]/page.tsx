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

  const makingOffer = useRef(false)
  const polite = useRef(Math.random() > 0.5)

  useEffect(() => {

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

      peer.ontrack = (event) => {

        console.log("Remote stream received")

        const [remoteStream] = event.streams

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

      /* Negotiation needed */

      peer.onnegotiationneeded = async () => {

        try {

          console.log("Negotiation needed")

          makingOffer.current = true

          const offer = await peer.createOffer()

          await peer.setLocalDescription(offer)

          console.log("Sending offer")

          socket.emit("offer", {
            roomId,
            offer: peer.localDescription
          })

        } catch (err) {

          console.error("Negotiation error:", err)

        } finally {

          makingOffer.current = false

        }

      }

      /* Receive offer */

      socket.on("offer", async ({ offer }) => {

        console.log("Offer received")

        const offerCollision =
          makingOffer.current || peer.signalingState !== "stable"

        const ignoreOffer = !polite.current && offerCollision

        if (ignoreOffer) {
          console.log("Ignoring offer collision")
          return
        }

        await peer.setRemoteDescription(new RTCSessionDescription(offer))

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

        console.log("Answer received")

        await peer.setRemoteDescription(
          new RTCSessionDescription(answer)
        )

      })

      /* Receive ICE */

      socket.on("ice-candidate", async ({ candidate }) => {

        try {

          console.log("ICE candidate received")

          await peer.addIceCandidate(candidate)

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