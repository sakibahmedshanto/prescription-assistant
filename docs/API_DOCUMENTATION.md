# API Documentation

## Overview

The Prescription Assistant system provides two main API endpoints for transcription and analysis.

## Base URL

```
http://localhost:3000/api (development)
https://your-domain.com/api (production)
```

---

## Transcription API

### Endpoint: `/api/transcribe`

Transcribes audio files with speaker diarization to identify doctor vs patient speech.

#### POST - Transcribe Audio

**URL**: `/api/transcribe`

**Method**: `POST`

**Headers**:
```json
{
  "Content-Type": "application/json"
}
```

**Request Body**:
```json
{
  "audioContent": "base64_encoded_audio_content",
  "config": {
    "encoding": "WEBM_OPUS",
    "sampleRateHertz": 48000,
    "languageCode": "en-US"
  }
}
```

**Request Parameters**:

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| audioContent | string | Yes | Base64 encoded audio file |
| config.encoding | string | No | Audio encoding format (default: WEBM_OPUS) |
| config.sampleRateHertz | number | No | Sample rate in Hz (default: 48000) |
| config.languageCode | string | No | Language code (default: en-US) |

**Supported Audio Formats**:
- WEBM_OPUS (recommended for web)
- LINEAR16 (WAV)
- FLAC
- MP3
- OGG_OPUS

