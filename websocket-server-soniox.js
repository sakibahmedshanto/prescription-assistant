const WebSocket = require('ws');
const path = require('path');
const fs = require('fs');

// Load environment variables from .env.local (Next.js) or .env
const envLocalPath = path.join(__dirname, '.env.local');
const envPath = path.join(__dirname, '.env');

if (fs.existsSync(envLocalPath)) {
  require('dotenv').config({ path: envLocalPath });
  console.log('Loaded environment variables from .env.local');
} else if (fs.existsSync(envPath)) {
  require('dotenv').config({ path: envPath });
  console.log('Loaded environment variables from .env');
} else {
  console.warn('Warning: No .env.local or .env file found');
}

const SONIOX_WEBSOCKET_URL = "wss://stt-rt.soniox.com/transcribe-websocket";

class SonioxTranscriptionServer {
  constructor() {
    this.wss = new WebSocket.Server({ port: 8080 });
    this.connections = new Map();
    this.activeStreams = new Map();
    this.setupWebSocketServer();
    console.log('Soniox WebSocket server running on port 8080');
  }

  setupWebSocketServer() {
    this.wss.on('connection', (ws, request) => {
      const url = new URL(request.url, `http://${request.headers.host}`);
      const sessionId = url.searchParams.get('sessionId');

      if (!sessionId) {
        ws.send(JSON.stringify({
          type: 'error',
          message: 'Session ID is required'
        }));
        ws.close();
        return;
      }

      console.log(`New connection for session: ${sessionId}`);
      this.connections.set(sessionId, ws);

      ws.on('message', (message) => {
        try {
          const data = JSON.parse(message);
          this.handleMessage(sessionId, data);
        } catch (error) {
          console.error('Error parsing message:', error);
          ws.send(JSON.stringify({
            type: 'error',
            message: 'Invalid message format'
          }));
        }
      });

      ws.on('close', () => {
        console.log(`Connection closed for session: ${sessionId}`);
        this.connections.delete(sessionId);
        this.stopTranscriptionStream(sessionId);
      });

      ws.on('error', (error) => {
        console.error(`WebSocket error for session ${sessionId}:`, error);
        this.connections.delete(sessionId);
        this.stopTranscriptionStream(sessionId);
      });

      // Send welcome message
      ws.send(JSON.stringify({
        type: 'connected',
        message: 'Connected to Soniox transcription server',
        sessionId: sessionId
      }));
    });
  }

  async handleMessage(sessionId, message) {
    switch (message.type) {
      case 'start_stream':
        await this.startTranscriptionStream(sessionId, message.config);
        break;

      case 'audio_chunk':
        await this.handleAudioChunk(sessionId, message.audioData, message.config);
        break;

      case 'stop_stream':
        await this.stopTranscriptionStream(sessionId);
        break;

      default:
        this.sendToSession(sessionId, {
          type: 'error',
          message: `Unknown message type: ${message.type}`
        });
    }
  }

  async startTranscriptionStream(sessionId, config) {
    try {
      // Stop any existing stream
      await this.stopTranscriptionStream(sessionId);

      console.log(`Starting Soniox transcription stream for session: ${sessionId}`);

      // Get API key from environment
      const apiKey = process.env.SONIOX_API_KEY;
      if (!apiKey) {
        this.sendToSession(sessionId, {
          type: 'error',
          message: 'SONIOX_API_KEY environment variable not set'
        });
        return;
      }

      // Create Soniox config
      const sonioxConfig = this.getSonioxConfig(apiKey, config);

      // Connect to Soniox WebSocket
      const sonioxWs = new WebSocket(SONIOX_WEBSOCKET_URL);

      sonioxWs.on('open', () => {
        console.log('Connected to Soniox WebSocket');
        // Send config to Soniox
        sonioxWs.send(JSON.stringify(sonioxConfig));
        
        // Store the Soniox WebSocket connection
        this.activeStreams.set(sessionId, sonioxWs);

        this.sendToSession(sessionId, {
          type: 'stream_started',
          message: 'Soniox transcription stream started'
        });
      });

      sonioxWs.on('message', (data) => {
        try {
          const response = JSON.parse(data.toString());
          this.handleSonioxResponse(sessionId, response);
        } catch (error) {
          console.error('Error parsing Soniox response:', error);
        }
      });

      sonioxWs.on('close', () => {
        console.log('Soniox WebSocket connection closed');
        this.activeStreams.delete(sessionId);
        this.sendToSession(sessionId, {
          type: 'stream_stopped',
          message: 'Soniox transcription stream stopped'
        });
      });

      sonioxWs.on('error', (error) => {
        console.error('Soniox WebSocket error:', error);
        this.activeStreams.delete(sessionId);
        this.sendToSession(sessionId, {
          type: 'error',
          message: 'Soniox WebSocket connection error',
          error: error.message
        });
      });

    } catch (error) {
      console.error(`Error starting Soniox stream for session ${sessionId}:`, error);
      this.sendToSession(sessionId, {
        type: 'error',
        message: 'Failed to start Soniox transcription stream',
        error: error.message
      });
    }
  }

