                         if (url.match(/\.(mp3|wav|ogg|m4a|webm)(\?.*)?$/i)) {
                             inlineAudioUrl = url;
                             isVoiceNoteLocal = true;
                         }
                         return "";
                    })
                    .replace(/\(Media:[^)]*\)/gi, "")
                    .trim();

                  return (
                  <React.Fragment key={index}>
                    {/* Optional Banners Rendered Above the Message */}
                    {isActivityStart && (
                      <div className="flex justify-center my-3 w-full">
                        <div className="flex items-center gap-2 px-5 py-2 rounded-full bg-gradient-to-r from-violet-500/80 to-purple-600/80 backdrop-blur-sm border border-purple-300/30 shadow-md text-white text-sm font-semibold">
                          <span>🎮</span>
                          <span>Activity Started</span>
                        </div>
                      </div>
                    )}
                    {isActivityEnd && (
                      <div className="flex justify-center my-3 w-full">
                        <div className="flex items-center gap-2 px-5 py-2 rounded-full bg-gradient-to-r from-gray-500/80 to-gray-600/80 backdrop-blur-sm border border-gray-300/30 shadow-md text-white text-sm font-semibold">
                          <span>🏁</span>
                          <span>Activity Ended</span>
                        </div>
                      </div>
                    )}
                    {isVoiceCallStart && (
                      <div className="flex justify-center my-3 w-full">
                        <div className="flex items-center gap-2 px-5 py-2 rounded-full bg-gradient-to-r from-green-500/80 to-emerald-600/80 backdrop-blur-sm border border-green-300/30 shadow-md text-white text-sm font-semibold">
                          <span>📞</span>
                          <span>Voice Call Started</span>
                        </div>
                      </div>
                    )}
                    {isVoiceCallEnd && (
                      <div className="flex justify-center my-3 w-full">
                        <div className="flex items-center gap-2 px-5 py-2 rounded-full bg-gradient-to-r from-red-500/80 to-rose-600/80 backdrop-blur-sm border border-red-300/30 shadow-md text-white text-sm font-semibold">
                          <span>📵</span>
                          <span>Voice Call Ended</span>
                        </div>
                      </div>
                    )}

                    {/* Determine if we even have text to show (e.g., if message was purely a tag) */}
                    {(cleanedMsgText || msg.isImageMessage || msg.audioUrl) && (
                      <div
                        className={`my-2 flex ${
                      msg.sender === "bot" ? "justify-start" : "justify-end"
                    }`}
                  >
                    <div className="max-w-[80%] min-w-16 relative">
                      {msg.sender === "bot" && msg.reaction && (
                        <div
                          className="absolute bottom-0 left-3 z-10 bg-white/80 rounded-full w-8 h-8 flex items-center justify-center shadow-sm border border-gray-100 cursor-pointer hover:bg-white/90"
                          onClick={() => toggleRemovalTooltip(msg.id)}
                        >
                          <span className="text-lg">{msg.reaction}</span>
                          {showRemoveTooltip === msg.id && (
                            <RemovalTooltip msgId={msg.id} />
                          )}
                        </div>
                      )}

                      <div className="flex flex-row items-center gap-2">
                        {msg.sender === "bot" ? (
                          msg.voice_only && msg.isVoiceRequested ? ( // ✅ BOTH CONDITIONS
                            <PlayAudio
                              text={msg.text}
                              bot_id={msg.bot_id || selectedBotId}
                            />
                          ) : (
                            <>
                              <div
                                data-sender="bot"
                                className={
                                  msg.isImageMessage
                                    ? "p-0 m-0 bg-transparent border-none shadow-none rounded-none w-full text-left"
                                    : `px-4 py-2 rounded-2xl ${
                                        botThemes[selectedBotId]?.botBubble ||
                                        "bg-white/20 text-gray-900"
                                      } border border-white/20 backdrop-blur-sm shadow-md placeholder-gray-200 ${
                                        highlightedMessage === msg.id
                                          ? "bg-orange-200/30"
                                          : ""
                                      } w-full text-left`
                                }
                                style={{
                                  userSelect: "none",
                                  WebkitUserSelect: "none",
                                  WebkitTouchCallout: "none",
                                }}
                                onTouchStart={(e) => {
                                  e.preventDefault();
                                  handleLongPressStart(msg.id);
                                }}
                                onTouchEnd={handleLongPressEnd}
                                onTouchMove={handleLongPressEnd}
                                onTouchCancel={handleLongPressEnd}
                              >
                                {msg.isImageMessage ? (
                                  <div className="flex flex-col gap-2">
                                    <div className="flex items-center gap-2">
                                      <img
                                        src={msg.imageUrl}
                                        alt="Bot selfie"
                                        className="max-w-full max-h-64 object-contain rounded-lg shadow-md bg-transparent cursor-pointer hover:opacity-90 transition-opacity"
                                        onLoad={() => scrollToBottom()}
                                        onClick={() =>
                                          openFullScreenImage(
                                            msg.imageUrl,
                                            "Bot selfie"
                                          )
                                        }
                                        style={{
                                          backgroundColor: "transparent",
                                        }}
                                      />
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          const ext = msg.imageUrl?.startsWith(
                                            "data:"
                                          )
                                            ? "png"
                                            : msg.imageUrl
                                                ?.split(".")
                                                .pop()
                                                ?.split("?")[0] || "png";
                                          downloadImage(
                                            msg.imageUrl,
                                            `selfie-${Date.now()}.${ext}`
                                          );
                                        }}
                                        title="Download selfie"
                                        aria-label="Download selfie"
                                        className="mt-1 w-8 h-8 rounded-full bg-white/80 backdrop-blur-md border border-gray-200 shadow-sm flex items-center justify-center text-gray-700 hover:bg-white hover:shadow-md flex-shrink-0"
                                      >
                                        <Download size={16} />
                                      </button>
                                    </div>
                                    {cleanedMsgText && (
                                      <span className="text-sm">
                                        {cleanedMsgText}
                                      </span>
                                    )}
                                  </div>
                                ) : (() => {
                                  // Detect inline image URL in bot message text
                                  const textContent = cleanedMsgText;
                                  const imageUrlMatch = textContent.match(/(https?:\/\/[^\s]+\.(?:jpg|jpeg|png|gif|webp|svg)(\?[^\s]*)?)/i);

                                  if (isVoiceNoteLocal || inlineAudioUrl) {
                                      return (
                                        <div className="flex flex-col gap-2 relative z-10 w-full min-w-[200px]">
                                           {inlineAudioUrl && (
                                             <audio controls src={inlineAudioUrl} className="w-full h-10 rounded-full bg-white max-w-[280px]" preload="metadata" />
                                           )}
                                           {textContent && (
                                              <span className="text-sm leading-relaxed">{textContent}</span>
                                           )}
                                        </div>
                                      );
                                  }

                                  if (imageUrlMatch && !msg.isImageMessage) {
                                    const imgUrl = imageUrlMatch[1];
                                    const caption = textContent.replace(imageUrlMatch[0], "").trim();
                                    return (
                                      <div className="flex flex-col gap-2">
                                        <img
                                          src={imgUrl}
                                          alt="Shared image"
                                          className="max-w-full max-h-64 object-contain rounded-lg shadow-md cursor-pointer hover:opacity-90 transition-opacity"
                                          onLoad={() => scrollToBottom()}
                                          onClick={() => openFullScreenImage(imgUrl, "Image")}
                                        />
                                        {caption && <span className="text-sm">{caption}</span>}
                                      </div>
                                    );
                                  }
                                  return (
                                  <motion.p>
                                    {textContent
                                      .split(" ")
                                      .map((word, i) => (
                                        <motion.span
                                          key={i}
                                          initial={{
                                            filter: "blur(10px)",
                                            opacity: 0,
                                            y: 5,
                                          }}
                                          animate={{
                                            filter: "blur(0px)",
                                            opacity: 1,
                                            y: 0,
                                          }}
                                          transition={{
                                            duration: 0.2,
                                            ease: "easeInOut",
                                            delay: 0.02 * i,
                                          }}
                                          className="inline-block select-none"
                                        >
                                          {word}&nbsp;
                                        </motion.span>
                                      ))}
                                    {(msg.isActivityMessage ||
                                      msg.platform === "game_activity" ||
                                      msg.activityId) && (
                                      <span
                                        className="inline-block ml-2 align-middle text-lg"
                                        title="Game Activity"
                                        style={{ verticalAlign: "middle" }}
                                      >
                                        🎮
                                      </span>
                                    )}
                                  </motion.p>
                                  );
                                })()}
                              </div>
                              {!msg.isImageMessage && (
                                <PlayAudio
                                  text={cleanedMsgText}
                                  bot_id={msg.bot_id || selectedBotId}
                                  minimal={true}
                                />
                              )}
                            </>
                          )
                        ) : (
                          <div
                            data-sender="user"
                            className={`px-4 py-2 rounded-2xl ${
                              msg.isImageMessage
                                ? "bg-transparent border-none shadow-none" // No background for images
                                : botThemes[selectedBotId]?.userBubble ||
                                  "bg-purple-400/80 text-white"
                            } ${
                              !msg.isImageMessage
                                ? "border border-white/20 backdrop-blur-sm shadow-md"
                                : ""
                            } placeholder-gray-200 ${
                              highlightedMessage === msg.id
                                ? "bg-orange-200/90"
                                : ""
                            } w-full text-left`}
                            style={{
                              userSelect: "none",
                              WebkitUserSelect: "none",
                              WebkitTouchCallout: "none",
                            }}
                          >
                            {msg.isImageMessage ? (
                              <div className="flex flex-col gap-2">
                                {(() => {
                                  console.log("Rendering image:", msg.imageUrl); // <-- This should show up if block is entered
                                  return (
                                    <img
                                      src={msg.imageUrl}
                                      alt="Shared image"
                                      className="max-w-full max-h-64 object-contain rounded-lg shadow-md bg-transparent cursor-pointer hover:opacity-90 transition-opacity"
                                      onLoad={() => scrollToBottom()}
                                      onClick={() =>
                                        openFullScreenImage(
                                          msg.imageUrl,
                                          "Shared image"
                                        )
                                      }
                                      style={{ backgroundColor: "transparent" }}
                                    />
                                  );
                                })()}
                                {msg.text && (
                                  <span className="text-sm">{msg.text}</span>
                                )}
                              </div>
                            ) : (
                              msg.text
                            )}
                          </div>
                        )}
                      </div>
                      <div className="flex flex-row justify-end">
                        <span
                          className={`text-xs mt-[7px] ${
                            msg.sender === "user" ? "mr-3" : ""
                          } ${
                            isDarkTheme
                              ? `${textColorClass}`
                              : `${textColorClass}`
                          }`}
                        >
                          {formatTime(msg.timestamp)}
                        </span>

                        {msg.sender === "bot" && (
                          <div className="flex justify-end px-2 mr-7 relative text-white">
                            {showReactionsFor !== null &&
                              msg.id !== null &&
                              showReactionsFor === msg.id && (
                                <ReactionSelector msgId={msg.id} />
                              )}

                            <div className="gap-3 flex flex-row mt-1">
                              {!isMobile && (
                                <button
                                  onClick={() => toggleReactions(msg.id)}
                                  className={`cursor-pointer transition-colors mr-2 ${
                                    isDarkTheme
                                      ? `${textColorClass}`
                                      : `${textColorClass}`
                                  }`}
                                >
                                  <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    width="18"
                                    height="18"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                  >
                                    <circle cx="12" cy="12" r="10" />
                                    <path d="M8 14s1.5 2.25 4 2.25 4-2.25 4-2.25" />
                                    <line x1="9" y1="9" x2="9.01" y2="9" />
                                    <line x1="15" y1="9" x2="15.01" y2="9" />
                                  </svg>
                                </button>
                              )}

                              {typeof msg.text === "string" &&
                              msg.text.trim() ===
                                "Sorry, there was an error processing your request. Please try again." ? null : (
                                <>
                                  {msg.feedback === "" ? (
                                    <>
                                      <ThumbsUp
                                        className={`cursor-pointer ${
                                          isDarkTheme
                                            ? `${textColorClass}`
                                            : `${textColorClass}`
                                        }`}
                                        size={18}
                                        onClick={() =>
                                          handleFeedback("like", msg.id)
                                        }
                                      />
                                      <ThumbsDown
                                        className={`cursor-pointer ${
                                          isDarkTheme
                                            ? `${textColorClass}`
                                            : `${textColorClass}`
                                        }`}
                                        size={18}
                                        onClick={() =>
                                          handleFeedback("dislike", msg.id)
                                        }
                                      />
                                    </>
                                  ) : msg.feedback === "like" ? (
                                    <>
                                      <IconThumbUpFilled
                                        size={22}
                                        className={`${
                                          isDarkTheme
                                            ? `${textColorClass}`
                                            : `${textColorClass}`
                                        } mt-[-2px]`}
                                      />
                                      <ThumbsDown
                                        className={`cursor-pointer ${
                                          isDarkTheme
                                            ? `${textColorClass}`
                                            : `${textColorClass}`
                                        }`}
                                        size={18}
                                        onClick={() =>
                                          handleFeedback("dislike", msg.id)
                                        }
                                      />
                                    </>
                                  ) : (
                                    <>
                                      <ThumbsUp
                                        className={`cursor-pointer ${
                                          isDarkTheme
                                            ? `${textColorClass}`
                                            : `${textColorClass}`
                                        }`}
                                        size={18}
                                        onClick={() =>
                                          handleFeedback("like", msg.id)
                                        }
                                      />
                                      <IconThumbDownFilled
                                        size={22}
                                        className={`${
                                          isDarkTheme
                                            ? `${textColorClass}`
                                            : `${textColorClass}`
                                        }`}
                                      />
                                    </>
                                  )}
                                </>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                    )}
                  </React.Fragment>
                  );
                })}
              </div>
            ))}

            {isTyping && <TypingIndicator />}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

