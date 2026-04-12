import re

file_path = "temp_page.js"
with open(file_path, "r") as f:
    content = f.read()

# the block from `{messagesOnDate.map((msg, index) => {`
# up to `                    {/* Optional Banners Rendered Above the Message */}`
old_loop_logic = r"""                \{messagesOnDate\.map\(\(msg, index\) => \{\s*// ── Activity / voice-call system messages ──────────────────.*?\{\/\* Optional Banners Rendered Above the Message \*\/\}"""

new_loop_logic = """                {messagesOnDate.map((msg, index) => {
                  // Media and tags are already parsed by backend!
                  const isActivityStart = msg.isActivityStart;
                  const isActivityEnd = msg.isActivityEnd;
                  const isVoiceNoteLocal = msg.isVoiceNote || !!msg.audioUrl;
                  const inlineAudioUrl = msg.audioUrl || null;
                  const inlineImageUrl = msg.imageUrl || null;
                  
                  // Use the text exactly as provided by the backend (tags already stripped)
                  let cleanedMsgText = msg.text || "";
                  
                  // Legacy support for voice calls if any remain
                  const isVoiceCallStart = cleanedMsgText.match(/\\[(?:call|CALL|voice_call|VOICE_CALL)\\]/i);
                  const isVoiceCallEnd = cleanedMsgText.match(/\\[(?:call_end|CALL_END|voice_call_end|VOICE_CALL_END)\\]/i);
                  cleanedMsgText = cleanedMsgText.replace(/\\[(?:call|CALL|voice_call|VOICE_CALL)\\]/gi, "");
                  cleanedMsgText = cleanedMsgText.replace(/\\[(?:call_end|CALL_END|voice_call_end|VOICE_CALL_END)\\]/gi, "");
                  
                  // Set image message flag for styling
                  if (inlineImageUrl) {
                      msg.isImageMessage = true;
                  }

                  const hasContent = cleanedMsgText.length > 0 || inlineImageUrl || inlineAudioUrl || msg.isImageMessage;

                  return (
                    hasContent && (
                      <div
                        key={msg.id || index}
                        className={`flex flex-col max-w-[85%] sm:max-w-[75%] \${
                          msg.sender === "local-temp"
                            ? "self-end"
                            : msg.sender === "user"
                            ? "self-end"
                            : "self-start"
                        } relative mb-4 \${
                          msg.sender === "bot" ? "ml-9 sm:ml-12" : ""
                        }`}
                      >
                    {/* Optional Banners Rendered Above the Message */}"""

replaced = re.sub(old_loop_logic, new_loop_logic, content, flags=re.DOTALL)

with open(file_path, "w") as f:
    f.write(replaced)

