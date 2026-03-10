"use client"

import { useParams, useRouter } from "next/navigation"
import { useEffect, useRef, useState} from "react"
import { socket } from "@/lib/socket"

export default function RoomPage() {

  const { roomId } = useParams()
  const router = useRouter()

  const[ cameraOn, setCameraOn] = useState(true)
  const[micOn, setMicOn] = useState(true) 

  const localVideo = useRef<HTMLVideoElement>(null)
  const remoteVideo = useRef<HTMLVideoElement>(null)

  const peerRef = useRef<RTCPeerConnection | null>(null)
  const streamRef = useRef<MediaStream | null>(null)

  useEffect(() => {

    async function startCall() {

      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true
      })

      streamRef.current = stream

      if (localVideo.current) {
        localVideo.current.srcObject = stream
      }

      const peer = new RTCPeerConnection({
        iceServers: [
          { urls: "stun:stun.l.google.com:19302" }
        ]
      })

      peerRef.current = peer

      stream.getTracks().forEach(track => {
        peer.addTrack(track, stream)
      })

      peer.ontrack = (event) => {
        if (remoteVideo.current) {
          remoteVideo.current.srcObject = event.streams[0]
        }
      }

      socket.on("user-joined", async () => {
        const offer = await peer.createOffer()
        await peer.setLocalDescription(offer)

        socket.emit("offer", {
          roomId,
          offer
        })
      })

      socket.on("offer", async (offer) => {

        await peer.setRemoteDescription(offer)

        const answer = await peer.createAnswer()

        await peer.setLocalDescription(answer)

        socket.emit("answer", {
          roomId,
          answer
        })

      })

      socket.on("answer", async (answer) => {
        await peer.setRemoteDescription(answer)
      })

      peer.onicecandidate = (event) => {

        if (event.candidate) {

          socket.emit("ice-candidate", {
            roomId,
            candidate: event.candidate
          })

        }

      }

      socket.on("ice-candidate", async (candidate) => {
        await peer.addIceCandidate(candidate)
      })

      socket.emit("join-room", roomId)

    }

    startCall()

  }, [])

  const toggleCamera = ()=>{
    const stream = streamRef.current
    if (!stream){
      console.log("No chat is done")
    }
    const videoTrack = stream?.getVideoTracks()[0]

    if(videoTrack){
      videoTrack.enabled = !videoTrack.enabled
      setCameraOn(videoTrack.enabled)
    }
  }

  const toggleMic = () => {
    const stream = streamRef.current

    if(!stream){
      return
    }

    const audioTrack = stream.getAudioTracks()[0]

    if(audioTrack){
      audioTrack.enabled = !audioTrack.enabled
      setMicOn(audioTrack.enabled)
    }
  }

  const leaveCall = () => {

    peerRef.current?.close()

    streamRef.current?.getTracks().forEach(track => track.stop())

    router.push("/")

  }

  return (

    <div className="h-screen w-screen bg-black relative">

      {/* Remote Video (fullscreen) */}
      <video
        ref={remoteVideo}
        autoPlay
        playsInline
        className="w-full h-full object-cover"
      />

      {/* Local Video */}
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