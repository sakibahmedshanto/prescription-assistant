const WebSocket = require('ws');

class SonioxTranscriptionServer {
  constructor() {
    this.wss = new WebSocket.Server({ port: 8081 }); // Different port
    this.sonioxWs = null;
    console.log('Starting Soniox proxy server on port 8081...');
    this.setupWebSocketServer();
  }

  setupWebSocketServer() {
    this.wss.on('connection', (ws, request) => {
      const sessionId = new URL(request.url).searchParams.get('sessionId') || `soniox_${Date.now()}`;
      console.log(`Soniox proxy connected for session: ${sessionId}`);

      // Connect to Soniox
      const sonioxUrl = `wss://stt-rt.soniox.com/transcribe-websocket?api_key=${process.env.SONIOX_API_KEY}`;
      this.sonioxWs = new WebSocket(sonioxUrl);

      this.sonioxWs.onopen = () => {
        ws.send(JSON.stringify({ type: 'connected', sessionId }));
        this.sonioxWs.send(JSON.stringify({
          type: 'start',
          config: {
            enable_speaker_labels: true,
            language: 'auto', // Detect English/Bangla
            interim_results: true,
          }
        }));
      };

      // Forward audio from client to Soniox
      ws.on('message', (data) => {
        if (this.sonioxWs.readyState === WebSocket.OPEN) {
          this.sonioxWs.send(data); // Binary or text
        }
      });

      // Forward Soniox responses to client, mapping speakers
      this.sonioxWs.onmessage = (event) => {
        const message = JSON.parse(event.data);
        if (message.tokens) {
          // Map Soniox speakers to Doctor/Patient (e.g., based on utterance count or voice profile)
          message.tokens.forEach(token => {
            if (token.speaker === 'A') token.speaker = 'Doctor'; // Simple mapping; enhance with logic
            if (token.speaker === 'B') token.speaker = 'Patient';
          });
        }
        ws.send(JSON.stringify(message));
      };

      ws.onclose = () => {
        this.sonioxWs?.close();
      };
    });
  }
}

require('dotenv').config();
new SonioxTranscriptionServer();