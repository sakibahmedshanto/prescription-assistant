# 🚀 Quick Setup Guide - AssemblyAI Prescription Assistant

## ⚡ Get Started in 3 Minutes

### **Step 1: Get Your AssemblyAI API Key** (2 minutes)

1. **Visit AssemblyAI**: https://www.assemblyai.com/
2. **Click "Start Building for Free"** or **"Sign Up"**
3. **Create your account** (email + password)
4. **Go to your Dashboard**: https://www.assemblyai.com/app
5. **Copy your API key** from the dashboard

**Free Tier Benefits:**
- ✅ **5 hours** of transcription per month
- ✅ **95%+ accuracy** speaker diarization
- ✅ **Medical vocabulary** enhancement
- ✅ **No credit card** required

---

### **Step 2: Configure Your API Key** (30 seconds)

1. **Open the `.env` file** in your project root
2. **Find this line:**
   ```env
   ASSEMBLYAI_API_KEY=
   ```
3. **Paste your API key** after the `=`:
   ```env
   ASSEMBLYAI_API_KEY=your-api-key-here
   ```
4. **Save the file**

**Example:**
```env
ASSEMBLYAI_API_KEY=a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6
```

---

### **Step 3: Start the Application** (30 seconds)

```bash
# Install dependencies (first time only)
npm install

# Start the application
npm run dev
```

**Open in browser:**
```
http://localhost:3000
```

---

## ✅ **That's It! You're Ready to Go!**

You should now see:
- 🏥 **Prescription Assistant** with **🧠 AssemblyAI** badge
- **Superior speaker diarization** (95%+ accuracy)
- **Real-time transcription** with Doctor/Patient detection
- **Medical vocabulary** enhancement

---

## 🎯 **How to Use**

### **Record a Consultation**

1. **Click "Start Recording"** button
2. **Speak clearly** - system detects Doctor and Patient automatically
3. **Click "Stop Recording"** when done
4. **Wait for transcription** - takes 10-30 seconds
5. **View results** - see Doctor/Patient segments with high accuracy

### **Generate Medical Analysis**

1. **After transcription** completes
2. **Click "Generate Analysis"** button
3. **Wait for AI processing** - takes 5-10 seconds
4. **View results**:
   - 📝 Summary
   - 🩺 Symptoms
   - 💊 Diagnosis suggestions
   - 📋 Prescription recommendations
   - 📅 Follow-up instructions

---

## 🔧 **Troubleshooting**

### **"ASSEMBLYAI_API_KEY environment variable is required"**

**Solution:**
1. Check your `.env` file exists in project root
2. Verify you pasted the API key correctly
3. Make sure there are **no spaces** before or after the key
4. **Restart the server**: Stop (Ctrl+C) and run `npm run dev` again

### **"Failed to transcribe audio"**

**Possible causes:**
1. **API key invalid** - verify your key is correct
2. **No audio recorded** - check microphone permissions
3. **Network error** - check your internet connection
4. **Free tier exceeded** - check your usage at https://www.assemblyai.com/app

### **"Poor speaker detection"**

**Tips for better accuracy:**
1. **Speak clearly** - enunciate medical terms
2. **Avoid overlap** - don't talk over each other
3. **Good audio** - use quality microphone, reduce background noise
4. **Longer segments** - each speaker should speak for 30+ seconds
5. **Medical context** - use medical terminology naturally

---

## 📊 **Features**

### **AssemblyAI Advantages**
- ✅ **95%+ accuracy** for speaker diarization
- ✅ **Medical vocabulary boost** - enhanced recognition of medical terms
- ✅ **Professional formatting** - proper punctuation and capitalization
- ✅ **Confidence scores** - see accuracy for each segment
- ✅ **Structured output** - clean Doctor/Patient segments

### **Superior to Google Cloud**
| Feature | AssemblyAI | Google Cloud |
|---------|-----------|--------------|
| **Speaker Accuracy** | **95%+** ✅ | 85-90% |
| **Medical Terms** | **Enhanced** ✅ | Basic |
| **Setup** | **Simple API Key** ✅ | Complex JSON credentials |
| **Cost** | **$2.34/hour** ✅ | $2.88/hour |
| **Free Tier** | **5 hours/month** ✅ | $300 credit |

---

## 💰 **Pricing**

### **Free Tier** (Perfect for Testing)
- **5 hours** of transcription per month
- **No credit card** required
- **Full features** included
- **95%+ accuracy**

### **Paid Plans** (If You Need More)
- **Starter**: $0.00065/second (~$2.34/hour)
- **Growth**: $0.00045/second (~$1.62/hour)
- **Scale**: Custom pricing

### **Usage Examples**
- **100 consultations/month** (10 min each): ~$16.20/month
- **250 consultations/month** (10 min each): ~$40.50/month
- **500 consultations/month** (10 min each): ~$81.00/month

---

## 🎓 **Best Practices**

### **For Medical Consultations**

1. **Doctor speaks first** - establishes doctor as primary speaker
2. **Use medical terms** - helps with vocabulary boost
3. **Clear questions** - doctor asks clear, structured questions
4. **Detailed responses** - patient gives thorough answers
5. **Professional tone** - both speakers use professional language

### **For Better Accuracy**

1. **Quality microphone** - use USB or external mic if possible
2. **Quiet environment** - minimize background noise
3. **Clear speech** - enunciate medical terminology
4. **Proper distance** - 6-12 inches from microphone
5. **No overlap** - avoid talking over each other

---

## 📞 **Need Help?**

### **AssemblyAI Resources**
- **Dashboard**: https://www.assemblyai.com/app
- **Documentation**: https://www.assemblyai.com/docs
- **API Status**: https://status.assemblyai.com/
- **Support**: support@assemblyai.com

### **Check Your Usage**
1. **Go to**: https://www.assemblyai.com/app
2. **Click "Usage"** in sidebar
3. **View your**:
   - Total transcription time used
   - Remaining free tier hours
   - Current billing period
   - Usage history

---

## 🎉 **You're All Set!**

Your prescription assistant is now powered by **AssemblyAI's superior speaker diarization technology**!

**Start recording medical consultations and experience:**
- ✅ **95%+ accuracy** speaker detection
- ✅ **Medical vocabulary** enhancement
- ✅ **Real-time transcription**
- ✅ **AI-powered analysis**
- ✅ **Professional output**

**Happy transcribing! 🏥🧠**

---

## 📝 **Quick Reference**

### **Environment Variable**
```env
ASSEMBLYAI_API_KEY=your-api-key-here
```

### **Start Application**
```bash
npm run dev
```

### **Access Application**
```
http://localhost:3000
```

### **Get API Key**
```
https://www.assemblyai.com/app
```

---

**Need the OpenAI API key too?**
- Get it from: https://platform.openai.com/api-keys
- Add to `.env`: `OPENAI_API_KEY=your-openai-key`
- Used for medical analysis and suggestions
