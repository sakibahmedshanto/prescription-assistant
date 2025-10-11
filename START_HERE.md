# 🚀 START HERE - Quick Setup in 5 Steps

Follow these steps in order to get your Prescription Assistant running.

---

## Step 1: Fix NPM and Install Dependencies

Open your terminal and run these commands:

```bash
# Fix npm cache permissions (enter your password when asked)
sudo chown -R $(whoami) ~/.npm

# Navigate to project directory
cd /Users/sakibahmed/thesis/prescription-assistant

# Install all dependencies
npm install
```

**Expected result**: Should install successfully without errors.

If you still get errors, try:
```bash
rm -rf node_modules package-lock.json
npm install
```

---

## Step 2: Set Up Google Cloud Speech-to-Text

### Quick Steps:

1. **Visit**: https://console.cloud.google.com/
2. **Create Project**: 
   - Click project dropdown → "New Project"
   - Name: `prescription-assistant`
   - Click "Create"

3. **Enable API**:
   - Go to "APIs & Services" → "Library"
   - Search: "Speech-to-Text"
   - Click "Enable"

4. **Create Service Account**:
   - Go to "IAM & Admin" → "Service Accounts"
   - Click "Create Service Account"
   - Name: `prescription-assistant`
   - Role: "Cloud Speech Client"
   - Click "Done"

5. **Download Credentials**:
   - Click on your service account
   - Go to "Keys" tab
   - Click "Add Key" → "Create new key" → "JSON"
   - Download the JSON file (save it safely!)

6. **Minify the JSON**:
   - Go to: https://www.text-utils.com/json-formatter/
   - Paste your JSON
   - Click "Minify"
   - Copy the result (it will be one line)

**Save these values** for Step 4:
- `project_id` from the JSON file
- The minified JSON (entire thing as one line)

---

## Step 3: Set Up OpenAI API

### Quick Steps:

1. **Visit**: https://platform.openai.com/
2. **Sign up** or **Log in**
3. **Add Payment Method**: https://platform.openai.com/account/billing
4. **Create API Key**:
   - Go to: https://platform.openai.com/api-keys
   - Click "Create new secret key"
   - Name: `prescription-assistant`
   - **COPY THE KEY IMMEDIATELY** (starts with `sk-`)
   - Store it safely for Step 4

---

## Step 4: Create `.env` File

In your project root, create a file named `.env`:

```bash
touch .env
```

Open it in your editor and paste this template:

```env
# Google Cloud Configuration
GOOGLE_CLOUD_PROJECT_ID=paste-your-project-id-here
GOOGLE_CLOUD_CREDENTIALS=paste-minified-json-here-as-one-line

# OpenAI Configuration
OPENAI_API_KEY=sk-paste-your-key-here

# Application Configuration
NODE_ENV=development
```

**Fill in the values**:
- `GOOGLE_CLOUD_PROJECT_ID`: The `project_id` from your Google JSON (e.g., `prescription-assistant-12345`)
- `GOOGLE_CLOUD_CREDENTIALS`: The ENTIRE minified JSON from Step 2
- `OPENAI_API_KEY`: The key from Step 3 (starts with `sk-`)

### Example `.env` file:

```env
GOOGLE_CLOUD_PROJECT_ID=prescription-assistant-12345
GOOGLE_CLOUD_CREDENTIALS={"type":"service_account","project_id":"prescription-assistant-12345","private_key_id":"abc123","private_key":"-----BEGIN PRIVATE KEY-----\nXXX\n-----END PRIVATE KEY-----\n","client_email":"prescription-assistant@prescription-assistant-12345.iam.gserviceaccount.com"}
OPENAI_API_KEY=sk-proj-abc123xyz789
NODE_ENV=development
```

**Important**: 
- No spaces around the `=` sign
- Google credentials MUST be ONE continuous line
- Don't add extra quotes around the values

---

## Step 5: Verify Setup and Run

### Test your setup:

```bash
npm run test:setup
```

This will check if everything is configured correctly.

### If all checks pass, start the app:

```bash
npm run dev
```

### Open your browser:

```
http://localhost:3000
```

You should see the Prescription Assistant interface! 🎉

---

## 🎯 What You Should See

When you open http://localhost:3000:

1. **Recording Controls** section with a timer and "Start Recording" button
2. **Real-Time Transcription** panel (empty until you record)
3. **Medical Analysis & Suggestions** panel with different tabs

---

## 🧪 Test the System

1. **Click "Start Recording"**
   - Grant microphone permission when asked
   - Say something like: "Doctor: Hello, how can I help? Patient: I have a headache."

2. **Click "Stop & Process"**
   - Wait a few seconds
   - You should see the transcription appear with "Doctor" and "Patient" labels

3. **Click "Generate" in the Analysis panel**
   - Try the "Medical Summary" tab
   - Wait for the AI analysis to appear

---

## ❌ Troubleshooting

### "Module not found: lucide-react"

```bash
npm install
```

### "Failed to transcribe audio"

Check your `.env` file:
- Is `GOOGLE_CLOUD_CREDENTIALS` on ONE line?
- Is `GOOGLE_CLOUD_PROJECT_ID` correct?
- Go to Google Cloud Console and verify the API is enabled

### "OpenAI API error"

Check your `.env` file:
- Does `OPENAI_API_KEY` start with `sk-`?
- Is billing set up in OpenAI?
- No extra spaces in the API key?

### "Microphone not working"

- Grant microphone permission in your browser
- Check browser settings (Chrome/Edge work best)
- Make sure no other app is using the microphone

### Development server won't start

```bash
# Clear cache and restart
rm -rf .next
npm run dev
```

---

## 📚 Documentation

Once you have everything running, check out these docs:

- **QUICKFIX.md** - Quick troubleshooting tips
- **INSTALLATION.md** - Detailed installation guide
- **README.md** - Full project documentation
- **SETUP_GUIDE.md** - Advanced configuration
- **docs/API_DOCUMENTATION.md** - API reference
- **docs/ARCHITECTURE.md** - System architecture

---

## 💰 Cost Estimates

### Google Cloud Speech-to-Text
- **First 60 minutes/month**: FREE ✅
- After that: ~$0.024 per minute
- 100 consultations (~10 min each) = ~$0 to $25/month

### OpenAI API (GPT-4)
- ~$0.05 to $0.20 per analysis
- 100 consultations (5 analyses each) = ~$25 to $100/month

**Total estimated cost for moderate use**: $25-125/month

Set up billing alerts!

---

## 🔒 Security Reminder

- ✅ Never commit `.env` file (it's already in `.gitignore`)
- ✅ Never share your API keys
- ✅ Keep the Google JSON file secure
- ✅ This is a development setup - production needs more security!

---

## ✅ Checklist

Before you start:
- [ ] NPM cache fixed and dependencies installed
- [ ] Google Cloud project created
- [ ] Speech-to-Text API enabled
- [ ] Service account created and JSON downloaded
- [ ] JSON minified to one line
- [ ] OpenAI account created
- [ ] Payment method added to OpenAI
- [ ] OpenAI API key created
- [ ] `.env` file created with all three credentials
- [ ] `npm run test:setup` passes ✅
- [ ] `npm run dev` starts successfully
- [ ] Can open http://localhost:3000

---

## 🆘 Need Help?

1. Run the setup test: `npm run test:setup`
2. Check the error messages carefully
3. Review QUICKFIX.md for common issues
4. Check INSTALLATION.md for detailed steps
5. Verify your `.env` file format

---

## 🎊 Success!

If everything is working:
1. You can record doctor-patient conversations
2. Get real-time transcription with speaker labels
3. Generate AI-powered medical analysis
4. Export data as JSON

**You're ready to start using your Prescription Assistant!** 🏥

Happy coding! 🚀

