# System Architecture

## Overview

The Prescription Assistant is a Next.js-based web application that helps doctors transcribe and analyze patient consultations using AI. The system combines real-time audio recording, speech-to-text with speaker diarization, and medical analysis powered by OpenAI.

## Technology Stack

### Frontend
- **Framework**: Next.js 15 (React 19)
- **Language**: TypeScript
- **Styling**: Tailwind CSS 4
- **Icons**: Lucide React
- **Audio**: Web Audio API, MediaRecorder API

### Backend (API Routes)
- **Runtime**: Node.js
- **Framework**: Next.js API Routes
- **Speech Recognition**: Google Cloud Speech-to-Text API
- **AI Analysis**: OpenAI GPT-4

### External Services
- **Google Cloud Platform**: Speech-to-Text API with Speaker Diarization
- **OpenAI**: GPT-4 for medical analysis and suggestions

## System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         User Browser                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌───────────────┐  ┌──────────────┐  ┌──────────────────┐   │
│  │  Recording    │  │ Transcription│  │  Medical         │   │
│  │  Controls     │  │  Display     │  │  Analysis        │   │
│  └───────┬───────┘  └──────┬───────┘  └────────┬─────────┘   │
│          │                  │                    │             │
│          └──────────────────┼────────────────────┘             │
│                             │                                  │
│                    ┌────────▼────────┐                        │
│                    │  Main Page      │                        │
│                    │  (page.tsx)     │                        │
│                    └────────┬────────┘                        │
│                             │                                  │
└─────────────────────────────┼──────────────────────────────────┘
                              │
                              │ HTTPS
                              │
┌─────────────────────────────▼──────────────────────────────────┐
│                     Next.js Server                             │
├────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌────────────────────────────────────────────────────────┐   │
│  │           API Routes                                   │   │
│  │                                                        │   │
│  │  ┌──────────────────┐      ┌─────────────────────┐  │   │
│  │  │ /api/transcribe  │      │  /api/analyze       │  │   │
│  │  │                  │      │                     │  │   │
│  │  │ • POST: Audio    │      │ • POST: Single      │  │   │
│  │  │   transcription  │      │   analysis          │  │   │
│  │  │ • PUT: Streaming │      │ • PUT: Batch        │  │   │
│  │  │                  │      │   analysis          │  │   │
│  │  └────────┬─────────┘      └─────────┬───────────┘  │   │
│  │           │                           │              │   │
│  └───────────┼───────────────────────────┼──────────────┘   │
│              │                           │                   │
└──────────────┼───────────────────────────┼───────────────────┘
               │                           │
               │                           │
    ┌──────────▼─────────┐      ┌─────────▼──────────┐
    │  Google Cloud      │      │  OpenAI            │
    │  Speech-to-Text    │      │  GPT-4 API         │
    │                    │      │                    │
    │ • Recognition      │      │ • Medical Summary  │
    │ • Diarization      │      │ • Symptom Analysis │
    │ • Medical Model    │      │ • Diagnosis        │
    └────────────────────┘      │ • Prescriptions    │
                                │ • Follow-up Plans  │
                                └────────────────────┘
```

## Component Architecture

### Frontend Components

```
app/
├── page.tsx                          # Main application page
├── layout.tsx                        # Root layout
├── globals.css                       # Global styles
│
├── components/
│   ├── RecordingControls.tsx        # Audio recording UI
│   ├── TranscriptionDisplay.tsx     # Real-time transcript view
│   └── MedicalAnalysis.tsx          # Analysis results display
│
├── hooks/
│   └── useAudioRecorder.ts          # Audio recording logic
│
├── types/
│   └── index.ts                     # TypeScript interfaces
│
└── api/
    ├── transcribe/
    │   └── route.ts                 # Speech-to-Text endpoint
    └── analyze/
        └── route.ts                 # AI analysis endpoint
```

### Component Responsibilities

#### 1. **RecordingControls**
- Manages recording state (start, pause, resume, stop)
- Displays recording duration
- Provides visual feedback during recording

#### 2. **TranscriptionDisplay**
- Shows real-time transcription segments
- Differentiates between speakers (Doctor/Patient)
- Displays timestamps
- Auto-scrolls to latest content

#### 3. **MedicalAnalysis**
- Tabbed interface for different analysis types
- Request analysis for specific types
- Display formatted analysis results
- Refresh/regenerate capabilities

#### 4. **useAudioRecorder Hook**
- Handles microphone access
- Records audio using MediaRecorder API
- Manages recording state
- Returns audio blob on completion

## Data Flow

### 1. Audio Recording Flow

```
User clicks "Start Recording"
         │
         ▼
Request microphone access (getUserMedia)
         │
         ▼
Create MediaRecorder instance
         │
         ▼
Start recording (collect chunks)
         │
         ▼
User clicks "Stop & Process"
         │
         ▼
Stop MediaRecorder
         │
         ▼
Combine audio chunks into Blob
         │
         ▼
Convert to base64
         │
         ▼
Send to /api/transcribe
```

### 2. Transcription Flow

```
Receive base64 audio
         │
         ▼
Initialize Google Cloud Speech client
         │
         ▼
Configure recognition settings:
  • Medical conversation model
  • Speaker diarization (2 speakers)
  • Punctuation enabled
  • Word timestamps
         │
         ▼
Send to Google Cloud Speech-to-Text
         │
         ▼
Receive recognition results
         │
         ▼
Process speaker diarization:
  • Group words by speaker tag
  • Assign labels (Doctor/Patient)
  • Create conversation segments
         │
         ▼
Return structured transcript
         │
         ▼
Display in UI
```

### 3. Analysis Flow

```
User requests analysis
         │
         ▼
