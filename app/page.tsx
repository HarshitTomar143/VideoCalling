"use client"

import { useRouter } from "next/navigation"

export default function Home(){
  const router = useRouter()

  const createRoom = () =>{
    const id = Math.random().toString(36).substring(7)
    router.push(`/room/${id}`)
  }

  return (
     <div>

      <h1>Video Call App</h1>

      <button onClick={createRoom}>
        Create Room
      </button>

    </div>
  )
}