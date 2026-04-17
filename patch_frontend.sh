# Remove the double append in handleActivityMessage
sed -i.bak '/const newUserMsg = {/,/setMessages((prev) => \[\.\.\.prev, newUserMsg\]);/d' persona_frontend_main/chatbot-new-frontend/src/app/chat/page.js
