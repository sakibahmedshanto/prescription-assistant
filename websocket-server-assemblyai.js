const WebSocket = require('ws');
const AssemblyAI = require('assemblyai');
const fs = require('fs');
const path = require('path');

// Initialize AssemblyAI client
const getAssemblyAIClient = () => {
  const apiKey = process.env.ASSEMBLYAI_API_KEY;
  if (!apiKey) {
    throw new Error('ASSEMBLYAI_API_KEY environment variable is required');
  }
  return new AssemblyAI({ apiKey });
};

class AssemblyAITranscriptionServer {
  constructor() {
    this.wss = new WebSocket.Server({ port: 8080 });
    this.assemblyai = getAssemblyAIClient();
    this.activeStreams = new Map();
    this.connections = new Map();
    this.audioBuffers = new Map(); // Store audio chunks per session
    
    console.log('Starting AssemblyAI WebSocket server on port 8080...');
    this.setupWebSocketServer();
  }

  setupWebSocketServer() {
    this.wss.on('connection', (ws, request) => {
      const url = new URL(request.url, `http://${request.headers.host}`);
      const sessionId = url.searchParams.get('sessionId') || `session_${Date.now()}`;
      
      console.log(`WebSocket connection established for session: ${sessionId}`);
      
      // Store connection
      this.connections.set(sessionId, ws);
      
      // Initialize audio buffer for this session
      this.audioBuffers.set(sessionId, []);
      
      // Send welcome message
      ws.send(JSON.stringify({
        type: 'connected',
        sessionId,
        message: 'AssemblyAI WebSocket connection established',
        timestamp: new Date().toISOString()
      }));

      // Handle incoming messages
      ws.on('message', async (data) => {
        try {
          const message = JSON.parse(data.toString());
          await this.handleMessage(sessionId, message);
        } catch (error) {
          console.error('Error processing WebSocket message:', error);
          ws.send(JSON.stringify({
            type: 'error',
            message: 'Failed to process message',
            error: error.message
          }));
        }
      });

      // Handle connection close
      ws.on('close', () => {
        console.log(`WebSocket connection closed for session: ${sessionId}`);
        this.connections.delete(sessionId);
        this.cleanupSession(sessionId);
      });

      // Handle errors
      ws.on('error', (error) => {
        console.error(`WebSocket error for session ${sessionId}:`, error);
        this.connections.delete(sessionId);
        this.cleanupSession(sessionId);
      });

      // Send ping every 30 seconds to keep connection alive
      const pingInterval = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.ping();
        } else {
          clearInterval(pingInterval);
        }
      }, 30000);

