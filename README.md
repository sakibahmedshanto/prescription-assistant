# 🏥 Prescription Assistant

AI-powered medical conversation transcription and analysis system with **AssemblyAI's superior speaker diarization (95%+ accuracy)**.

---

## ⚡ Quick Start (3 Minutes)

### **1. Get AssemblyAI API Key**
- Sign up: https://www.assemblyai.com/
- Free tier: **5 hours/month**
- Copy your API key from dashboard

### **2. Configure**
```bash
# Open .env file and add your API key:
ASSEMBLYAI_API_KEY=your-api-key-here
```

### **3. Run**
```bash
npm install
npm run dev
```

### **4. Open**
```
http://localhost:3000
```

**📖 Detailed Setup Guide:** [SETUP_ASSEMBLYAI.md](./SETUP_ASSEMBLYAI.md)

---

## ✅ Features

### **🧠 AssemblyAI Integration**
- **95%+ accuracy** speaker diarization (Doctor/Patient)
- **Medical vocabulary boost** for enhanced recognition
- **Professional formatting** with punctuation and capitalization
- **Confidence scores** for each transcription segment
- **Superior to Google Cloud** Speech-to-Text

### **🎯 Medical Analysis (OpenAI)**
- **Conversation summary** - key points extraction
- **Symptom detection** - identify patient symptoms
- **Diagnosis suggestions** - AI-powered insights
- **Prescription recommendations** - medication suggestions
- **Follow-up instructions** - next steps for patient care

### **🔄 Real-Time Features**
- **Live transcription** as you speak
- **Speaker detection** automatically identifies Doctor vs Patient
- **Voice training** for improved accuracy
- **Export functionality** save transcriptions and analysis

---

## 🎯 How It Works

```
🎤 Record Conversation → 🧠 AssemblyAI Transcription → 📝 Speaker Separation → 🤖 OpenAI Analysis → 📋 Medical Report
```

1. **Record**: Click "Start Recording" and have your medical consultation
2. **Transcribe**: AssemblyAI processes audio with 95%+ speaker accuracy
3. **Separate**: System automatically identifies Doctor and Patient
4. **Analyze**: OpenAI generates medical analysis and suggestions
5. **Export**: Download complete transcription and analysis

---

## 📊 Why AssemblyAI?

| Feature | AssemblyAI | Google Cloud |
|---------|-----------|--------------|
| **Speaker Accuracy** | **95%+** ✅ | 85-90% |
| **Medical Terms** | **Enhanced Boost** ✅ | Basic |
| **Setup** | **Simple API Key** ✅ | Complex JSON |
| **Cost** | **$2.34/hour** ✅ | $2.88/hour |
| **Free Tier** | **5 hours/month** ✅ | $300 credit |
| **Processing** | **Fast & Reliable** ✅ | Variable |

---

## 🛠️ Technology Stack

### **Frontend**
- **Next.js 15** - React framework
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **Lucide React** - Icons

### **AI Services**
- **AssemblyAI** - Speech-to-text with speaker diarization
- **OpenAI GPT-4** - Medical analysis and suggestions

### **Real-Time**
- **WebSocket** - Live audio streaming
- **MediaRecorder API** - Browser audio capture
- **Axios** - HTTP client for API calls

---

## 📁 Project Structure

```
prescription-assistant/
├── app/
│   ├── api/
│   │   ├── transcribe-assemblyai/   # AssemblyAI transcription endpoint
│   │   └── analyze/                 # OpenAI analysis endpoint
│   ├── components/
│   │   ├── TranscriptionDisplay.tsx # Show transcriptions
│   │   ├── MedicalAnalysis.tsx      # Show AI analysis
│   │   ├── RecordingControls.tsx    # Recording UI
│   │   └── VoiceTraining.tsx        # Voice calibration
│   ├── hooks/
│   │   ├── useAudioRecorder.ts      # Audio recording logic
│   │   └── useAssemblyAITranscription.ts # Real-time transcription
│   ├── types/
│   │   └── index.ts                 # TypeScript types
│   └── page.tsx                     # Main application page
├── websocket-server-assemblyai-rest.js # Real-time WebSocket server
├── .env                             # Environment variables (API keys)
├── SETUP_ASSEMBLYAI.md             # Detailed setup guide
└── README.md                        # This file
```

---

## 🚀 Available Scripts

### **Development**
```bash
npm run dev                # Start Next.js app only
npm run dev:assemblyai-rest # Start WebSocket + Next.js (real-time)
```

