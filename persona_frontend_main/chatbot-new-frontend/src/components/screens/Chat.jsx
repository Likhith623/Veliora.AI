import React from 'react'
import {
  Card,
} from "@/components/ui/card"
import Image from 'next/image'

function Chat() {
  return (
    <div suppressHydrationWarning className='w-screen md:max-w-lg md:mx-auto max-w-sm'>
      <Cards />
      <Cards />
      <Cards />
      <Cards />
      <Cards />
    </div>
  )
}

const Cards = () => {
  return (
    <Card className='mt-2 transform transition duration-600 hover:scale-110 hover:bg-neutral-900 max-w-md'>
      <div className='flex flex-row items-center p-3 cursor-pointer'>
        <Image
          src="https://images.unsplash.com/photo-1636041293178-808a6762ab39?q=80&w=3464&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"
          alt="Bot"
          width={500}
          height={500}
          draggable={false}
          className="h-10 w-10 rounded-3xl object-cover object-center" />
        <div className='flex flex-row justify-between text-left ml-3 w-full'>
          <div>
            <p className='text-left  font-semibold'>James Kim</p>
            <p className='text-left text-xs'>Engineering Lead at DataPro</p>
          </div>
          <div className='justify-center items-center my-auto'>
            <p className='text-left text-sm'  >Dec 12, 2022</p>
          </div>
        </div>
      </div>
    </Card>
  )
}

export default Chat