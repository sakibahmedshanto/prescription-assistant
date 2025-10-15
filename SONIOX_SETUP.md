# 🚀 Soniox Real-Time Transcription Setup Guide

## Overview

This guide will help you set up and use the **Soniox real-time transcription service** for your prescription assistant. Soniox provides high-quality speech-to-text with advanced features like speaker diarization, language identification, and real-time streaming.

---

## ✅ Features

### **Soniox STT Features**
- **Real-Time Streaming**: Low-latency audio transcription
- **Speaker Diarization**: Automatic speaker identification and separation
- **Language Identification**: Multi-language support with automatic detection
- **Medical Context**: Optimized for medical terminology and conversations
- **High Accuracy**: Advanced speech recognition models
- **Endpoint Detection**: Automatic speech endpoint detection

### **System Integration**
- **WebSocket Server**: Independent WebSocket server on port 8080
- **React Components**: Real-time UI with live transcription display
- **Medical Analysis**: Integration with existing medical analysis pipeline

---

## 🚀 Quick Start

### **Step 1: Get Soniox API Key**

1. Visit [console.soniox.com](https://console.soniox.com)
2. Create an account or sign in
3. Navigate to API Keys section
4. Create a new API key
5. Copy the API key for the next step

### **Step 2: Set Environment Variable**

```bash
# Set your Soniox API key
export SONIOX_API_KEY=your_api_key_here

# Verify it's set
echo $SONIOX_API_KEY
```

### **Step 3: Install Dependencies**

```bash
npm install
```

### **Step 4: Start the System**

**Option A: Start Both Servers Together**
```bash
npm run dev:soniox
```

**Option B: Start Separately**
```bash
# Terminal 1: Start Soniox WebSocket server
npm run ws:soniox

# Terminal 2: Start Next.js app
npm run dev
```

### **Step 5: Access the Soniox Interface**

Open: **http://localhost:3000/page-soniox**

---

## 🎯 How It Works

### **Architecture**
```
Browser (Frontend)
    ↓ WebSocket
WebSocket Server (Port 8080)
    ↓ Streaming Audio
Soniox Real-Time API
    ↓ Live Transcription
Browser (Live Updates)
```

### **Real-Time Flow**
1. **Connect**: Browser establishes WebSocket connection to local server
2. **Start Recording**: Audio captured and streamed every 1 second
3. **Soniox Processing**: Audio sent to Soniox real-time API
4. **Live Transcription**: Results streamed back with speaker identification
5. **Live Updates**: Transcription appears in real-time with speaker separation

---

## 🔧 Configuration

### **Soniox Configuration**
The system is configured with optimal settings for medical conversations:

```javascript
{
  api_key: process.env.SONIOX_API_KEY,
  model: "stt-rt-preview",
  language_hints: ["en", "es"],
  enable_language_identification: true,
  enable_speaker_diarization: true,
  context: "Medical terminology and prescription context...",
  enable_endpoint_detection: true,
  audio_format: "auto"
}
```

### **Audio Settings**
- **Format**: WebM Opus (auto-detected by Soniox)
- **Sample Rate**: 48kHz
- **Channels**: Mono
- **Streaming**: 1-second chunks for real-time processing

---

## 🎮 Usage

### **Basic Workflow**
1. **Connect**: Click "Connect" to establish WebSocket connection
2. **Start Recording**: Click "Start Live Recording" to begin transcription
3. **Speak**: Talk naturally - transcription appears in real-time
4. **Speaker Detection**: System automatically identifies different speakers
5. **Stop Recording**: Click "Stop Recording" to end the session
6. **Analyze**: Use "Analyze Conversation" for medical analysis

### **Real-Time Features**
- **Live Transcription**: See text appear as you speak
- **Speaker Labels**: Automatic "Speaker 1", "Speaker 2" identification
- **Interim Results**: See partial results while speaking
- **Final Results**: Confirmed transcription segments
- **Language Detection**: Automatic language identification per token

---

## 🔍 Troubleshooting

### **Common Issues**

#### **"SONIOX_API_KEY environment variable not set"**
```bash
# Solution: Set your API key
export SONIOX_API_KEY=your_actual_api_key
```

#### **WebSocket Connection Failed**
```bash
# Check if WebSocket server is running
ps aux | grep websocket-server-soniox

# Restart the server
npm run ws:soniox
```

#### **No Audio Input**
- Check microphone permissions in browser
- Ensure microphone is not muted
- Try refreshing the page

#### **Poor Transcription Quality**
- Speak clearly and at normal pace
- Reduce background noise
- Ensure good microphone quality
- Check internet connection stability

### **Debug Mode**
Enable debug logging by checking browser console for detailed WebSocket messages.

---

## 📊 Performance

### **Expected Performance**
- **Latency**: 2-3 seconds from speech to text
- **Accuracy**: High accuracy with medical context
- **Speaker Detection**: Automatic with 2+ speakers
- **Language Support**: English and Spanish (configurable)

### **System Requirements**
- **Browser**: Modern browser with WebSocket support
- **Internet**: Stable connection for Soniox API calls
- **Audio**: Working microphone
- **Node.js**: v16+ for WebSocket server

---

## 🔧 Advanced Configuration

### **Customizing Soniox Settings**
Edit `websocket-server-soniox.js` to modify:

```javascript
// Language hints
language_hints: ["en", "es", "fr"], // Add more languages

// Medical context
context: `
  Your custom medical context here...
  Include common medications, conditions, etc.
`,

// Audio format
audio_format: "pcm_s16le", // For raw audio
sample_rate: 16000,
num_channels: 1
```

### **Adding Translation**
```javascript
// Enable translation
translation: {
  type: "one_way",
  target_language: "es"
}
```

---

## 📚 API Reference

### **WebSocket Messages**

#### **Client to Server**
```javascript
// Start transcription stream
{
  type: "start_stream",
  config: {
    encoding: "WEBM_OPUS",
    sampleRateHertz: 48000,
    languageCode: "en-US"
  }
}

// Send audio chunk
{
  type: "audio_chunk",
  audioData: "base64_encoded_audio",
  config: { ... }
}

// Stop stream
{
  type: "stop_stream"
}
```

#### **Server to Client**
```javascript
// Transcription result
{
  type: "transcription",
  data: {
    speakerSegments: [...],
    confidence: 1.0
  },
  isFinal: false
}

// Connection status
{
  type: "connected",
  message: "Connected to Soniox transcription server"
}
```

---

## 🆘 Support

### **Getting Help**
1. Check this setup guide first
2. Review browser console for errors
3. Verify API key and environment variables
4. Test WebSocket server connectivity
5. Check Soniox documentation: [soniox.com/docs](https://soniox.com/docs)

### **Useful Links**
- [Soniox Console](https://console.soniox.com)
- [Soniox Documentation](https://soniox.com/docs)
- [WebSocket API Reference](https://soniox.com/docs/stt/rt/real-time-transcription)

---

## 🎉 Success!

You're now ready to use Soniox real-time transcription with your prescription assistant! The system provides:

- ✅ Real-time audio transcription
- ✅ Automatic speaker diarization  
- ✅ Medical context optimization
- ✅ Live streaming interface
- ✅ Integration with medical analysis

Start recording and experience high-quality, real-time medical conversation transcription!
