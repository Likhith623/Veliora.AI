import re

file_path = "temp_page.js"
with open(file_path, "r") as f:
    content = f.read()

# Replace the if (msg.sender === "bot") {...} rendering block with the correct handling of msg.audioUrl and msg.imageUrl
# Since it's big, we write a specific function that replaces the nested `{(msg.sender === "bot") ? (<div...` structure.

old_bot_render = r"""                                  if \(isVoiceNoteLocal \|\| inlineAudioUrl\) \{\s*return \(\s*<div className="flex flex-col gap-2 relative z-10 w-full min-w-\[200px\] bg-transparent">\s*<PlayAudio\s*text=\{textContent \|\| "Voice Note"\}\s*bot_id=\{msg\.bot_id \|\| selectedBotId\}\s*initialAudioUrl=\{inlineAudioUrl\}\s*isWhiteIcon=\{false\}\s*\/>\s*<\/div>\s*\);\s*\}\s*if \(imageUrlMatch && !msg\.isImageMessage\) \{(?:.*?)(?=if \(!hasContent)"""

# I need to match everything between `const textContent = cleanedMsgText;` and `if (!hasContent) ...`
old_render_block = r"""                                  const textContent = cleanedMsgText;.*?if \(!hasContent\)"""

new_render_block = """                                  const textContent = cleanedMsgText;
                                  
                                  if (inlineAudioUrl || isVoiceNoteLocal) {
                                      return (
                                        <div className="flex flex-col gap-2 relative z-10 w-full min-w-[200px] bg-transparent">
                                           <PlayAudio 
                                              text={textContent || "Voice Note"}
                                              bot_id={msg.bot_id || selectedBotId}
                                              isWhiteIcon={false}
                                           />
                                        </div>
                                      );
                                  }

                                  if (inlineImageUrl || msg.isImageMessage) {
                                    return (
                                      <div className="flex flex-col gap-2 p-0 m-0 bg-transparent border-none shadow-none rounded-none w-full text-left">
                                        <img
                                          src={inlineImageUrl || msg.imageUrl}
                                          alt="Shared image"
                                          className="max-w-full max-h-64 object-contain rounded-lg shadow-md cursor-pointer hover:opacity-90 transition-opacity"
                                          onLoad={() => scrollToBottom()}
                                        />
                                        {textContent && textContent !== "null" && textContent.trim() !== "" && (
                                          <div className={`mt-2 px-4 py-2 rounded-2xl ${
                                            botThemes[selectedBotId]?.botBubble ||
                                            "bg-white/20 text-gray-900"
                                          } border border-white/20 backdrop-blur-sm shadow-md`}>
                                              {textContent}
                                          </div>
                                        )}
                                      </div>
                                    );
                                  }

                                  if (!hasContent)"""

replaced = re.sub(old_render_block, new_render_block, content, flags=re.DOTALL)

with open(file_path, "w") as f:
    f.write(replaced)

