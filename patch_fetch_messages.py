import re

file_path = "temp_page.js"
with open(file_path, "r") as f:
    content = f.read()

# Replace fetchMessages block
old_fetch = r"""    const fetchMessages = async \(\) => {.*?(?=\s*\}\, \[selectedBotId, userDetails\.email\]\);)"""
new_fetch = """    const fetchMessages = async () => {
      try {
        setMessages([]);
        setGroupedMessages({});

        const syncData = await chatInitSession("", selectedBotId);
        const rawHistory = syncData.history || [];

        // Adapt to frontend structure
        let formattedMessages = rawHistory.map((msg) => {
          return {
            id: msg.id || Math.random().toString(36).substr(2, 9),
            text: msg.text || "",
            sender: msg.role === "user" ? "user" : "bot",
            timestamp: new Date(msg.created_at || new Date()),
            bot_id: selectedBotId,
            isVoiceNote: msg.isVoiceNote,
            isUserImage: msg.isUserImage,
            isActivityStart: msg.isActivityStart,
            isActivityEnd: msg.isActivityEnd,
            audioUrl: msg.audioUrl,
            imageUrl: msg.imageUrl
          };
        });

        // Filter empty messages
        formattedMessages = formattedMessages.filter(
          (msg) => (msg.text && msg.text.trim() !== "") || msg.imageUrl || msg.audioUrl || msg.isActivityStart || msg.isActivityEnd
        );

        // --- Fetch festival message ---
        const botLocation = getBotLocation(selectedBotId);
        const festivalPayload = {
          user_email: userDetails.email,
          bot_id: selectedBotId,
          user_name: userDetails.name,
          user_location: userDetails.location || "unknown",
          bot_location: botLocation,
        };

        let festivalMessage = null;
        try {
          const festData = await festivalGetGreeting(festivalPayload);
          if (festData?.message?.trim()) {
            festivalMessage = {
              id: "festival-msg",
              text: festData.message,
              sender: "bot",
              timestamp: new Date(),
              feedback: "",
              reaction: "",
              bot_id: selectedBotId,
              isSystemMessage: isSystemMessageContent(festData.message),
            };
          }
        } catch (_festErr) {
          console.warn("[festival] greeting fetch failed:", _festErr);
        }

        // --- Combine messages ---
        const existingIds = formattedMessages.map((m) => m.id);
        let finalMessages = [...formattedMessages];

        if (festivalMessage && !existingIds.includes(festivalMessage.id)) {
          finalMessages.push(festivalMessage);
        }

        // --- Default message fallback ---
        if (finalMessages.length === 0) {
          const defaultText =
            bot_details.find((b) => b.bot_id === selectedBotId)?.quote ||
            "Hello, how are you feeling today?";
          finalMessages = [
            {
              id: "fallback-msg",
              text: defaultText,
              sender: "bot",
              timestamp: new Date(),
              feedback: "",
              reaction: "",
              bot_id: selectedBotId,
              isSystemMessage: isSystemMessageContent(defaultText),
            },
          ];
        }

        // --- Apply reactions ---
        const storedReactions = JSON.parse(
          localStorage.getItem(`reactions-${selectedBotId}`) || "{}"
        );
        finalMessages = finalMessages.map((msg) => ({
          ...msg,
          reaction: storedReactions[msg.id] || "",
        }));

        finalMessages.sort((a,b) => new Date(a.timestamp) - new Date(b.timestamp));

        // Set state DIRECTLY, no localStorage for messages
        setMessages(finalMessages);

      } catch (error) {
        console.error("Error fetching initialized chat session:", error);
        const defaultText =
          bot_details.find((b) => b.bot_id === selectedBotId)?.quote ||
          "Hello, how are you feeling today?";
        setMessages([
          {
            id: "fallback-msg",
            text: defaultText,
            sender: "bot",
            timestamp: new Date(),
            feedback: "",
            reaction: "",
            bot_id: selectedBotId,
            isSystemMessage: isSystemMessageContent(defaultText),
          },
        ]);
      }
    };

    fetchMessages();"""

replaced = re.sub(old_fetch, new_fetch, content, flags=re.DOTALL)

with open(file_path, "w") as f:
    f.write(replaced)

