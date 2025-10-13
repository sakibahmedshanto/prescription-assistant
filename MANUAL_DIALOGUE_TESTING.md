# Manual Dialogue Input - Testing Guide

## 🎯 Purpose

A **manual dialogue adding system** for quickly testing medicine suggestions without recording audio!

---

## 📝 What It Is

The Manual Dialogue Input component allows you to:
- ✅ **Type conversations** manually instead of recording
- ✅ **Use quick templates** with pre-written scenarios
- ✅ **Test medicine suggestions** instantly
- ✅ **Switch between Doctor/Patient** with one click
- ✅ **Add segments** with Ctrl+Enter shortcut

Perfect for development and testing! 🚀

---

## 📍 Location

You'll find it right below the Recording Controls on the main page:

```
┌─────────────────────────────────────────────────┐
│  🎤 Recording Controls                          │
└─────────────────────────────────────────────────┘
         ↓
┌─────────────────────────────────────────────────┐
│  📝 Manual Dialogue Input (Testing)             │  ← HERE!
└─────────────────────────────────────────────────┘
         ↓
┌─────────────────────────────────────────────────┐
│  Transcription Display                          │
└─────────────────────────────────────────────────┘
```

---

## 🎨 Interface

```
╔══════════════════════════════════════════════════════════╗
║  📝 Manual Dialogue Input (Testing)                      ║
║  ┌─────────────────────┐  ┌────────┐  ┌──────────┐      ║
║  │ Quick Templates     │  │ Clear  │                     ║
║  └─────────────────────┘  └────────┘                     ║
╠══════════════════════════════════════════════════════════╣
║  ┌────────────┐  ┌────────────┐                         ║
║  │ 👨‍⚕️ Doctor │  │ 🤒 Patient │                         ║
║  └────────────┘  └────────────┘                         ║
║                                                          ║
║  ┌────────────────────────────────────────┐  ┌────────┐ ║
║  │ Type message here...                   │  │ + Add  │ ║
║  │                                        │  └────────┘ ║
║  │                                        │             ║
║  └────────────────────────────────────────┘             ║
║                                                          ║
║  💡 Tip: Press Ctrl + Enter to quickly add             ║
║                                                          ║
║  ┌────────────────────────────────────────────────────┐ ║
║  │ Current Conversation (5 segments):                 │ ║
║  │ Doctor: Hello, what brings you in today?          │ ║
║  │ Patient: I have fever and headache...             │ ║
║  └────────────────────────────────────────────────────┘ ║
╚══════════════════════════════════════════════════════════╝
```

---

## 🚀 How to Use

### **Method 1: Quick Templates (Fastest!)**

1. Click **"Quick Templates"** button
2. See 5 pre-written scenarios:
   - 🤒 **Fever & Headache**
   - 💉 **Diabetes Check**
   - 🤧 **Common Cold**
   - 💊 **Hypertension**
   - 🔥 **Gastric Problem**
3. Click any template
4. Entire conversation loads instantly!
5. Click "Differential Diagnosis" → "Generate"
6. See medicine suggestions! 💊

### **Method 2: Manual Entry**

1. **Select Speaker:**
   - Click **"👨‍⚕️ Doctor"** or **"🤒 Patient"**

2. **Type Message:**
   - Type in the text area
   - Press **Ctrl+Enter** or click **"+ Add"**

3. **Repeat:**
   - Switch speaker
   - Add next message
   - Build conversation

4. **Generate Analysis:**
   - Once conversation is complete
   - Click "Differential Diagnosis" → "Generate"
   - See medicine suggestions!

---

## 📋 Quick Templates

### **1. Fever & Headache**
```
Doctor: Hello, what brings you in today?
Patient: I have had a high fever and severe headache for the past 2 days.
Doctor: Any other symptoms? Body aches, cough, or sore throat?
Patient: Yes, I have body aches and feel very weak.
Doctor: I will prescribe some medication for the fever and pain relief.
```
**Expected Medicines:** Paracetamol, NSAIDs, Analgesics

---

### **2. Diabetes Check**
```
Doctor: How are you feeling today?
Patient: I have been feeling very tired and thirsty all the time.
Doctor: Have you noticed increased urination or blurred vision?
Patient: Yes, I urinate frequently, especially at night.
Doctor: Based on your symptoms, I recommend checking your blood sugar...
```
**Expected Medicines:** Metformin, Diabetes medications

---

### **3. Common Cold**
```
Doctor: What seems to be the problem?
Patient: I have a runny nose, sneezing, and cough for 3 days.
Doctor: Any fever or chest pain?
Patient: Mild fever, no chest pain.
Doctor: This appears to be a common cold...
```
**Expected Medicines:** Antihistamines, Cough medicine, Decongestants

---

### **4. Hypertension**
```
Doctor: How has your blood pressure been?
Patient: I have been having headaches and dizziness lately.
Doctor: Let me check your blood pressure. It is 150/95, which is high.
Patient: Is that serious?
Doctor: Yes, you have hypertension...
```
**Expected Medicines:** Amlodipine, Blood pressure medications

---

### **5. Gastric Problem**
```
Doctor: What symptoms are you experiencing?
Patient: I have severe stomach pain and acidity after eating.
Doctor: How long have you had these symptoms?
Patient: For about a week now, especially at night.
Doctor: This sounds like gastritis...
```
**Expected Medicines:** Omeprazole, Antacids, PPIs

---

## ⌨️ Keyboard Shortcuts

