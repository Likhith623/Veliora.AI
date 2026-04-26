"use client";
import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/support/UserContext';
import { useBot } from '@/support/BotContext';
import { IconLoader, IconExclamationCircle, IconProgressCheck } from '@tabler/icons-react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import Head from "next/head";
import { diaryAddNote } from "@/lib/veliora-client";

function Diary() {
    const [text, setText] = useState("")
    const [status, setStatus] = useState("")
    const { userDetails } = useUser();
    const { selectedBotId } = useBot();

    useEffect(() => {
        if(text.trim() !== "") {
            setStatus("");
        }
    },  [text])

    const handleSend = async () => {
        if (!text.trim()) {
            setStatus(<span className='flex flex-row gap-2 items-center'>
                <IconExclamationCircle size={16} className="text-white" /> Please enter some text
            </span>)
            return;
        }
        setStatus(<span className='flex flex-row gap-2 items-center'>
            <IconLoader size={16} className="text-white" /> Please wait until the bot processes your diary...
        </span>)
        try {
            // Use adapter for saving notes manually (falls back to veliora as new backend handles diary auto)
            const data = await diaryAddNote(userDetails.email, selectedBotId, text);
            console.log(data);
            setStatus(<span className='flex flex-row gap-2 items-center text-green-400'>
                <IconProgressCheck size={16} className="text-white" /> Done, your diary is sent. Now you can go back to the chat.
            </span>)
        } catch (error) {
            setStatus(<span className='flex flex-row gap-2 items-center'>
                <IconExclamationCircle size={16} className="text-white" /> Error in sending the text
            </span>)
            console.error(error);
        }
    }
    return (
      <>
        <Head>
          <title>Veliora | VELIORA Diary – Emotional Support AI</title>
          <meta
            name="description"
            content="Use your AI companion for venting in moments of stress and loneliness. This virtual friend for lonely nights is a cute AI chat app and offers emotional support AI for teens. It’s also a great AI for social anxiety and an AI friend for depression/anxiety."
          />
          <meta
            name="keywords"
            content="AI companion for venting, Virtual friend for lonely nights, Cute AI chat app, Emotional support AI for teens, AI for social anxiety, AI friend for depression/anxiety"
          />
          <meta
            property="og:title"
            content="VELIORA Diary – Emotional Support AI | Veliora"
          />
          <meta
            property="og:description"
            content="Write with VELIORA as your digital diary and emotional support chatbot—supportive, safe, and always listening."
          />
          <meta property="og:url" content="http://localhost:3000/diary" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <link rel="icon" href="/favicon.ico" />
        </Head>

        <div className="min-h-screen w-full flex items-center justify-center p-4 ">
          <div className="w-full md:max-w-lg bg-neutral-800 rounded p-5">
            <div className="w-full">
              <h2 className="font-bold text-xl">Diary</h2>
            </div>
            <div className="flex flex-col items-center gap-4 w-full">
              <div className="w-full">
                <Textarea
                  className="border border-slate-50 h-40 w-full mt-2"
                  placeholder="Enter you diary here to personalize the bot further. After sending the diary, please wait a few minutes for the bot to process and personalize it for you."
                  onChange={(e) => setText(e.target.value)}
                />
              </div>
              {status == "" ? (
                <Button className="mt-2" onClick={handleSend}>
                  Send
                </Button>
              ) : (
                <p>{status}</p>
              )}
            </div>
          </div>
        </div>
      </>
    );
}

export default Diary