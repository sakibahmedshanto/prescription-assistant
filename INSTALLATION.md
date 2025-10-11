# Installation & Setup Guide

## Step 1: Fix NPM Cache Issue (If you see EACCES errors)

If you're seeing npm cache permission errors, run this command in your terminal:

```bash
sudo chown -R $(whoami) ~/.npm
```

Then try installing again:

```bash
npm install
```

## Step 2: Install Dependencies

```bash
cd /Users/sakibahmed/thesis/prescription-assistant
npm install
```

This will install:
- `lucide-react` - For UI icons
- `@google-cloud/speech` - Google Cloud Speech-to-Text
- `openai` - OpenAI API client

---

## Step 3: Set Up Google Cloud Speech-to-Text

### 3.1 Create Google Cloud Project

1. **Go to Google Cloud Console**
   - Visit: https://console.cloud.google.com/

2. **Create a New Project**
   - Click the project dropdown at the top
   - Click "New Project"
   - Project Name: `prescription-assistant`
   - Click "Create"
   - Wait for project creation (takes ~30 seconds)

### 3.2 Enable Speech-to-Text API

1. **Navigate to APIs & Services**
   - In the left menu, go to: **APIs & Services** → **Library**

2. **Search for Speech-to-Text**
   - In the search bar, type: `Speech-to-Text`
   - Click on "**Cloud Speech-to-Text API**"

3. **Enable the API**
   - Click the blue "**ENABLE**" button
   - Wait for it to be enabled (takes ~1 minute)

### 3.3 Create Service Account

1. **Go to Service Accounts**
   - Left menu: **IAM & Admin** → **Service Accounts**

2. **Create Service Account**
   - Click "**+ CREATE SERVICE ACCOUNT**" at the top

3. **Service Account Details**
   - **Service account name**: `prescription-assistant`
   - **Service account ID**: (auto-generated, leave it)
   - Click "**Create and Continue**"

4. **Grant Permissions**
   - Click the "**Select a role**" dropdown
   - Search for: `Speech-to-Text`
   - Select: "**Cloud Speech-to-Text API User**" (or "Cloud Speech Client")
   - Click "**Continue**"
   - Click "**Done**"

### 3.4 Create and Download JSON Key

1. **Open Your Service Account**
   - Click on the service account you just created (`prescription-assistant@...`)

2. **Go to Keys Tab**
   - Click the "**KEYS**" tab at the top

3. **Add New Key**
   - Click "**ADD KEY**" → "**Create new key**"

4. **Download JSON**
   - Select "**JSON**" as the key type
   - Click "**Create**"
   - A JSON file will automatically download to your computer
   - **Keep this file safe!** It contains your credentials

5. **Locate the Downloaded File**
   - Usually in your Downloads folder
   - Named something like: `prescription-assistant-xxxxx.json`

### 3.5 Prepare the Credentials

Open the downloaded JSON file in a text editor. It looks like this:

```json
{
  "type": "service_account",
  "project_id": "prescription-assistant-12345",
  "private_key_id": "abc123...",
  "private_key": "-----BEGIN PRIVATE KEY-----\nMIIE...\n-----END PRIVATE KEY-----\n",
  "client_email": "prescription-assistant@prescription-assistant-12345.iam.gserviceaccount.com",
  "client_id": "123456789",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
  "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/..."
}
```

**Important**: You need to convert this to a single line for the `.env` file.

#### Option A: Use Online Tool (Easiest)
1. Go to: https://www.text-utils.com/json-formatter/
2. Paste your entire JSON
3. Click "Minify"
4. Copy the minified result (it will be one line)

#### Option B: Manual Method
1. Copy the entire JSON content
2. Remove all line breaks
3. It should become one continuous line

---

## Step 4: Set Up OpenAI API

### 4.1 Create OpenAI Account

1. **Visit OpenAI**
   - Go to: https://platform.openai.com/

2. **Sign Up or Log In**
   - Click "Sign up" if you don't have an account
   - Or "Log in" if you already have one

### 4.2 Add Payment Method

1. **Go to Billing**
   - Visit: https://platform.openai.com/account/billing/overview
   - Click "Add payment method"
   - Add a credit/debit card

2. **Add Credits** (Optional)
   - You can add prepaid credits if you prefer
   - Minimum: $5

### 4.3 Create API Key

1. **Go to API Keys**
   - Visit: https://platform.openai.com/api-keys
   - Or navigate: Dashboard → API Keys

2. **Create New Key**
   - Click "**+ Create new secret key**"
   - Give it a name: `prescription-assistant`
   - Click "**Create secret key**"

3. **Copy the Key**
   - **IMPORTANT**: Copy the key immediately!
   - It starts with `sk-`
   - Example: `sk-proj-abc123...`
   - You won't be able to see it again!

4. **Store Safely**
   - Save it in a secure location temporarily
   - We'll add it to the `.env` file next

---

## Step 5: Create Environment File

### 5.1 Create `.env` File

In your project root directory, create a file named `.env`:

```bash
cd /Users/sakibahmed/thesis/prescription-assistant
touch .env
```

### 5.2 Add Your Credentials

Open the `.env` file and add the following:

```env
# Google Cloud Configuration
GOOGLE_CLOUD_PROJECT_ID=your-project-id-from-json
GOOGLE_CLOUD_CREDENTIALS={"type":"service_account","project_id":"your-project-id",...paste-entire-minified-json-here...}

# OpenAI Configuration
OPENAI_API_KEY=sk-your-openai-api-key-here

# Application Configuration
NODE_ENV=development
```

### 5.3 Fill in Your Values