Format conversation:
  "Doctor: ...\n\nPatient: ..."
         │
         ▼
Select analysis type and prompt
         │
         ▼
Send to OpenAI API
         │
         ▼
Receive AI-generated analysis
         │
         ▼
Store in state (Map<AnalysisType, Analysis>)
         │
         ▼
Display formatted results
```

## API Integration Details

### Google Cloud Speech-to-Text

**Authentication**: Service Account JSON credentials

**Configuration**:
```typescript
{
  encoding: 'WEBM_OPUS',
  sampleRateHertz: 48000,
  languageCode: 'en-US',
  enableAutomaticPunctuation: true,
  enableWordTimeOffsets: true,
  enableSpeakerDiarization: true,
  diarizationSpeakerCount: 2,
  model: 'medical_conversation',
  useEnhanced: true,
}
```

**Speaker Diarization**:
- Automatically detects speaker changes
- Tags each word with speaker ID (1 or 2)
- Speaker 1 → Doctor
- Speaker 2 → Patient

### OpenAI GPT-4

**Authentication**: API Key

**Configuration**:
```typescript
{
  model: 'gpt-4-turbo-preview',
  temperature: 0.3,  // Low for consistent medical analysis
  max_tokens: 2000,
}
```

**Prompt Engineering**:
- Specialized system prompts for each analysis type
- Medical context emphasis
- Structured output format
- Safety disclaimers

## State Management

### Component-Level State

Uses React useState hooks for:
- Recording state (isRecording, isPaused, duration)
- Transcription segments (array)
- Analysis results (Map)
- Processing flags (isProcessing, isAnalyzing)
- Error states

### No Global State Library Needed
- Single-page application
- Component communication via props
- No complex state sharing requirements

## Security Considerations

### 1. API Key Management
- Never expose keys in client code
- Use environment variables
- Server-side API calls only

### 2. Audio Data
- Processed in memory
- Not stored permanently
- HTTPS required for getUserMedia

### 3. Medical Data
- Sensitive health information
- HIPAA compliance required in production
- Consider encryption at rest
- Audit logging recommended

### 4. Authentication (Future)
- Not implemented in current version
- Recommended: NextAuth.js
- Role-based access control
- Session management

## Performance Considerations

### Audio Processing
- Chunk size: 1 second
- Format: WebM Opus (efficient compression)
- Sample rate: 48kHz (high quality)

### Transcription
- Average latency: 2-5 seconds per minute of audio
- Depends on Google Cloud API response time
- Consider streaming for long recordings

### AI Analysis
- Average latency: 3-10 seconds per analysis
- Depends on conversation length
- Parallel processing for batch analyses

### Optimization Strategies
1. **Lazy Loading**: Components loaded on demand
2. **Memoization**: useMemo/useCallback for expensive operations
3. **Debouncing**: For real-time features
4. **Caching**: Consider caching analysis results

## Scalability

### Current Limitations
- Single user per session
- No persistent storage
- Browser-based recording only

### Scaling Considerations
1. **Database**: Add PostgreSQL/MongoDB for persistence
2. **File Storage**: S3 for audio files
3. **Queue System**: Redis/RabbitMQ for async processing
4. **Load Balancing**: Multiple Next.js instances
5. **CDN**: Static assets delivery

## Error Handling

### Frontend
- User-friendly error messages
- Retry mechanisms
- Fallback UI states
- Error boundaries (to be added)

### Backend
- Try-catch blocks
- Detailed error logging
- Appropriate HTTP status codes
- Error detail sanitization

## Testing Strategy

### Unit Tests (Future)
- Component rendering
- Hook behavior
- Utility functions

### Integration Tests (Future)
- API endpoint testing
- Audio processing pipeline
- Analysis flow

### E2E Tests (Future)
- Complete user workflows
- Recording → Transcription → Analysis
- Error scenarios

## Monitoring & Logging

### Recommended Tools
- **Error Tracking**: Sentry
- **Analytics**: Google Analytics / Mixpanel
- **APM**: New Relic / DataDog
- **Logging**: Winston / Pino

### Key Metrics
- Recording success rate
- Transcription accuracy
- Analysis generation time
- API error rates
- User engagement

## Deployment Architecture

### Development
```
Local Machine
  └── npm run dev
      └── http://localhost:3000
```

### Production (Vercel Example)
```
User Request → CDN Edge → Serverless Functions → External APIs
                         └── Static Assets
```

### Docker Deployment
```
Docker Container
  └── Node.js Runtime
      └── Next.js Server
          ├── API Routes
          └── Static Files
```

## Future Enhancements

### Short-term
- [ ] Real-time streaming transcription
- [ ] Prescription PDF generation
- [ ] Multi-language support
- [ ] Conversation templates

### Medium-term
- [ ] EHR integration (FHIR)
- [ ] Voice commands
- [ ] Drug interaction checking
- [ ] ICD-10 code suggestions

### Long-term
- [ ] Mobile app (React Native)
- [ ] Offline mode
- [ ] Multi-doctor support
- [ ] Patient portal integration
- [ ] ML model fine-tuning

## Conclusion

This architecture provides a solid foundation for a medical prescription assistant system. The separation of concerns, use of modern technologies, and focus on extensibility make it suitable for both development and production use cases.

Key strengths:
- ✅ Modern tech stack
- ✅ Clear component structure
- ✅ Scalable API design
- ✅ Security-conscious
- ✅ Well-documented

Areas for production readiness:
- 🔄 Add authentication
- 🔄 Implement persistence
- 🔄 Add comprehensive testing
- 🔄 Set up monitoring
- 🔄 HIPAA compliance review

