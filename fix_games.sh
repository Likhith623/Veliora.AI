#!/bin/bash
sed -i.bak -e '/const handleActivityMessage = async (userMessage) => {/,/const currentTime = new Date();/!b' \
-e '/const currentTime = new Date();/a\
\
    // Optimistic UI for text games\
    const tempId = Date.now().toString();\
    const newUserMsg = {\
      id: tempId,\
      text: userMessage,\
      sender: "user",\
      timestamp: currentTime,\
    };\
    setMessages((prev) => [...prev, newUserMsg]);\
    setHasConversations(true);\
\
    // Smooth scrolling\
    const timeoutId = setTimeout(() => {\
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });\
    }, 50);\
' persona_frontend_main/chatbot-new-frontend/src/app/chat/page.js
