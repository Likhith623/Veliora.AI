const formattedMessages = [
  { activity_type: "chat" },
  { activity_type: "game" },
  { activity_type: "game" },
  { activity_type: "game" },
  { activity_type: "chat" }
];
for (let i = 0; i < formattedMessages.length; i++) {
  if (formattedMessages[i].isActivityStart || formattedMessages[i].isActivityEnd) {
    continue;
  }
  const currentActivity = formattedMessages[i].activity_type;
  if (currentActivity && currentActivity !== 'chat' && currentActivity !== 'voice_note' && currentActivity !== 'image_gen' && currentActivity !== 'image_describe' && currentActivity !== 'voice_call') {
    const prevMessage = formattedMessages[i - 1];
    const nextMessage = formattedMessages[i + 1];
    
    formattedMessages[i].isActivityStart = (!prevMessage || prevMessage.activity_type !== currentActivity);
    formattedMessages[i].isActivityEnd = (!nextMessage || nextMessage.activity_type !== currentActivity);
  } else {
    formattedMessages[i].isActivityStart = false;
    formattedMessages[i].isActivityEnd = false;
  }
}
console.log(formattedMessages.map(m => `${m.activity_type}: start=${m.isActivityStart}, end=${m.isActivityEnd}`));