**GOOGLE_CLOUD_PROJECT_ID**:
- Find this in your JSON file: look for `"project_id": "..."`
- Example: `prescription-assistant-12345`

**GOOGLE_CLOUD_CREDENTIALS**:
- Paste the ENTIRE minified JSON from Step 3.5
- It should be ONE LINE
- Keep it inside quotes if needed

**OPENAI_API_KEY**:
- Paste your API key from Step 4.3
- Starts with `sk-`

### 5.4 Example `.env` File

```env
# Google Cloud Configuration
GOOGLE_CLOUD_PROJECT_ID=prescription-assistant-12345
GOOGLE_CLOUD_CREDENTIALS={"type":"service_account","project_id":"prescription-assistant-12345","private_key_id":"abc123","private_key":"-----BEGIN PRIVATE KEY-----\nMIIEvQ...\n-----END PRIVATE KEY-----\n","client_email":"prescription-assistant@prescription-assistant-12345.iam.gserviceaccount.com","client_id":"123456789","auth_uri":"https://accounts.google.com/o/oauth2/auth","token_uri":"https://oauth2.googleapis.com/token","auth_provider_x509_cert_url":"https://www.googleapis.com/oauth2/v1/certs","client_x509_cert_url":"https://www.googleapis.com/robot/v1/metadata/x509/prescription-assistant%40prescription-assistant-12345.iam.gserviceaccount.com"}

# OpenAI Configuration
OPENAI_API_KEY=sk-proj-abc123def456ghi789...

# Application Configuration
NODE_ENV=development
```

---

## Step 6: Verify Installation

### 6.1 Check Dependencies

```bash
npm list lucide-react @google-cloud/speech openai
```

You should see all three packages listed.

### 6.2 Check Environment Variables

Create a test file to verify:

```bash
node -e "console.log(require('dotenv').config())"
```

Or create a simple test:

```javascript
// test.js
console.log('Project ID:', process.env.GOOGLE_CLOUD_PROJECT_ID);
console.log('OpenAI Key exists:', !!process.env.OPENAI_API_KEY);
console.log('Google Credentials exists:', !!process.env.GOOGLE_CLOUD_CREDENTIALS);
```

Run: `node test.js`

---

## Step 7: Run the Application

```bash
npm run dev
```

Open your browser to: http://localhost:3000

---

## Troubleshooting

### Issue: "Module not found: lucide-react"

**Solution**:
```bash
npm install lucide-react --save
```

### Issue: "Module not found: @google-cloud/speech"

**Solution**:
```bash
npm install @google-cloud/speech --save
```

### Issue: "Module not found: openai"

**Solution**:
```bash
npm install openai --save
```

### Issue: "Google Cloud authentication failed"

**Possible causes**:
1. **JSON not properly formatted**
   - Make sure it's on ONE line in `.env`
   - No extra line breaks
   - Use the minifier tool mentioned above

2. **Wrong project ID**
   - Ensure `GOOGLE_CLOUD_PROJECT_ID` matches the `project_id` in your JSON

3. **API not enabled**
   - Go back to Google Cloud Console
   - Check that Speech-to-Text API is enabled

4. **Wrong service account permissions**
   - Service account needs "Cloud Speech Client" or "Cloud Speech-to-Text API User" role

### Issue: "OpenAI API error" / "Incorrect API key"

**Possible causes**:
1. **API key incorrect**
   - Check it starts with `sk-`
   - No extra spaces before/after
   - Copy it again from OpenAI dashboard

2. **No billing set up**
   - OpenAI requires a payment method
   - Add credit card or prepaid credits

3. **Rate limit exceeded**
   - You may have hit your rate limit
   - Wait a few minutes or upgrade your plan

### Issue: Development server won't start

**Solution**:
```bash
# Kill any existing processes
pkill -f "next dev"

# Clear Next.js cache
rm -rf .next

# Restart
npm run dev
```

---

## Security Checklist

- [ ] Never commit `.env` file to git (already in `.gitignore`)
- [ ] Never share your API keys publicly
- [ ] Keep your service account JSON file secure
- [ ] Use environment variables in production (not `.env` file)
- [ ] Rotate keys regularly
- [ ] Set up billing alerts in Google Cloud and OpenAI

---

## Cost Monitoring

### Google Cloud
- Check usage: https://console.cloud.google.com/billing
- Set up budget alerts
- First 60 minutes/month are FREE

### OpenAI
- Check usage: https://platform.openai.com/usage
- Set usage limits in: https://platform.openai.com/account/limits
- Monitor costs regularly

---

## Next Steps

After successful installation:

1. ✅ Test microphone access
2. ✅ Record a short test conversation
3. ✅ Verify transcription works
4. ✅ Test AI analysis features
5. ✅ Review the README.md for full documentation
6. ✅ Check SETUP_GUIDE.md for advanced configuration

---

## Quick Commands Reference

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Clear Next.js cache
rm -rf .next

# Check package versions
npm list

# Update dependencies
npm update
```

---

## Support Resources

- **Google Cloud Speech-to-Text**: https://cloud.google.com/speech-to-text/docs
- **OpenAI API**: https://platform.openai.com/docs
- **Next.js**: https://nextjs.org/docs
- **Project README**: See README.md in the project root
- **API Documentation**: See docs/API_DOCUMENTATION.md
- **Architecture**: See docs/ARCHITECTURE.md

---

## Getting Help

If you encounter issues:

1. Check this installation guide
2. Review error messages carefully
3. Check the troubleshooting section
4. Verify all environment variables are set
5. Check API quotas and billing
6. Review the documentation links above

Good luck with your prescription assistant system! 🏥

