const WebSocket = require('ws');
const speech = require('@google-cloud/speech');

// Initialize Google Cloud Speech client
const getSpeechClient = () => {
  const credentials = process.env.GOOGLE_CLOUD_CREDENTIALS 
    ? JSON.parse(process.env.GOOGLE_CLOUD_CREDENTIALS)
    : undefined;

  return new speech.SpeechClient({
    credentials,
    projectId: process.env.GOOGLE_CLOUD_PROJECT_ID,
  });
};

class TranscriptionWebSocketServer {
  constructor() {
    this.wss = new WebSocket.Server({ port: 8080 });
    this.speechClient = getSpeechClient();
    this.activeStreams = new Map();
    this.connections = new Map();
    
    console.log('Starting WebSocket server on port 8080...');
    this.setupWebSocketServer();
  }

  setupWebSocketServer() {
    this.wss.on('connection', (ws, request) => {
      const url = new URL(request.url, `http://${request.headers.host}`);
      const sessionId = url.searchParams.get('sessionId') || `session_${Date.now()}`;
      
      console.log(`WebSocket connection established for session: ${sessionId}`);
      
      // Store connection
      this.connections.set(sessionId, ws);
      
      // Send welcome message
      ws.send(JSON.stringify({
        type: 'connected',
        sessionId,
        message: 'WebSocket connection established',
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
        this.stopTranscriptionStream(sessionId);
      });

      // Handle errors
      ws.on('error', (error) => {
        console.error(`WebSocket error for session ${sessionId}:`, error);
        this.connections.delete(sessionId);
        this.stopTranscriptionStream(sessionId);
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

    console.log('WebSocket server ready on ws://localhost:8080');
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
      // Stop any existing stream
      await this.stopTranscriptionStream(sessionId);

      console.log(`Starting transcription stream for session: ${sessionId}`);

      // Configure recognition with streaming
      const recognitionConfig = {
        encoding: config?.encoding || 'WEBM_OPUS',
        sampleRateHertz: config?.sampleRateHertz || 48000,
        languageCode: config?.languageCode || 'en-US',
        enableAutomaticPunctuation: true,
        enableWordTimeOffsets: true,
        enableSpeakerDiarization: true,
        diarizationSpeakerCount: 2,
        model: 'medical_conversation',
        useEnhanced: true,
        interimResults: true,
        enableSeparateRecognitionPerChannel: false,
        diarizationConfig: {
          enableSpeakerDiarization: true,
          minSpeakerCount: 2,
          maxSpeakerCount: 2,
        },
      };

      // Create streaming recognition request
      const stream = this.speechClient.streamingRecognize({
        config: recognitionConfig,
        interimResults: true,
      });

      // Store the stream
      this.activeStreams.set(sessionId, stream);

      // Handle streaming results
      stream.on('data', (data) => {
        this.processTranscriptionResult(sessionId, data);
      });

      // Handle stream end
      stream.on('end', () => {
        console.log(`Transcription stream ended for session: ${sessionId}`);
        this.activeStreams.delete(sessionId);
      });

      // Handle stream errors
      stream.on('error', (error) => {
        console.error(`Stream error for session ${sessionId}:`, error);
        const ws = this.connections.get(sessionId);
        if (ws && ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({
            type: 'error',
            message: 'Transcription stream error',
            error: error.message
          }));
        }
        this.activeStreams.delete(sessionId);
      });

      // Send stream started message
      const ws = this.connections.get(sessionId);
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
          type: 'stream_started',
          sessionId,
          message: 'Transcription stream started',
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
      const stream = this.activeStreams.get(sessionId);
      if (stream) {
        // Convert base64 to buffer
        const audioBuffer = Buffer.from(audioData, 'base64');
        
        // Send audio data to Google Cloud Speech
        stream.write({
          audioContent: audioBuffer,
        });
      } else {
        console.warn(`No active stream found for session: ${sessionId}`);
      }
    } catch (error) {
      console.error(`Error handling audio chunk for session ${sessionId}:`, error);
    }
  }

  async stopTranscriptionStream(sessionId) {
    try {
      const stream = this.activeStreams.get(sessionId);
      if (stream) {
        console.log(`Stopping transcription stream for session: ${sessionId}`);
        stream.end();
        this.activeStreams.delete(sessionId);
        
        const ws = this.connections.get(sessionId);
        if (ws && ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({
            type: 'stream_stopped',
            sessionId,
            message: 'Transcription stream stopped',
            timestamp: new Date().toISOString()
          }));
        }
      }
    } catch (error) {
      console.error(`Error stopping transcription stream for session ${sessionId}:`, error);
    }
  }

  processTranscriptionResult(sessionId, data) {
    const ws = this.connections.get(sessionId);
    if (!ws || ws.readyState !== WebSocket.OPEN) return;

    try {
      const results = data.results;
      if (!results || results.length === 0) return;

      results.forEach((result) => {
        const alternative = result.alternatives?.[0];
        if (!alternative) return;

        const words = alternative.words?.map((wordInfo) => ({
          word: wordInfo.word,
          startTime: wordInfo.startTime,
          endTime: wordInfo.endTime,
          speakerTag: wordInfo.speakerTag,
        })) || [];

        // Process speaker segments
        const speakerSegments = this.groupBySpeaker(words, result.isFinal);

        // Send transcription result
        ws.send(JSON.stringify({
          type: 'transcription',
          sessionId,
          data: {
            transcript: alternative.transcript,
            confidence: alternative.confidence,
            isFinal: result.isFinal,
            words,
            speakerSegments,
            timestamp: new Date().toISOString()
          }
        }));
      });
    } catch (error) {
      console.error(`Error processing transcription result for session ${sessionId}:`, error);
    }
  }

  groupBySpeaker(words, isFinal) {
    if (words.length === 0) return [];

    const segments = [];
    let currentSpeaker = null;
    let currentText = '';
    let startTime = null;
    let endTime = null;

    // Create speaker map based on word count
    const speakerCounts = new Map();
    words.forEach(word => {
      const count = speakerCounts.get(word.speakerTag) || 0;
      speakerCounts.set(word.speakerTag, count + 1);
    });

    // Assign speaker labels (more words = Doctor)
    const speakers = Array.from(speakerCounts.entries()).sort((a, b) => b[1] - a[1]);
    const speakerMap = new Map();
    
    if (speakers.length >= 2) {
      speakerMap.set(speakers[0][0], 'Doctor');
      speakerMap.set(speakers[1][0], 'Patient');
    } else if (speakers.length === 1) {
      speakerMap.set(speakers[0][0], 'Doctor');
    }

    words.forEach((word) => {
      if (word.speakerTag !== currentSpeaker) {
        // Save previous segment
        if (currentSpeaker !== null && currentText) {
          segments.push({
            speaker: speakerMap.get(currentSpeaker) || 'Unknown',
            text: currentText.trim(),
            startTime,
            endTime,
            isFinal,
          });
        }
        // Start new segment
        currentSpeaker = word.speakerTag;
        currentText = word.word;
        startTime = word.startTime;
        endTime = word.endTime;
      } else {
        currentText += ' ' + word.word;
        endTime = word.endTime;
      }
    });

    // Add final segment
    if (currentSpeaker !== null && currentText) {
      segments.push({
        speaker: speakerMap.get(currentSpeaker) || 'Unknown',
        text: currentText.trim(),
        startTime,
        endTime,
        isFinal,
      });
    }

    return segments;
  }
}

// Load environment variables
require('dotenv').config();

// Create WebSocket server instance
const wsServer = new TranscriptionWebSocketServer();

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\nShutting down WebSocket server...');
  wsServer.wss.close(() => {
    console.log('WebSocket server closed');
    process.exit(0);
  });
});

process.on('SIGTERM', () => {
  console.log('\nShutting down WebSocket server...');
  wsServer.wss.close(() => {
    console.log('WebSocket server closed');
    process.exit(0);
  });
});