  getSonioxConfig(apiKey, config) {
    const sonioxConfig = {
      api_key: apiKey,
      model: "stt-rt-preview",
      language_hints: ["en", "es"],
      enable_language_identification: true,
      enable_speaker_diarization: true,
      context: `
        Celebrex, Zyrtec, Xanax, Prilosec, Amoxicillin Clavulanate Potassium
        The customer, Maria Lopez, contacted BrightWay Insurance to update her auto policy
        after purchasing a new vehicle.
        Doctor, patient, prescription, medication, dosage, side effects, symptoms, diagnosis,
        treatment, therapy, medical history, allergies, blood pressure, diabetes, hypertension,
        cholesterol, pain management, antibiotics, vitamins, supplements.
      `,
      enable_endpoint_detection: true,
    };

    // Set audio format based on config
    if (config?.encoding === 'WEBM_OPUS') {
      sonioxConfig.audio_format = 'auto';
      console.log('Using WEBM_OPUS format (auto-detect)');
    } else if (config?.encoding === 'LINEAR16') {
      sonioxConfig.audio_format = 'pcm_s16le';
      sonioxConfig.sample_rate = config.sampleRateHertz || 16000;
      sonioxConfig.num_channels = 1;
      console.log(`Using LINEAR16 PCM format: ${sonioxConfig.sample_rate}Hz, ${sonioxConfig.num_channels} channel(s)`);
    } else {
      sonioxConfig.audio_format = 'auto';
      console.log('Using auto-detect format');
    }

    return sonioxConfig;
  }

  async handleAudioChunk(sessionId, audioData, config) {
    const sonioxWs = this.activeStreams.get(sessionId);
    if (sonioxWs && sonioxWs.readyState === WebSocket.OPEN) {
      try {
        // Convert base64 to buffer
        const audioBuffer = Buffer.from(audioData, 'base64');
        
        // Send audio data to Soniox
        sonioxWs.send(audioBuffer);
        
      } catch (error) {
        console.error('Error sending audio chunk to Soniox:', error);
      }
    }
  }

  handleSonioxResponse(sessionId, response) {
    // Handle Soniox error response
    if (response.error_code) {
      console.error(`Soniox error: ${response.error_code} - ${response.error_message}`);
      this.sendToSession(sessionId, {
        type: 'error',
        message: `Soniox error: ${response.error_message}`,
        error_code: response.error_code
      });
      return;
    }

    // Process tokens from response
    let finalTokens = [];
    let nonFinalTokens = [];

    if (response.tokens) {
      for (const token of response.tokens) {
        if (token.text) {
          if (token.is_final) {
            finalTokens.push(token);
          } else {
            nonFinalTokens.push(token);
          }
        }
      }
    }

    // Convert tokens to our format
    const transcriptionData = this.convertSonioxTokens(finalTokens, nonFinalTokens);

    // Send transcription result to client
    this.sendToSession(sessionId, {
      type: 'transcription',
      data: transcriptionData,
      isFinal: response.finished || false
    });

    // Handle session completion
    if (response.finished) {
      console.log(`Soniox session finished for session: ${sessionId}`);
      this.sendToSession(sessionId, {
        type: 'session_finished',
        message: 'Transcription session completed'
      });
    }
  }

  convertSonioxTokens(finalTokens, nonFinalTokens) {
    const allTokens = [...finalTokens, ...nonFinalTokens];
    const speakerSegments = [];
    let currentSpeaker = null;
    let currentSegment = null;

    for (const token of allTokens) {
      const { text, speaker, language } = token;
      const isTranslation = token.translation_status === "translation";

      // Speaker changed -> create new segment
      if (speaker && speaker !== currentSpeaker) {
        if (currentSegment) {
          speakerSegments.push(currentSegment);
        }
        
        currentSpeaker = speaker;
        currentSegment = {
          speaker: `Speaker ${currentSpeaker}`,
          text: text?.replace(/<end>/g, '').trim() || '',
          language: language,
          isTranslation: isTranslation,
          isFinal: token.is_final || false,
          confidence: 1.0, // Soniox doesn't provide confidence scores
          timestamp: new Date().toISOString()
        };
      } else {
        // Add to current segment
        if (currentSegment) {
          currentSegment.text += text?.replace(/<end>/g, '') || '';
          currentSegment.isFinal = token.is_final || currentSegment.isFinal;
        } else {
          // Create new segment if none exists
          currentSegment = {
            speaker: speaker ? `Speaker ${speaker}` : 'Unknown',
            text: text?.replace(/<end>/g, '').trim() || '',
            language: language,
            isTranslation: isTranslation,
            isFinal: token.is_final || false,
            confidence: 1.0,
            timestamp: new Date().toISOString()
          };
        }
      }
    }

    // Add the last segment
    if (currentSegment) {
      speakerSegments.push(currentSegment);
    }

    return {
      speakerSegments: speakerSegments,
      finalTokens: finalTokens,
      nonFinalTokens: nonFinalTokens,
      confidence: 1.0
    };
  }

  async stopTranscriptionStream(sessionId) {
    const sonioxWs = this.activeStreams.get(sessionId);
    if (sonioxWs && sonioxWs.readyState === WebSocket.OPEN) {
      try {
        // Send empty string to signal end-of-audio to Soniox
        sonioxWs.send('');
        
        // Close the connection after a short delay
        setTimeout(() => {
          sonioxWs.close();
        }, 1000);
        
        console.log(`Stopped Soniox transcription stream for session: ${sessionId}`);
      } catch (error) {
        console.error(`Error stopping Soniox stream for session ${sessionId}:`, error);
      }
    }
    this.activeStreams.delete(sessionId);
  }

  sendToSession(sessionId, message) {
    const ws = this.connections.get(sessionId);
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    }
  }
}

// Start the server
new SonioxTranscriptionServer();