**Supported Languages**:
- en-US (English - United States)
- en-GB (English - United Kingdom)
- es-ES (Spanish)
- fr-FR (French)
- de-DE (German)
- [See full list](https://cloud.google.com/speech-to-text/docs/languages)

**Success Response**:

**Code**: 200 OK

```json
{
  "success": true,
  "transcriptions": [
    {
      "transcript": "How can I help you today?",
      "confidence": 0.95,
      "words": [
        {
          "word": "How",
          "startTime": { "seconds": "0", "nanos": 0 },
          "endTime": { "seconds": "0", "nanos": 300000000 },
          "speakerTag": 1
        }
      ]
    }
  ],
  "speakerSegments": [
    {
      "speaker": "Doctor",
      "text": "How can I help you today?",
      "startTime": { "seconds": "0", "nanos": 0 },
      "endTime": { "seconds": "2", "nanos": 500000000 }
    },
    {
      "speaker": "Patient",
      "text": "I've been having headaches for the past week.",
      "startTime": { "seconds": "3", "nanos": 0 },
      "endTime": { "seconds": "6", "nanos": 0 }
    }
  ]
}
```

**Error Responses**:

**Code**: 400 Bad Request
```json
{
  "error": "Audio content is required"
}
```

**Code**: 500 Internal Server Error
```json
{
  "error": "Failed to transcribe audio",
  "details": "Error message details"
}
```

**Example Usage**:

```javascript
// Convert audio blob to base64
const audioBlob = await recorder.stop();
const reader = new FileReader();
reader.readAsDataURL(audioBlob);
reader.onloadend = async () => {
  const base64Audio = reader.result.split(',')[1];
  
  const response = await fetch('/api/transcribe', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      audioContent: base64Audio,
      config: {
        encoding: 'WEBM_OPUS',
        sampleRateHertz: 48000,
        languageCode: 'en-US',
      },
    }),
  });
  
  const data = await response.json();
  console.log(data.speakerSegments);
};
```

---

## Analysis API

### Endpoint: `/api/analyze`

Analyzes doctor-patient conversations using AI to generate medical insights.

#### POST - Single Analysis

**URL**: `/api/analyze`

**Method**: `POST`

**Headers**:
```json
{
  "Content-Type": "application/json"
}
```

**Request Body**:
```json
{
  "conversation": "Doctor: How can I help you today?\n\nPatient: I've been having headaches.",
  "analysisType": "summary"
}
```

**Request Parameters**:

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| conversation | string | Yes | Full conversation transcript with speaker labels |
| analysisType | string | Yes | Type of analysis to perform |

**Analysis Types**:

| Type | Description |
|------|-------------|
| `summary` | Comprehensive medical visit summary |
| `symptoms` | Extract and categorize symptoms |
| `diagnosis` | Differential diagnosis suggestions |
| `prescription` | Medication recommendations |
| `follow-up` | Follow-up care plan |

**Success Response**:

**Code**: 200 OK

```json
{
  "success": true,
  "analysis": "## Medical Summary\n\n**Chief Complaint:**\nPatient presents with headaches lasting one week...",
  "analysisType": "summary",
  "usage": {
    "prompt_tokens": 245,
    "completion_tokens": 412,
    "total_tokens": 657
  }
}
```

**Error Responses**:

**Code**: 400 Bad Request
```json
{
  "error": "Conversation transcript is required"
}
```

**Code**: 500 Internal Server Error
```json
{
  "error": "Failed to analyze conversation",
  "details": "Error message details"
}
```

**Example Usage**:

```javascript
const conversation = segments
  .map(seg => `${seg.speaker}: ${seg.text}`)
  .join('\n\n');

const response = await fetch('/api/analyze', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    conversation,
    analysisType: 'summary',
  }),
});

const data = await response.json();
console.log(data.analysis);
```

#### PUT - Batch Analysis

Perform multiple types of analysis in parallel.

**URL**: `/api/analyze`

**Method**: `PUT`

**Request Body**:
```json
{
  "conversation": "Doctor: ...\n\nPatient: ...",
  "analysisTypes": ["summary", "symptoms", "diagnosis"]
}
```

**Success Response**:

```json
{
  "success": true,
  "analyses": [
    {
      "type": "summary",
      "success": true,
      "analysis": "..."
    },
    {
      "type": "symptoms",
      "success": true,
      "analysis": "..."
    },
    {
      "type": "diagnosis",
      "success": true,
      "analysis": "..."
    }
  ]
}
```

**Example Usage**:

```javascript
const response = await fetch('/api/analyze', {
  method: 'PUT',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    conversation,
    analysisTypes: ['summary', 'symptoms', 'diagnosis', 'prescription', 'follow-up'],
  }),
});

const data = await response.json();
data.analyses.forEach(analysis => {
  console.log(`${analysis.type}:`, analysis.analysis);
});
```

---

## Analysis Response Examples

### Summary Analysis

```markdown
## Medical Summary

**Chief Complaint:**
Patient presents with persistent headaches for the past 7 days.

**History of Present Illness:**
- Headaches started 1 week ago
- Described as throbbing, located in temporal region
- Pain intensity: 7/10
- Associated with photophobia
- No nausea or vomiting

**Past Medical History:**
- No significant medical history

**Current Medications:**
- None

**Assessment:**
Likely tension-type headache vs. migraine

**Plan:**
1. Trial of NSAIDs
2. Advise adequate hydration
3. Follow-up in 1 week if symptoms persist
```

### Symptoms Analysis

```markdown
## Primary Symptoms:
1. **Headache**
   - Duration: 7 days
   - Severity: 7/10
   - Location: Temporal region
   - Character: Throbbing

## Associated Symptoms:
- Photophobia (light sensitivity)

## Negative Symptoms:
- No nausea
- No vomiting
- No visual disturbances
```

### Diagnosis Analysis

```markdown
## Differential Diagnoses:

1. **Tension-Type Headache (High probability)**
   - Supporting findings: Bilateral temporal pain, gradual onset
   - Duration consistent with episodic tension headache

2. **Migraine without aura (Moderate probability)**
   - Supporting findings: Throbbing quality, photophobia
   - Against: No nausea/vomiting

3. **Medication overuse headache (Low probability)**
   - Would need history of analgesic use

## Recommended Additional Tests:
- None immediately required
- Consider neuroimaging if red flags develop

## Red Flags to Monitor:
- Sudden severe headache
- Neurological deficits
- Fever
- Vision changes
```

### Prescription Analysis

```markdown
## Medication Recommendations:

1. **Ibuprofen 400mg**
   - Dosage: Take 1-2 tablets every 6-8 hours as needed
   - Maximum: 1200mg per day
   - Duration: 5-7 days

2. **Acetaminophen 500mg (Alternative)**
   - Dosage: 1-2 tablets every 6 hours as needed
   - Maximum: 4000mg per day

## Counseling Points:
- Take with food to minimize stomach upset
- Do not exceed recommended dosage
- Avoid alcohol while taking medication
- Stay well hydrated

## Contraindications to Check:
- History of peptic ulcer disease
- Kidney disease
- Aspirin allergy
- Pregnancy/breastfeeding status

## Follow-up:
- If no improvement in 7 days, return for re-evaluation
```

### Follow-up Analysis

```markdown
## Follow-up Plan:

**Timeline:**
- If improved: PRN follow-up only
- If not improved: Return in 7 days
- If worsening: Return immediately

**Symptoms to Monitor:**
- Headache frequency and intensity
- Any new symptoms
- Response to medication

**When to Seek Immediate Care:**
- Sudden severe headache ("worst headache of life")
- Vision changes
- Weakness or numbness
- Confusion or altered mental status
- Fever with stiff neck

**Lifestyle Recommendations:**
- Maintain regular sleep schedule
- Adequate hydration (8 glasses water/day)
- Stress management techniques
- Regular meals
- Limit caffeine intake

**Next Steps:**
- Keep headache diary
- Note triggers (food, stress, sleep)
- Track medication effectiveness
```

---

## Rate Limits

### Google Cloud Speech-to-Text
- Default: 180 requests per minute
- Long audio: 60 requests per minute
- Streaming: 100 concurrent streams

### OpenAI API
- Varies by account tier
- Check your limits at: https://platform.openai.com/account/rate-limits

---

## Error Codes

| Code | Description |
|------|-------------|
| 400 | Bad Request - Invalid parameters |
| 401 | Unauthorized - Invalid API credentials |
| 403 | Forbidden - API not enabled or insufficient permissions |
| 429 | Too Many Requests - Rate limit exceeded |
| 500 | Internal Server Error - Server-side error |

---

## Best Practices

1. **Audio Quality**:
   - Use 48kHz sample rate for best results
   - Minimize background noise
   - Use good quality microphone

2. **Transcription**:
   - Keep audio files under 10 minutes for better performance
   - Use appropriate language code
   - Enable speaker diarization for multi-speaker conversations

3. **Analysis**:
   - Provide complete conversation context
   - Include speaker labels for better analysis
   - Request specific analysis types rather than batch when possible

4. **Security**:
   - Never expose API keys in client-side code
   - Use environment variables for credentials
   - Implement rate limiting on your server
   - Sanitize user inputs

5. **Cost Optimization**:
   - Cache analysis results when appropriate
   - Use streaming for long conversations
   - Monitor API usage regularly

---

## Testing

### Test Transcription

```bash
curl -X POST http://localhost:3000/api/transcribe \
  -H "Content-Type: application/json" \
  -d '{
    "audioContent": "YOUR_BASE64_AUDIO",
    "config": {
      "encoding": "WEBM_OPUS",
      "sampleRateHertz": 48000,
      "languageCode": "en-US"
    }
  }'
```

### Test Analysis

```bash
curl -X POST http://localhost:3000/api/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "conversation": "Doctor: How are you feeling?\n\nPatient: I have a headache.",
    "analysisType": "summary"
  }'
```

---

## Changelog

### Version 1.0.0 (Current)
- Initial release
- Speech-to-Text with speaker diarization
- AI-powered medical analysis
- 5 analysis types supported

