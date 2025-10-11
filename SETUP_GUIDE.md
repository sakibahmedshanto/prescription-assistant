# Setup Guide for Prescription Assistant

## Quick Start

### Step 1: Install Dependencies

```bash
npm install
```

### Step 2: Configure Google Cloud Speech-to-Text

#### A. Create Google Cloud Project

1. Visit [Google Cloud Console](https://console.cloud.google.com/)
2. Click "Select a project" → "New Project"
3. Enter project name: "prescription-assistant"
4. Click "Create"

#### B. Enable Speech-to-Text API

1. In the Cloud Console, go to **APIs & Services** → **Library**
2. Search for "Cloud Speech-to-Text API"
3. Click on it and press "Enable"
4. Wait for the API to be enabled (may take a minute)

#### C. Create Service Account & Download Credentials

1. Go to **IAM & Admin** → **Service Accounts**
2. Click "**+ CREATE SERVICE ACCOUNT**"
3. Fill in details:
   - **Service account name**: `prescription-assistant-sa`
   - **Service account ID**: (auto-generated)
   - Click "Create and Continue"
4. **Grant role**:
   - Select role: "Cloud Speech-to-Text API User" or "Cloud Speech Client"
   - Click "Continue" then "Done"
5. Click on the created service account
6. Go to the "**KEYS**" tab
7. Click "**ADD KEY**" → "Create new key"
8. Choose "**JSON**" format
9. Click "Create" - a JSON file will download

#### D. Configure the Credentials

Open the downloaded JSON file. It should look like this:

```json
{
  "type": "service_account",
  "project_id": "your-project-id",
  "private_key_id": "...",
  "private_key": "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n",
  "client_email": "...",
  "client_id": "...",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
  "client_x509_cert_url": "..."
}
```

### Step 3: Configure OpenAI API

1. Visit [OpenAI Platform](https://platform.openai.com/)
2. Sign up or log in
3. Go to **API Keys** section (or visit https://platform.openai.com/api-keys)
4. Click "**+ Create new secret key**"
5. Give it a name: "prescription-assistant"
6. Click "Create secret key"
7. **Copy the key immediately** (you won't be able to see it again)
8. Keep it safe for the next step

### Step 4: Create Environment File

Create a `.env` file in the root directory:

```bash
# Copy the example file
cp .env.example .env
```

Now edit the `.env` file:

```env
# Google Cloud Configuration
GOOGLE_CLOUD_PROJECT_ID=your-project-id-here
GOOGLE_CLOUD_CREDENTIALS=paste-entire-json-here-in-one-line

# OpenAI Configuration
OPENAI_API_KEY=sk-your-openai-key-here

# Application Configuration
NODE_ENV=development
```

#### Important: Format the Google Cloud Credentials

The JSON file needs to be in **one line** for the environment variable. You have two options:

**Option 1: Compress to one line manually**
```env
GOOGLE_CLOUD_CREDENTIALS={"type":"service_account","project_id":"your-project","private_key_id":"...","private_key":"-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n","client_email":"..."}
```

**Option 2: Use online JSON minifier**
1. Copy your entire JSON file content
2. Go to https://www.freeformatter.com/json-minifier.html
3. Paste and minify
4. Copy the minified JSON and paste in `.env`

### Step 5: Verify Setup

Check that your `.env` file has:
- ✅ `GOOGLE_CLOUD_PROJECT_ID` - your project ID from Google Cloud
- ✅ `GOOGLE_CLOUD_CREDENTIALS` - entire JSON in one line
- ✅ `OPENAI_API_KEY` - starts with `sk-`

### Step 6: Run the Application

```bash
npm run dev
```

Open your browser to [http://localhost:3000](http://localhost:3000)

## Testing the System

### 1. Test Audio Recording
- Click "Start Recording"
- Speak into your microphone
- Verify the timer is running
- Click "Stop & Process"

### 2. Test Transcription
- After stopping recording, wait for processing
- Check if text appears in the "Real-Time Transcription" panel
- Verify speaker labels (Doctor/Patient) are shown

### 3. Test AI Analysis
- Once transcription is complete, go to the analysis panel
- Click "Generate" on any analysis type
- Wait for the AI to process
- Review the generated medical insights

## Troubleshooting

### Issue: "Cannot find module '@google-cloud/speech'"

**Solution**: Run `npm install` again

```bash
npm install
```

### Issue: "Failed to transcribe audio" or "Authentication failed"

**Solutions**:

1. **Check credentials format**:
   - Ensure JSON is on ONE line in `.env`
   - No line breaks in the JSON
   - All quotes are properly escaped

2. **Verify API is enabled**:
   - Go to Google Cloud Console
   - Check "APIs & Services" → "Enabled APIs"
   - Speech-to-Text should be listed

3. **Check project ID**:
   - Ensure `GOOGLE_CLOUD_PROJECT_ID` matches the `project_id` in your JSON

4. **Verify service account permissions**:
   - Go to IAM & Admin → Service Accounts
   - Check your service account has "Cloud Speech Client" role

### Issue: "OpenAI API error" or "Invalid API key"

**Solutions**:

1. **Verify API key**:
   - Check it starts with `sk-`
   - No extra spaces before/after the key
   - Key is active in OpenAI dashboard

2. **Check billing**:
   - Go to OpenAI Platform → Billing
   - Ensure you have credits or payment method set up

3. **Rate limits**:
   - Check if you've hit API rate limits
   - Wait a few minutes and try again

### Issue: Microphone not working

**Solutions**:

1. **Grant permissions**:
   - Check browser permissions for microphone
   - In Chrome: Settings → Privacy → Microphone

2. **Check browser**:
   - Use Chrome, Edge, or Firefox (Safari has limited support)
   - Try incognito/private mode

3. **Test microphone**:
   - Go to https://www.onlinemictest.com/
   - Verify microphone works in other apps

### Issue: Poor transcription quality

**Solutions**:

1. **Improve audio quality**:
   - Use a good quality microphone
   - Reduce background noise
   - Speak clearly and at normal pace

2. **Check language settings**:
   - Default is English (en-US)
   - Modify in `/app/api/transcribe/route.ts` if needed

3. **Speaker diarization issues**:
   - Works best with 2 speakers
   - Speakers should have distinct voices
   - Avoid talking over each other

## Production Deployment

### Security Checklist

- [ ] Never commit `.env` file to git
- [ ] Use environment variables in production (not `.env` file)
- [ ] Enable HTTPS
- [ ] Add authentication and authorization
- [ ] Implement rate limiting
- [ ] Add audit logging
- [ ] Encrypt stored audio/transcriptions
- [ ] Comply with HIPAA/healthcare regulations

### Deployment Platforms

#### Vercel (Recommended for Next.js)

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Add environment variables in Vercel dashboard
```

#### Docker

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build
CMD ["npm", "start"]
```

## Cost Estimation

### Google Cloud Speech-to-Text
- First 60 minutes/month: FREE
- After that: ~$0.024 per minute
- Medical model: Enhanced pricing may apply

### OpenAI API (GPT-4)
- Input: ~$0.03 per 1K tokens
- Output: ~$0.06 per 1K tokens
- Average cost per analysis: $0.05 - $0.20

**Example**: 100 consultations/month
- Each consultation: 10 minutes audio + 5 analyses
- Estimated cost: $50-100/month

## Next Steps

1. ✅ Complete setup above
2. ✅ Test with sample conversation
3. 🔄 Customize analysis prompts in `/app/api/analyze/route.ts`
4. 🔄 Adjust UI styling in components
5. 🔄 Add authentication system
6. 🔄 Integrate with existing EHR system
7. 🔄 Set up production environment

## Support

- Check README.md for detailed documentation
- Review API documentation in `/app/api/` folders
- Open GitHub issues for bugs
- Review Google Cloud and OpenAI documentation

## Resources

- [Google Cloud Speech-to-Text Docs](https://cloud.google.com/speech-to-text/docs)
- [OpenAI API Reference](https://platform.openai.com/docs)
- [Next.js Documentation](https://nextjs.org/docs)
- [Web Audio API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API)

