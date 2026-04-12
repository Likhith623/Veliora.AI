# 🎙️ NoviFE Voice Implementation

A comprehensive Text-to-Speech (TTS) system integrated with WaveSurfer.js for dynamic audio visualization, enabling personalized voice experiences for different bot personalities.

## 📋 Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Components](#components)
- [Bot Personalities](#bot-personalities)
- [API Integration](#api-integration)
- [Usage](#usage)
- [Configuration](#configuration)
- [Development](#development)
- [Troubleshooting](#troubleshooting)

## 🎯 Overview

The NoviFE voice implementation provides:

- **Dynamic TTS Generation**: Real-time audio generation for bot responses
- **Interactive Waveform Visualization**: Powered by WaveSurfer.js
- **Multi-Personality Support**: Different avatars and voice characteristics for various bot types
- **Responsive Audio Player**: Both minimal and full-featured player modes
- **Smooth Animations**: Framer Motion-powered transitions and loading states

## 🏗️ Architecture

### Core Components

```
┌─────────────────────────────────────────┐
│              PlayAudio.jsx              │
├─────────────────────────────────────────┤
│ • TTS API Integration                   │
│ • WaveSurfer.js Management             │
│ • Avatar Mapping                       │
│ • State Management                     │
│ • Audio Controls                       │
└─────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────┐
│            Backend TTS API              │
├─────────────────────────────────────────┤
│ Endpoint: /generate-audio              │
│ Input: { transcript, bot_id }          │
│ Output: { audio_base64 }               │
└─────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────┐
│            WaveSurfer.js                │
├─────────────────────────────────────────┤
│ • Waveform Rendering                   │
│ • Audio Playback Control              │
│ • Interactive Seeking                 │
│ • Real-time Progress                   │
└─────────────────────────────────────────┘
```

### Data Flow

1. **User Interaction**: User clicks play button on a bot message
2. **API Request**: Component sends POST request to TTS API with text and bot_id
3. **Audio Processing**: Backend generates audio and returns base64 encoded data
4. **Audio Conversion**: Component converts base64 to blob and creates object URL
5. **Waveform Loading**: WaveSurfer.js loads and visualizes the audio
6. **Playback Control**: User can play, pause, and seek through the audio

## 🧩 Components

### PlayAudio Component

**Location**: `src/components/PlayAudio.jsx`

**Props**:
- `text` (string): The text to convert to speech
- `bot_id` (string): Identifier for bot personality and voice
- `minimal` (boolean, optional): Whether to use minimal player UI

**Key Features**:
- Dynamic avatar selection based on bot_id
- Automatic audio generation and caching
- Interactive waveform with seek functionality
- Loading states with animated indicators
- Audio progress tracking
- Responsive design with hover effects

### Audio Processing Utilities

#### `base64ToArrayBuffer(base64)`
Converts base64 encoded audio data to ArrayBuffer for browser playback.

```javascript
function base64ToArrayBuffer(base64) {
  const binaryString = window.atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}
```

#### `formatTime(seconds)`
Formats audio duration from seconds to MM:SS format.

### Loading Components

#### `LoadingWaveform`
Animated bars simulating waveform loading with staggered motion effects.

#### `LoadingDots`
Pulsing dots indicating audio generation in progress.

## 🤖 Bot Personalities

The system supports multiple bot personalities, each with unique avatars and characteristics:

### Regional Personalities

#### Delhi Bots
- **delhi_mentor_male**: Yash Oberoi - Sophisticated businessman, 50 years old
- **delhi_mentor_female**: Kalpana Roy - Businesswoman with cultural sophistication
- **delhi_friend_male**: Casual friend personality
- **delhi_friend_female**: Friendly conversationalist
- **delhi_romantic_male**: Romantic companion
- **delhi_romantic_female**: Romantic companion

#### Japanese Bots
- **japanese_mentor_male**: Wise mentor with Japanese cultural insights
- **japanese_mentor_female**: Female mentor with Japanese wisdom
- **japanese_friend_male**: Friendly Japanese companion
- **japanese_friend_female**: Casual Japanese friend
- **japanese_romantic_male**: Romantic Japanese personality
- **japanese_romantic_female**: Romantic Japanese companion

#### Parisian Bots
- **parisian_mentor_male**: Sophisticated Parisian mentor
- **parisian_mentor_female**: Elegant Parisian guide
- **parisian_friend_male**: Casual Parisian friend
- **parisian_friend_female**: Friendly Parisian companion
- **parisian_romantic_male**: Romantic Parisian personality
- **parisian_romantic_female**: Romantic Parisian companion

#### Berlin Bots
- **berlin_mentor_male**: German mentor with cultural depth
- **berlin_mentor_female**: Female German mentor
- **berlin_friend_male**: Casual Berlin friend
- **berlin_friend_female**: Friendly Berlin companion
- **berlin_romantic_male**: Romantic Berlin personality
- **berlin_romantic_female**: Romantic Berlin companion

### Spiritual Personalities
- **Krishna**: Lord Krishna avatar with divine wisdom
- **Rama**: Lord Rama personality with righteous guidance
- **Shiva**: Lord Shiva with transformative energy
- **Trimurti**: Combined divine consciousness
- **Hanuman**: Devoted and powerful spiritual guide

### Avatar Mapping

Avatars are stored in `src/photos/` and mapped in the component:

```javascript
const avatarMap = {
  delhi_mentor_male,
  delhi_mentor_female,
  // ... other personalities
  Krishna: lord_krishna,
  Rama: rama_god,
  // ... spiritual personalities
};
```

## 🔌 API Integration

### TTS Endpoint

**URL**: `http://127.0.0.1:8000/generate-audio`
**Method**: POST
**Content-Type**: application/json

**Request Body**:
```json
{
  "transcript": "Text to convert to speech",
  "bot_id": "delhi_mentor_male"
}
```

**Response**:
```json
{
  "audio_base64": "UklGRiQBAABXQVZFZm10IBAAAAABAAEA..."
}
```

### Error Handling

The component handles various error scenarios:
- Network failures during audio generation
- Audio decoding errors
- Invalid audio data
- API timeout issues

## 🎮 Usage

### Basic Implementation

```jsx
import PlayAudio from '@/components/PlayAudio';

// Full player with waveform
<PlayAudio 
  text="Hello, how are you today?" 
  bot_id="delhi_mentor_male" 
/>

// Minimal player button
<PlayAudio 
  text="Hello, how are you today?" 
  bot_id="delhi_mentor_male" 
  minimal={true} 
/>
```

### Integration in Chat Components

```jsx
const ChatMessage = ({ message, botId }) => {
  return (
    <div className="chat-message">
      <p>{message.text}</p>
      <PlayAudio 
        text={message.text} 
        bot_id={botId}
        minimal={true}
      />
    </div>
  );
};
```

## ⚙️ Configuration

### WaveSurfer.js Configuration

The waveform visualization is configured with the following options:

```javascript
WaveSurfer.create({
  container: waveformRef.current,
  waveColor: 'rgba(255, 255, 255, 0.5)',
  progressColor: '#FF69B4',
  height: 40,
  barWidth: 2,
  barGap: 2,
  barRadius: 3,
  barHeight: 1,
  minPxPerBar: 1,
  fillParent: true,
  responsive: true,
  cursorWidth: 0,
  normalize: true,
  partialRender: true,
  interact: true,
  hideScrollbar: true,
  autoCenter: true,
  dragToSeek: true
});
```

### Styling Configuration

The component uses:
- **Tailwind CSS** for utility-based styling
- **Framer Motion** for animations and transitions
- **Custom gradients** for modern UI appearance
- **Responsive design** principles

### Animation Configuration

```javascript
// Component entrance animation
initial={{ opacity: 0, y: 10 }}
animate={{ opacity: 1, y: 0 }}
transition={{ duration: 0.3, ease: "easeOut" }}

// Hover effects
whileHover={{ 
  scale: 1.02,
  boxShadow: '0 10px 40px -5px rgba(0,0,0,0.15)',
  transition: { duration: 0.2 }
}}
```

## 🛠️ Development

### Prerequisites

- Node.js 18+
- Next.js 15+
- WaveSurfer.js (included in dependencies)
- Framer Motion
- Tailwind CSS

### Dependencies

```json
{
  "wavesurfer.js": "Latest",
  "framer-motion": "^11.15.0",
  "@tabler/icons-react": "^3.26.0",
  "next": "^15.2.4",
  "react": "^19.0.0"
}
```

### File Structure

```
src/
├── components/
│   └── PlayAudio.jsx          # Main voice component
├── photos/                    # Avatar images
│   ├── delhi_mentor_male.jpeg
│   ├── japanese_friend_female.jpeg
│   ├── lord_krishna.jpg
│   └── ...
└── support/
    └── prompts.js            # Bot personality definitions
```

### Adding New Bot Personalities

1. **Add Avatar Image**: Place the avatar image in `src/photos/`
2. **Import in Component**: Add import statement in PlayAudio.jsx
3. **Update Avatar Map**: Add mapping in the avatarMap object
4. **Define Personality**: Add personality prompt in `src/support/prompts.js`

```javascript
// 1. Import avatar
import new_bot_avatar from "@/photos/new_bot_avatar.jpg";

// 2. Add to avatar map
const avatarMap = {
  // ...existing mappings
  new_bot_id: new_bot_avatar,
};

// 3. Add personality in prompts.js
new_bot_id: `Your personality definition here...`
```

### Development Commands

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Run linting
npm run lint
```

### Testing Audio Functionality

1. **Start Backend**: Ensure TTS API is running on `http://127.0.0.1:8000`
2. **Test Different Bots**: Try various bot_id values
3. **Check Network Tab**: Monitor API requests and responses
4. **Verify Audio Quality**: Test with different text lengths
5. **Test Error Handling**: Simulate network failures

## 🔧 Troubleshooting

### Common Issues

#### Audio Not Playing

**Symptoms**: Click play button but no audio plays

**Solutions**:
1. Check browser console for errors
2. Verify TTS API is running and accessible
3. Ensure audio data is valid base64
4. Check browser audio permissions
5. Test with different browsers

```javascript
// Debug audio loading
console.log('Audio URL:', audioUrl);
console.log('WaveSurfer ready:', wavesurfer.current?.isReady);
```

#### Waveform Not Rendering

**Symptoms**: Play button works but waveform doesn't appear

**Solutions**:
1. Check if waveformRef is properly attached
2. Verify WaveSurfer.js is imported correctly
3. Ensure container has proper dimensions
4. Check for CSS conflicts

```javascript
// Debug waveform container
console.log('Waveform container:', waveformRef.current);
console.log('Container dimensions:', waveformRef.current?.offsetWidth);
```

#### API Connection Issues

**Symptoms**: Loading spinner never stops, network errors

**Solutions**:
1. Verify backend server is running on correct port
2. Check CORS configuration on backend
3. Ensure request format matches API expectations
4. Test API endpoint directly with curl/Postman

```bash
# Test API directly
curl -X POST http://127.0.0.1:8000/generate-audio \
  -H "Content-Type: application/json" \
  -d '{"transcript": "Hello", "bot_id": "delhi_mentor_male"}'
```

#### Avatar Images Not Loading

**Symptoms**: Default avatar shows instead of personality-specific avatar

**Solutions**:
1. Check image file paths in `src/photos/`
2. Verify import statements in component
3. Ensure avatarMap includes the bot_id
4. Check image file formats (jpg, jpeg, png)

#### Performance Issues

**Symptoms**: Slow loading, UI lag during audio playback

**Solutions**:
1. Optimize avatar image sizes
2. Implement audio caching
3. Use React.memo for performance optimization
4. Debounce rapid play/pause actions

```javascript
// Optimize with React.memo
const PlayAudio = React.memo(({ text, bot_id, minimal }) => {
  // Component logic
});
```

### Browser Compatibility

#### Supported Browsers
- Chrome 80+
- Firefox 75+
- Safari 13+
- Edge 80+

#### Known Limitations
- Safari requires user interaction before audio playback
- Some mobile browsers may have audio restrictions
- WebAudio API support required for full functionality

### Memory Management

The component properly cleans up resources:

```javascript
// Cleanup on unmount
React.useEffect(() => {
  return () => {
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl); // Free memory
    }
    if (wavesurfer.current) {
      wavesurfer.current.destroy(); // Clean WaveSurfer instance
    }
  };
}, []);
```

### Security Considerations

- Audio data is processed client-side only
- No sensitive data is cached
- Object URLs are properly revoked
- API requests use standard fetch with proper headers

## 📚 Additional Resources

- [WaveSurfer.js Documentation](https://wavesurfer-js.org/)
- [Framer Motion Documentation](https://www.framer.com/motion/)
- [Web Audio API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API)
- [Next.js Documentation](https://nextjs.org/docs)

## 🤝 Contributing

When contributing to the voice implementation:

1. **Test with Multiple Bots**: Ensure changes work across all personality types
2. **Check Mobile Compatibility**: Test on various devices and screen sizes
3. **Verify Audio Quality**: Test with different text lengths and content
4. **Maintain Performance**: Ensure smooth animations and quick loading
5. **Update Documentation**: Keep this README current with any changes

---

**Last Updated**: December 2024  
**Version**: 1.0.0  
**Maintainer**: NoviFE Development Team