- **Ctrl + Enter**: Add current message
- Click **Doctor/Patient** buttons to switch speaker

---

## 🎯 Testing Workflow

### **Complete Test in 4 Steps:**

```
1. Click "Quick Templates"
   ↓
2. Select "Fever & Headache"
   ↓
3. Click "Differential Diagnosis" → "Generate"
   ↓
4. Wait 1 second → See "Suggested Medicines" tab!
   → [15] badge appears
   → Medicine cards display
   → All CSV data shown! ✨
```

**Total time: ~10 seconds!** ⚡

---

## 📊 Features

### **1. Speaker Selection**
- 👨‍⚕️ **Doctor** - Blue button when active
- 🤒 **Patient** - Green button when active
- One-click switching

### **2. Text Input**
- Multi-line textarea
- Supports long messages
- Clear placeholder text
- Ctrl+Enter shortcut

### **3. Quick Templates**
- 5 pre-written scenarios
- Medical conditions covered:
  - Fever/Headache
  - Diabetes
  - Common Cold
  - Hypertension
  - Gastric issues
- Instant conversation loading

### **4. Conversation Preview**
- Shows last 5 segments
- Color-coded speakers:
  - 🔵 Doctor (blue)
  - 🟢 Patient (green)
- Shows total segment count
- Truncates long messages

### **5. Clear Function**
- "Clear All" button
- Removes all segments
- Clears analyses
- Fresh start

---

## 💡 Best Practices

### **For Testing Medicine Suggestions:**

1. **Use Quick Templates** - Fastest way
2. **Include symptoms** - Helps AI identify medicines
3. **Mention diagnosis** - Improves accuracy
4. **Complete conversation** - 3-5 exchanges minimum
5. **Generate diagnosis first** - Then medicines auto-appear

### **Writing Custom Dialogues:**

```
Good Example:
Doctor: "What's wrong?"
Patient: "I have fever and headache for 2 days."
Doctor: "Any other symptoms?"
Patient: "Yes, body aches."
Doctor: "I'll prescribe paracetamol."
```

```
Poor Example:
Doctor: "Hi"
Patient: "Hi"
Doctor: "Okay"
Patient: "Thanks"
```
*(Too vague, no medical info)*

---

## 🔧 Integration

### **Works With:**
- ✅ Transcription Display
- ✅ Medical Analysis
- ✅ Medicine Suggestions
- ✅ All analysis types
- ✅ Export functionality

### **Seamless Experience:**
- Manual segments appear in Transcription Display
- Can mix manual + recorded segments
- All analyses work normally
- Export includes manual segments

---

## 🎨 Visual Design

### **Colors:**
- **Blue** - Doctor button
- **Green** - Patient button
- **Purple** - Quick Templates button
- **Red** - Clear All button
- **Gray** - Inactive states

### **Layout:**
- Compact header with buttons
- Clear speaker selection
- Large text input area
- Helpful tips
- Live preview at bottom

---

## 📝 Example Use Cases

### **1. Quick Medicine Test**
```
1. Load "Fever & Headache" template
2. Generate diagnosis
3. See Paracetamol suggestions
4. Verify CSV data displayed
```

### **2. Custom Scenario Test**
```
1. Type: Doctor - "Patient has diabetes"
2. Type: Patient - "High blood sugar"
3. Type: Doctor - "Prescribe metformin"
4. Generate → See diabetes medicines
```

### **3. Multiple Conditions Test**
```
1. Load "Gastric Problem" template
2. Add more: "Also has headache"
3. Generate → See multiple medicine types
```

---

## 🚀 Quick Start

```bash
# 1. Start app
npm run dev

# 2. Open browser
http://localhost:3000

# 3. Find Manual Dialogue Input
   (Below Recording Controls)

# 4. Click "Quick Templates"

# 5. Select "Fever & Headache"

# 6. Click "Differential Diagnosis" → "Generate"

# 7. Wait 1 second

# 8. 🎉 See "Suggested Medicines" tab!
   → [15] badge
   → Medicine cards
   → All working!
```

---

## ⚡ Speed Comparison

| Method | Time to Test |
|--------|-------------|
| **Audio Recording** | ~2-3 minutes |
| **Manual Input** | ~30 seconds |
| **Quick Template** | ~10 seconds ⚡ |

**Quick Templates = 18x faster!** 🚀

---

## ✅ Benefits

1. ⚡ **Speed** - Test in seconds, not minutes
2. 🎯 **Precision** - Control exact conversation
3. 🔄 **Repeatability** - Same scenario every time
4. 🧪 **Testing** - Perfect for development
5. 📝 **Documentation** - Clear examples
6. 🎨 **Customization** - Write any scenario
7. 💊 **Medicine Focus** - Test specific conditions

---

## 🎉 Summary

The Manual Dialogue Input system provides:

✨ **Quick Templates** - 5 pre-written medical scenarios  
✨ **Manual Entry** - Type custom conversations  
✨ **Keyboard Shortcuts** - Ctrl+Enter to add  
✨ **Live Preview** - See conversation build  
✨ **Seamless Integration** - Works with all features  
✨ **Perfect for Testing** - 18x faster than recording  

**Test medicine suggestions in 10 seconds!** 🚀

---

## 📚 Files

- ✅ `app/components/ManualDialogueInput.tsx` - Component
- ✅ `app/page.tsx` - Integration
- ✅ `MANUAL_DIALOGUE_TESTING.md` - This guide

---

**Happy Testing!** 🧪💊

