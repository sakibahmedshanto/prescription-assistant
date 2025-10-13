# JSON Conversation Upload Guide

## 🎯 Simple JSON Upload Button

A minimal, clean button to upload doctor-patient conversations in JSON format.

---

## 📍 Location

The **"Upload JSON"** button is located at the top with other action buttons:

```
┌────────────────────────────────────────────┐
│  🏥 Prescription Assistant                 │
└────────────────────────────────────────────┘
         ↓
┌─────────────┬──────────────┬─────────────┐
│ Upload JSON │ Export Data  │ Clear All   │
│  (Purple)   │   (Blue)     │   (Red)     │
└─────────────┴──────────────┴─────────────┘
```

---

## 🚀 How to Use

### **Step 1: Generate JSON with ChatGPT**

Ask ChatGPT:
```
"Generate a doctor-patient conversation in JSON format about fever and headache. 
Use this structure: 
{
  "conversation": [
    { "speaker": "Doctor", "text": "..." },
    { "speaker": "Patient", "text": "..." }
  ]
}
Include 5-7 exchanges."
```

### **Step 2: Save the JSON**

Copy ChatGPT's response and save as: `conversation.json`

### **Step 3: Upload**

1. Click **"Upload JSON"** button (purple)
2. Select your JSON file
3. Conversation loads automatically!

### **Step 4: Generate Medicine Suggestions**

1. Click **"Differential Diagnosis"** → **"Generate"**
2. Wait 1 second
3. **"Suggested Medicines"** tab appears automatically!
4. See Bangladesh medicines with full details

---

## 📝 JSON Format

```json
{
  "conversation": [
    {
      "speaker": "Doctor",
      "text": "Hello, what brings you in today?"
    },
    {
      "speaker": "Patient",
      "text": "I have fever and headache for 2 days."
    },
    {
      "speaker": "Doctor",
      "text": "I will prescribe paracetamol."
    }
  ]
}
```

### **Rules:**
- Must have `"conversation"` array
- Each item must have `"speaker"` (Doctor or Patient)
- Each item must have `"text"` (the message)
- Speaker must be exactly `"Doctor"` or `"Patient"` (case-sensitive)

---

## 📚 Example JSON Files

I've created 3 example files for you in `example-conversations/`:

### **1. fever-headache.json**
- Condition: Fever & Headache
- Expected medicines: Paracetamol
- 9 exchanges

### **2. diabetes.json**
- Condition: Type 2 Diabetes
- Expected medicines: Metformin
- 9 exchanges

### **3. hypertension.json**
- Condition: High Blood Pressure
- Expected medicines: Amlodipine
- 11 exchanges

---

## 🧪 Quick Test

```bash
# 1. Start app
npm run dev

# 2. Open http://localhost:3000

# 3. Click "Upload JSON" button

# 4. Select: example-conversations/fever-headache.json

# 5. See conversation load!

# 6. Click "Differential Diagnosis" → "Generate"

# 7. See "Suggested Medicines" tab with Paracetamol!
```

---

## 💡 ChatGPT Prompts

### **For Fever:**
```
Generate a doctor-patient conversation in JSON format about a patient with high fever and headache. Use the structure: { "conversation": [{ "speaker": "Doctor", "text": "..." }, { "speaker": "Patient", "text": "..." }] }. Include symptoms, examination, diagnosis, and medication prescription. 7-9 exchanges.
```

### **For Diabetes:**
```
Generate a doctor-patient conversation in JSON format about a patient with suspected diabetes (increased thirst, frequent urination). Use the structure: { "conversation": [{ "speaker": "Doctor", "text": "..." }, { "speaker": "Patient", "text": "..." }] }. Include blood sugar results and Metformin prescription. 7-9 exchanges.
```

### **For Hypertension:**
```
Generate a doctor-patient conversation in JSON format about a patient with high blood pressure and headaches. Use the structure: { "conversation": [{ "speaker": "Doctor", "text": "..." }, { "speaker": "Patient", "text": "..." }] }. Include BP measurement (150/95) and medication prescription. 7-9 exchanges.
```

### **For Gastric Issues:**
```
Generate a doctor-patient conversation in JSON format about a patient with stomach pain and acidity. Use the structure: { "conversation": [{ "speaker": "Doctor", "text": "..." }, { "speaker": "Patient", "text": "..." }] }. Include diagnosis of gastritis and PPI prescription. 7-9 exchanges.
```

---

## ✅ Benefits

1. **⚡ Fast** - Generate conversations with ChatGPT instantly
2. **🎯 Precise** - Control exact conversation content
3. **🔄 Reusable** - Save and reuse conversations
4. **📝 Customizable** - Any medical scenario
5. **🧪 Perfect for Testing** - Quick medicine validation
6. **💊 Accurate** - Test specific conditions and medicines

---

## 🛠️ Technical Details

### **File:** `app/components/ConversationJsonUpload.tsx`

- Simple button component
- File input (hidden, triggered by button)
- JSON validation
- Automatic conversion to TranscriptionSegment
- Alert-based error handling
- Purple theme matching UI

### **Integration:** `app/page.tsx`

- Placed in action buttons row
- `handleLoadJsonConversation` function
- Clears existing data when loading
- Resets analyses state

---

## ❌ Error Handling

### **Invalid JSON:**
```
Alert: "Failed to parse JSON file"
```
→ Check JSON syntax with a validator

### **Wrong Format:**
```
Alert: "Invalid JSON format. Expected { conversation: [...] }"
```
→ Ensure you have a "conversation" array

### **Wrong Speaker:**
```
Alert: "Invalid speaker 'doctor'. Must be 'Doctor' or 'Patient'"
```
→ Use exact capitalization: "Doctor" or "Patient"

### **Missing Fields:**
```
Alert: "Invalid segment at index 0"
```
→ Each item needs both "speaker" and "text"

---

## 📊 Workflow Diagram

```
ChatGPT
   ↓
Generate JSON
   ↓
Save as .json file
   ↓
Click "Upload JSON" button
   ↓
Select file
   ↓
✨ Conversation loads
   ↓
Generate Diagnosis
   ↓
💊 See Medicines!
```

---

## 🎉 Summary

**Simple, minimal JSON upload:**
- ✅ Single purple button
- ✅ No complex UI
- ✅ Instant conversation loading
- ✅ Works with ChatGPT
- ✅ Perfect for testing
- ✅ Clean and professional

**Test medicine suggestions in under 1 minute!** 🚀

---

**Files:**
- ✅ Component: `app/components/ConversationJsonUpload.tsx`
- ✅ Example 1: `example-conversations/fever-headache.json`
- ✅ Example 2: `example-conversations/diabetes.json`
- ✅ Example 3: `example-conversations/hypertension.json`
- ✅ Guide: `JSON_UPLOAD_GUIDE.md` (this file)

