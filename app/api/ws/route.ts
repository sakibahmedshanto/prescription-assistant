import { NextRequest } from 'next/server';
import speech from '@google-cloud/speech';
import { WebSocketServer } from 'ws';

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

// Store active WebSocket connections
const connections = new Map<string, any>();

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const sessionId = searchParams.get('sessionId') || 'default';

  if (request.headers.get('upgrade') !== 'websocket') {
    return new Response('Expected WebSocket upgrade', { status: 426 });
  }

  // Create WebSocket server
  const wss = new WebSocketServer({ noServer: true });

  return new Response(null, {
    status: 101,
    headers: {
      'Upgrade': 'websocket',
      'Connection': 'Upgrade',
    },
  });
}

// Alternative WebSocket implementation using a custom server
export class TranscriptionWebSocketServer {
  private wss: WebSocketServer;
  private speechClient: any;
  private activeStreams: Map<string, any> = new Map();

  constructor() {
    this.wss = new WebSocketServer({ port: 8081 });
    this.speechClient = getSpeechClient();
    this.setupWebSocketServer();
  }

  private setupWebSocketServer() {
    this.wss.on('connection', (ws, request) => {
      const url = new URL(request.url || '', `http://${request.headers.host}`);
      const sessionId = url.searchParams.get('sessionId') || 'default';

      console.log(`WebSocket connection established for session: ${sessionId}`);

      // Store connection
      connections.set(sessionId, ws);

      // Send welcome message
      ws.send(JSON.stringify({
        type: 'connected',
        sessionId,
        message: 'WebSocket connection established'
      }));

      // Handle incoming messages
      ws.on('message', async (data) => {
        try {
          const message = JSON.parse(data.toString());

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
              ws.send(JSON.stringify({ type: 'pong' }));
              break;
          }
        } catch (error) {
          console.error('Error processing WebSocket message:', error);
          ws.send(JSON.stringify({
            type: 'error',
            message: 'Failed to process message'
          }));
        }
      });

      // Handle connection close
      ws.on('close', () => {
        console.log(`WebSocket connection closed for session: ${sessionId}`);
        connections.delete(sessionId);
        this.stopTranscriptionStream(sessionId);
      });

      // Handle errors
      ws.on('error', (error) => {
        console.error(`WebSocket error for session ${sessionId}:`, error);
        connections.delete(sessionId);
        this.stopTranscriptionStream(sessionId);
      });
    });
  }

  private async startTranscriptionStream(sessionId: string, config: any) {
    try {
      // Stop any existing stream
      await this.stopTranscriptionStream(sessionId);

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
      stream.on('data', (data: any) => {
        const ws = connections.get(sessionId);
        if (ws && ws.readyState === ws.OPEN) {
          this.processTranscriptionResult(sessionId, data);
        }
      });

      // Handle stream end
      stream.on('end', () => {
        console.log(`Transcription stream ended for session: ${sessionId}`);
        this.activeStreams.delete(sessionId);
      });

      // Handle stream errors
      stream.on('error', (error: any) => {
        console.error(`Stream error for session ${sessionId}:`, error);
        const ws = connections.get(sessionId);
        if (ws && ws.readyState === ws.OPEN) {
          ws.send(JSON.stringify({
            type: 'error',
            message: 'Transcription stream error'
          }));
        }
        this.activeStreams.delete(sessionId);
      });

      // Send stream started message
      const ws = connections.get(sessionId);
      if (ws && ws.readyState === ws.OPEN) {
        ws.send(JSON.stringify({
          type: 'stream_started',
          sessionId,
          message: 'Transcription stream started'
        }));
      }

    } catch (error) {
      console.error(`Error starting transcription stream for session ${sessionId}:`, error);
      const ws = connections.get(sessionId);
      if (ws && ws.readyState === ws.OPEN) {
        ws.send(JSON.stringify({
          type: 'error',
          message: 'Failed to start transcription stream'
        }));
      }
    }
  }

  private async handleAudioChunk(sessionId: string, audioData: string, config: any) {
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

  private async stopTranscriptionStream(sessionId: string) {
    try {
      const stream = this.activeStreams.get(sessionId);
      if (stream) {
        stream.end();
        this.activeStreams.delete(sessionId);

        const ws = connections.get(sessionId);
        if (ws && ws.readyState === ws.OPEN) {
          ws.send(JSON.stringify({
            type: 'stream_stopped',
            sessionId,
            message: 'Transcription stream stopped'
          }));
        }
      }
    } catch (error) {
      console.error(`Error stopping transcription stream for session ${sessionId}:`, error);
    }
  }

  private processTranscriptionResult(sessionId: string, data: any) {
    const ws = connections.get(sessionId);
    if (!ws || ws.readyState !== ws.OPEN) return;

    try {
      const results = data.results;
      if (!results || results.length === 0) return;

      results.forEach((result: any) => {
        const alternative = result.alternatives?.[0];
        if (!alternative) return;

        const words = alternative.words?.map((wordInfo: any) => ({
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
          }
        }));
      });
    } catch (error) {
      console.error(`Error processing transcription result for session ${sessionId}:`, error);
    }
  }

  private groupBySpeaker(words: any[], isFinal: boolean) {
    if (words.length === 0) return [];

    const segments: any[] = [];
    let currentSpeaker: number | null = null;
    let currentText = '';
    let startTime: any = null;
    let endTime: any = null;

    // Create speaker map based on word count
    const speakerCounts = new Map<number, number>();
    words.forEach(word => {
      const count = speakerCounts.get(word.speakerTag) || 0;
      speakerCounts.set(word.speakerTag, count + 1);
    });

    // Assign speaker labels (more words = Doctor)
    const speakers = Array.from(speakerCounts.entries()).sort((a, b) => b[1] - a[1]);
    const speakerMap = new Map<number, string>();

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

// Create WebSocket server instance
let wsServer: TranscriptionWebSocketServer | null = null;

if (!wsServer) {
  wsServer = new TranscriptionWebSocketServer();
  console.log('WebSocket server started on port 8081');
}