### **Production**
```bash
npm run build              # Build for production
npm run start              # Start production server
npm run start:assemblyai-rest # Start WebSocket + production server
```

### **Individual Services**
```bash
npm run ws:assemblyai-rest # Start WebSocket server only
```

---

## ⚙️ Configuration

### **Required Environment Variables**

```env
# AssemblyAI API Key (Required)
# Get from: https://www.assemblyai.com/app
ASSEMBLYAI_API_KEY=your-assemblyai-api-key

# OpenAI API Key (Required for analysis)
# Get from: https://platform.openai.com/api-keys
OPENAI_API_KEY=your-openai-api-key
```

### **Optional Configuration**
```env
NODE_ENV=development
```

---

## 🎓 Usage Guide

### **Basic Workflow**

1. **Open application**: http://localhost:3000
2. **Click "Start Recording"**: Begin medical consultation
3. **Speak naturally**: System detects Doctor and Patient automatically
4. **Click "Stop Recording"**: End consultation (wait 10-30 seconds)
5. **View transcription**: See Doctor/Patient segments with high accuracy
6. **Click "Generate Analysis"**: Get AI-powered medical insights
7. **Export data**: Download complete transcription and analysis

### **Best Practices**

#### **For Better Accuracy**
- ✅ Use quality microphone
- ✅ Speak clearly and enunciate medical terms
- ✅ Minimize background noise
- ✅ Avoid talking over each other
- ✅ Each speaker should speak for 30+ seconds

#### **For Medical Consultations**
- ✅ Doctor speaks first to establish primary speaker
- ✅ Use medical terminology naturally
- ✅ Ask clear, structured questions
- ✅ Give detailed patient responses
- ✅ Professional tone from both speakers

---

## 💰 Pricing

### **AssemblyAI**
- **Free**: 5 hours/month
- **Starter**: $0.00065/second (~$2.34/hour)
- **Growth**: $0.00045/second (~$1.62/hour)

### **OpenAI GPT-4**
- **Input**: $2.50 per 1M tokens
- **Output**: $10.00 per 1M tokens
- **Typical**: ~$0.01-0.05 per analysis

### **Example Monthly Costs**
- **100 consultations** (10 min each): ~$21/month
- **250 consultations** (10 min each): ~$46/month
- **500 consultations** (10 min each): ~$86/month

---

## 🔧 Troubleshooting

### **Common Issues**

#### **"ASSEMBLYAI_API_KEY environment variable is required"**
```bash
# Check your .env file
cat .env | grep ASSEMBLYAI

# Should show: ASSEMBLYAI_API_KEY=your-key-here
# If missing, add it and restart: npm run dev
```

#### **"Failed to transcribe audio"**
- ✅ Verify API key is correct
- ✅ Check internet connection
- ✅ Ensure microphone permissions granted
- ✅ Check AssemblyAI usage: https://www.assemblyai.com/app

#### **"Poor speaker detection"**
- ✅ Speak for longer (30+ seconds per speaker)
- ✅ Use medical terminology
- ✅ Improve audio quality
- ✅ Reduce background noise
- ✅ Avoid overlapping speech

---

## 📞 Support

### **Resources**
- **Setup Guide**: [SETUP_ASSEMBLYAI.md](./SETUP_ASSEMBLYAI.md)
- **AssemblyAI Docs**: https://www.assemblyai.com/docs
- **AssemblyAI Dashboard**: https://www.assemblyai.com/app
- **OpenAI Docs**: https://platform.openai.com/docs

### **Get Help**
1. Check [SETUP_ASSEMBLYAI.md](./SETUP_ASSEMBLYAI.md) for detailed instructions
2. Verify API keys in `.env` file
3. Check AssemblyAI dashboard for usage/errors
4. Review browser console for error messages

---

## 📝 License

MIT License - see LICENSE file for details

---

## ⚠️ Disclaimer

**This tool is for clinical decision support only.**

- ✅ Always verify AI-generated suggestions
- ✅ Use as supplementary tool, not primary diagnostic
- ✅ Follow medical best practices and regulations
- ✅ Ensure patient privacy and data security
- ✅ Comply with HIPAA and local healthcare regulations

---

## 🎉 Quick Start Reminder

```bash
# 1. Get API key from https://www.assemblyai.com/
# 2. Add to .env file: ASSEMBLYAI_API_KEY=your-key
# 3. Install and run:
npm install
npm run dev
# 4. Open http://localhost:3000
```

**🏥 Start transcribing medical consultations with 95%+ accuracy! 🧠**