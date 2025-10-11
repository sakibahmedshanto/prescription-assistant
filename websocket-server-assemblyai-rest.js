const WebSocket = require('ws');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

// AssemblyAI API configuration
const ASSEMBLYAI_BASE_URL = 'https://api.assemblyai.com/v2';
const getAssemblyAIHeaders = () => {
  const apiKey = process.env.ASSEMBLYAI_API_KEY;
  if (!apiKey) {
    throw new Error('ASSEMBLYAI_API_KEY environment variable is required');
  }
  return {
    authorization: apiKey,
    'Content-Type': 'application/json'
  };
};

class AssemblyAIRESTTranscriptionServer {
  constructor() {
    this.wss = new WebSocket.Server({ port: 8080 });
    this.activeStreams = new Map();
    this.connections = new Map();
    this.audioBuffers = new Map();
    this.activeTranscriptions = new Map(); // Track active transcription jobs
    
    console.log('Starting AssemblyAI REST WebSocket server on port 8080...');
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
        message: 'AssemblyAI REST WebSocket connection established',
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

    console.log('AssemblyAI REST WebSocket server ready on ws://localhost:8080');
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
      console.log(`Starting AssemblyAI REST transcription stream for session: ${sessionId}`);
      
      // Clear any existing audio buffer
      this.audioBuffers.set(sessionId, []);

      const ws = this.connections.get(sessionId);
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
          type: 'stream_started',
          sessionId,
          message: 'AssemblyAI REST transcription stream started',
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
      
      // Process audio every 10 chunks (10 seconds of audio)
      if (audioBuffers.length >= 10) {
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

      // Send processing started message
      ws.send(JSON.stringify({
        type: 'processing_started',
        sessionId,
        message: 'Processing audio with AssemblyAI REST API',
        timestamp: new Date().toISOString()
      }));

      // Upload audio file to AssemblyAI
      const audioData = fs.readFileSync(tempFilePath);
      const uploadResponse = await axios.post(`${ASSEMBLYAI_BASE_URL}/upload`, audioData, {
        headers: getAssemblyAIHeaders()
      });

      const uploadUrl = uploadResponse.data.upload_url;
      console.log(`Audio uploaded to AssemblyAI: ${uploadUrl}`);

      // Start transcription with speaker diarization
      const transcriptionData = {
        audio_url: uploadUrl,
        speaker_labels: true,
        speakers_expected: 2, // Doctor and Patient
        language_code: 'en_us',
        punctuate: true,
        format_text: true,
        auto_highlights: false,
        word_boost: [
          'medical', 'doctor', 'patient', 'symptoms', 
          'diagnosis', 'treatment', 'medication', 'prescription',
          'blood pressure', 'temperature', 'pain', 'headache'
        ],
        boost_param: 'high'
      };

      const transcriptResponse = await axios.post(`${ASSEMBLYAI_BASE_URL}/transcript`, transcriptionData, {
        headers: getAssemblyAIHeaders()
      });

      const transcriptId = transcriptResponse.data.id;
      console.log(`Transcription started with ID: ${transcriptId}`);

      // Store active transcription
      this.activeTranscriptions.set(sessionId, transcriptId);

      // Poll for completion
      await this.pollTranscriptionStatus(sessionId, transcriptId);

      // Clean up temporary file
      try {
        fs.unlinkSync(tempFilePath);
      } catch (cleanupError) {
        console.warn(`Could not delete temp file ${tempFilePath}:`, cleanupError.message);
      }

      // Clear audio buffer
      this.audioBuffers.set(sessionId, []);

    } catch (error) {
      console.error(`Error processing audio with AssemblyAI REST API for session ${sessionId}:`, error);
      const ws = this.connections.get(sessionId);
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
          type: 'error',
          message: 'Failed to process audio with AssemblyAI REST API',
          error: error.message
        }));
      }
    }
  }

  async pollTranscriptionStatus(sessionId, transcriptId) {
    const ws = this.connections.get(sessionId);
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      return;
    }

    const pollingEndpoint = `${ASSEMBLYAI_BASE_URL}/transcript/${transcriptId}`;
    
    while (true) {
      try {
        const pollingResponse = await axios.get(pollingEndpoint, {
          headers: getAssemblyAIHeaders()
        });
        
        const transcriptionResult = pollingResponse.data;

        if (transcriptionResult.status === 'completed') {
          console.log(`Transcription completed for session ${sessionId}`);
          
          // Process utterances
          if (transcriptionResult.utterances && transcriptionResult.utterances.length > 0) {
            const processedUtterances = this.processUtterances(transcriptionResult.utterances);
            
            // Send transcription results
            ws.send(JSON.stringify({
              type: 'transcription',
              sessionId,
              data: {
                utterances: processedUtterances,
                transcript: transcriptionResult.text,
                confidence: transcriptionResult.confidence,
                language_code: transcriptionResult.language_code,
                audio_duration: transcriptionResult.audio_duration,
                timestamp: new Date().toISOString()
              }
            }));
          }
          
          // Remove from active transcriptions
          this.activeTranscriptions.delete(sessionId);
          break;
          
        } else if (transcriptionResult.status === 'error') {
          console.error(`Transcription failed for session ${sessionId}:`, transcriptionResult.error);
          
          ws.send(JSON.stringify({
            type: 'error',
            message: 'Transcription failed',
            error: transcriptionResult.error
          }));
          
          this.activeTranscriptions.delete(sessionId);
          break;
          
        } else {
          // Still processing, wait and poll again
          console.log(`Transcription status for session ${sessionId}: ${transcriptionResult.status}`);
          await new Promise(resolve => setTimeout(resolve, 3000));
        }
        
      } catch (error) {
        console.error(`Error polling transcription status for session ${sessionId}:`, error);
        ws.send(JSON.stringify({
          type: 'error',
          message: 'Error checking transcription status',
          error: error.message
        }));
        break;
      }
    }
  }

  processUtterances(utterances) {
    // Map speakers A, B, C, etc. to Doctor, Patient, etc.
    const speakerMap = new Map();
    
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
    
    // Clean up active transcriptions
    this.activeTranscriptions.delete(sessionId);
    
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
const wsServer = new AssemblyAIRESTTranscriptionServer();

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\nShutting down AssemblyAI REST WebSocket server...');
  wsServer.wss.close(() => {
    console.log('AssemblyAI REST WebSocket server closed');
    process.exit(0);
  });
});

process.on('SIGTERM', () => {
  console.log('\nShutting down AssemblyAI REST WebSocket server...');
  wsServer.wss.close(() => {
    console.log('AssemblyAI REST WebSocket server closed');
    process.exit(0);
  });
});
