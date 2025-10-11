# Quick Fix Guide

## Fix NPM Cache Issue & Install Dependencies

### Step 1: Fix NPM Cache Permissions

Run this in your terminal:

```bash
sudo chown -R $(whoami) ~/.npm
```

Enter your Mac password when prompted.

### Step 2: Install Dependencies

```bash
cd /Users/sakibahmed/thesis/prescription-assistant
npm install
```

---

## Set Up API Credentials - Quick Version

### Google Cloud Speech-to-Text

1. **Go to**: https://console.cloud.google.com/
2. **Create project**: Click "New Project" → Name it → Click "Create"
3. **Enable API**: 
   - Go to "APIs & Services" → "Library"
   - Search "Speech-to-Text"
   - Click "Enable"
4. **Create credentials**:
   - Go to "IAM & Admin" → "Service Accounts"
   - Click "Create Service Account"
   - Name: `prescription-assistant`
   - Grant role: "Cloud Speech Client"
   - Click on the account → "Keys" tab → "Add Key" → "JSON"
   - Download the JSON file

5. **Prepare JSON**:
   - Open the downloaded JSON file
   - Copy all content
   - Go to: https://www.text-utils.com/json-formatter/
   - Paste and click "Minify"
   - Copy the minified result (one line)

### OpenAI API

1. **Go to**: https://platform.openai.com/
2. **Sign up/Login**
3. **Add billing**: https://platform.openai.com/account/billing
4. **Create API key**: 
   - https://platform.openai.com/api-keys
   - Click "Create new secret key"
   - Copy the key (starts with `sk-`)

### Create .env File

Create a file named `.env` in your project root:

```env
GOOGLE_CLOUD_PROJECT_ID=your-project-id-here
GOOGLE_CLOUD_CREDENTIALS=paste-minified-json-here-as-one-line
OPENAI_API_KEY=sk-your-key-here
NODE_ENV=development
```

**Important**: 
- Get `GOOGLE_CLOUD_PROJECT_ID` from your JSON file (look for `"project_id"`)
- `GOOGLE_CLOUD_CREDENTIALS` must be ONE LINE (use the minifier tool)
- `OPENAI_API_KEY` starts with `sk-`

### Example .env:

```env
GOOGLE_CLOUD_PROJECT_ID=prescription-assistant-12345
GOOGLE_CLOUD_CREDENTIALS={"type":"service_account","project_id":"prescription-assistant-12345","private_key_id":"abc123","private_key":"-----BEGIN PRIVATE KEY-----\nXXXX\n-----END PRIVATE KEY-----\n","client_email":"prescription-assistant@prescription-assistant-12345.iam.gserviceaccount.com","client_id":"123456789","auth_uri":"https://accounts.google.com/o/oauth2/auth","token_uri":"https://oauth2.googleapis.com/token","auth_provider_x509_cert_url":"https://www.googleapis.com/oauth2/v1/certs","client_x509_cert_url":"https://www.googleapis.com/robot/v1/metadata/x509/prescription-assistant%40prescription-assistant-12345.iam.gserviceaccount.com"}
OPENAI_API_KEY=sk-proj-abcdefghijklmnopqrstuvwxyz123456789
NODE_ENV=development
```

---

## Run the App

```bash
npm run dev
```

Open: http://localhost:3000

---

## Still Having Issues?

### If npm install fails:

```bash
# Option 1: Clear everything and reinstall
rm -rf node_modules package-lock.json
npm install

# Option 2: Install packages individually
npm install lucide-react
npm install @google-cloud/speech
npm install openai
```

### If dev server shows errors:

```bash
# Clear Next.js cache
rm -rf .next
npm run dev
```

### Check your .env file:
- No spaces around `=`
- No quotes around the entire line (quotes only around values if needed)
- JSON credentials are ONE continuous line
- File is named exactly `.env` (not `.env.txt`)

---

## Full Documentation

For detailed setup instructions, see:
- **INSTALLATION.md** - Complete installation guide
- **README.md** - Project documentation
- **SETUP_GUIDE.md** - Detailed setup walkthrough
- **docs/API_DOCUMENTATION.md** - API reference