      ws.on('pong', () => {
        console.log(`Received pong from session: ${sessionId}`);
      });
    });

    this.wss.on('error', (error) => {
      console.error('WebSocket server error:', error);
    });

    console.log('AssemblyAI WebSocket server ready on ws://localhost:8080');
  }

  async handleMessage(sessionId, message) {
    const ws = this.connections.get(sessionId);
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      console.warn(`No active connection for session: ${sessionId}`);
      return;
    }

    switch (message.type) {
      case 'audio_chunk':
        await this.handleAudioChunk(sessionId, message.audioData, message.config);
        break;
        
      case 'start_stream':
        await this.startTranscriptionStream(sessionId, message.config);
        break;
        
      case 'stop_stream':
        await this.stopTranscriptionStream(sessionId);
        break;
        
      case 'process_audio':
        await this.processAudioWithAssemblyAI(sessionId);
        break;
        
      case 'ping':
        ws.send(JSON.stringify({ type: 'pong', timestamp: new Date().toISOString() }));
        break;
        
      default:
        console.log(`Unknown message type: ${message.type}`);
        ws.send(JSON.stringify({
          type: 'error',
          message: `Unknown message type: ${message.type}`
        }));
    }
  }

  async startTranscriptionStream(sessionId, config) {
    try {
      console.log(`Starting AssemblyAI transcription stream for session: ${sessionId}`);
      
      // Clear any existing audio buffer
      this.audioBuffers.set(sessionId, []);

      const ws = this.connections.get(sessionId);
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
          type: 'stream_started',
          sessionId,
          message: 'AssemblyAI transcription stream started',
          timestamp: new Date().toISOString()
        }));
      }

    } catch (error) {
      console.error(`Error starting transcription stream for session ${sessionId}:`, error);
      const ws = this.connections.get(sessionId);
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
          type: 'error',
          message: 'Failed to start transcription stream',
          error: error.message
        }));
      }
    }
  }

  async handleAudioChunk(sessionId, audioData, config) {
    try {
      // Convert base64 to buffer and store
      const audioBuffer = Buffer.from(audioData, 'base64');
      const audioBuffers = this.audioBuffers.get(sessionId) || [];
      audioBuffers.push(audioBuffer);
      this.audioBuffers.set(sessionId, audioBuffers);
      
      console.log(`Received audio chunk for session ${sessionId}, buffer size: ${audioBuffers.length}`);
      
      // Process audio every 5 chunks (5 seconds of audio)
      if (audioBuffers.length >= 5) {
        await this.processAudioWithAssemblyAI(sessionId);
      }
      
    } catch (error) {
      console.error(`Error handling audio chunk for session ${sessionId}:`, error);
    }
  }

  async processAudioWithAssemblyAI(sessionId) {
    try {
      const ws = this.connections.get(sessionId);
      if (!ws || ws.readyState !== WebSocket.OPEN) {
        return;
      }

      const audioBuffers = this.audioBuffers.get(sessionId) || [];
      if (audioBuffers.length === 0) {
        return;
      }

      console.log(`Processing ${audioBuffers.length} audio chunks for session: ${sessionId}`);

      // Combine all audio buffers
      const combinedAudio = Buffer.concat(audioBuffers);
      
      // Save to temporary file
      const tempDir = path.join(__dirname, 'temp');
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }
      
      const tempFilePath = path.join(tempDir, `audio_${sessionId}_${Date.now()}.webm`);
      fs.writeFileSync(tempFilePath, combinedAudio);

      // Configure AssemblyAI transcription with speaker diarization
      const config = {
        audio: tempFilePath,
        speaker_labels: true,
        speakers_expected: 2, // Doctor and Patient
        language_code: 'en_us',
        punctuate: true,
        format_text: true,
        dual_channel: false,
        webhook_url: null,
        auto_highlights: false,
        audio_start_from: null,
        audio_end_at: null,
        word_boost: ['medical', 'doctor', 'patient', 'symptoms', 'diagnosis', 'treatment'],
        boost_param: 'high'
      };

      // Send processing started message
      ws.send(JSON.stringify({
        type: 'processing_started',
        sessionId,
        message: 'Processing audio with AssemblyAI',
        timestamp: new Date().toISOString()
      }));

      // Transcribe with AssemblyAI
      const transcript = await this.assemblyai.transcripts.transcribe(config);
      
      if (transcript.utterances && transcript.utterances.length > 0) {
        // Process utterances and map speakers
        const processedUtterances = this.processUtterances(transcript.utterances);
        
        // Send transcription results
        ws.send(JSON.stringify({
          type: 'transcription',
          sessionId,
          data: {
            utterances: processedUtterances,
            transcript: transcript.text,
            confidence: transcript.confidence,
            language_code: transcript.language_code,
            audio_duration: transcript.audio_duration,
            timestamp: new Date().toISOString()
          }
        }));
      }

      // Clean up temporary file
      try {
        fs.unlinkSync(tempFilePath);
      } catch (cleanupError) {
        console.warn(`Could not delete temp file ${tempFilePath}:`, cleanupError.message);
      }

      // Clear audio buffer
      this.audioBuffers.set(sessionId, []);

    } catch (error) {
      console.error(`Error processing audio with AssemblyAI for session ${sessionId}:`, error);
      const ws = this.connections.get(sessionId);
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
          type: 'error',
          message: 'Failed to process audio with AssemblyAI',
          error: error.message
        }));
      }
    }
  }

  processUtterances(utterances) {
    // Map speakers A, B, C, etc. to Doctor, Patient, etc.
    const speakerMap = new Map();
    let speakerCounter = 0;
    
    // Count utterances per speaker to determine who is Doctor vs Patient
    const speakerCounts = new Map();
    utterances.forEach(utterance => {
      const count = speakerCounts.get(utterance.speaker) || 0;
      speakerCounts.set(utterance.speaker, count + 1);
    });
    
    // Sort speakers by utterance count (more utterances = Doctor)
    const sortedSpeakers = Array.from(speakerCounts.entries()).sort((a, b) => b[1] - a[1]);
    
    // Map speakers
    sortedSpeakers.forEach(([speaker, count], index) => {
      if (index === 0) {
        speakerMap.set(speaker, 'Doctor');
      } else if (index === 1) {
        speakerMap.set(speaker, 'Patient');
      } else {
        speakerMap.set(speaker, `Speaker ${speaker}`);
      }
    });

    // Process utterances
    return utterances.map(utterance => ({
      speaker: speakerMap.get(utterance.speaker) || utterance.speaker,
      text: utterance.text,
      confidence: utterance.confidence,
      start: utterance.start,
      end: utterance.end,
      words: utterance.words || [],
      timestamp: new Date().toISOString()
    }));
  }

  async stopTranscriptionStream(sessionId) {
    try {
      console.log(`Stopping transcription stream for session: ${sessionId}`);
      
      // Process any remaining audio
      const audioBuffers = this.audioBuffers.get(sessionId) || [];
      if (audioBuffers.length > 0) {
        await this.processAudioWithAssemblyAI(sessionId);
      }
      
      const ws = this.connections.get(sessionId);
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
          type: 'stream_stopped',
          sessionId,
          message: 'Transcription stream stopped',
          timestamp: new Date().toISOString()
        }));
      }

    } catch (error) {
      console.error(`Error stopping transcription stream for session ${sessionId}:`, error);
    }
  }

  cleanupSession(sessionId) {
    // Clean up audio buffers
    this.audioBuffers.delete(sessionId);
    
    // Clean up temporary files for this session
    try {
      const tempDir = path.join(__dirname, 'temp');
      if (fs.existsSync(tempDir)) {
        const files = fs.readdirSync(tempDir);
        files.forEach(file => {
          if (file.includes(sessionId)) {
            fs.unlinkSync(path.join(tempDir, file));
          }
        });
      }
    } catch (error) {
      console.warn(`Error cleaning up temp files for session ${sessionId}:`, error.message);
    }
  }
}

// Load environment variables
require('dotenv').config();

// Create WebSocket server instance
const wsServer = new AssemblyAITranscriptionServer();

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\nShutting down AssemblyAI WebSocket server...');
  wsServer.wss.close(() => {
    console.log('AssemblyAI WebSocket server closed');
    process.exit(0);
  });
});

process.on('SIGTERM', () => {
  console.log('\nShutting down AssemblyAI WebSocket server...');
  wsServer.wss.close(() => {
    console.log('AssemblyAI WebSocket server closed');
    process.exit(0);
  });
});
