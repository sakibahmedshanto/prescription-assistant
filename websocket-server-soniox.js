const WebSocket = require('ws');
const fs = require('fs');
require('dotenv').config();

const SONIOX_WEBSOCKET_URL = "wss://stt-rt.soniox.com/transcribe-websocket";

// Get Soniox STT config for Bengali medical conversations
function getConfig(apiKey) {
  return {
    api_key: apiKey,
    model: "stt-rt-preview",
    language_hints: ["bn", "en"],
    enable_language_identification: true,
    enable_speaker_diarization: true,
    context: `
      ডাক্তার, রোগী, চিকিৎসা, ঔষধ, প্রেসক্রিপশন, ডায়াবেটিস, উচ্চ রক্তচাপ, জ্বর, মাথাব্যথা, 
      পেটে ব্যথা, কাশি, সর্দি, অ্যালার্জি, ইনফেকশন, ট্যাবলেট, ক্যাপসুল, সিরাপ, ইনজেকশন,
      রক্ত পরীক্ষা, এক্স-রে, সিটি স্ক্যান, এমআরআই, ইসিজি, ব্লাড প্রেসার, সুগার লেভেল,
      চিকিৎসকের পরামর্শ, রোগের লক্ষণ, চিকিৎসার পরিকল্পনা, ফলো-আপ, পরবর্তী অ্যাপয়েন্টমেন্ট
    `,
    enable_endpoint_detection: true,
    audio_format: "pcm_s16le",
    sample_rate: 16000,
    num_channels: 1,
  };
}

// Convert tokens into readable transcript
function renderTokens(finalTokens, nonFinalTokens) {
  let textParts = [];
  let currentSpeaker = null;
  let currentLanguage = null;

  const allTokens = [...finalTokens, ...nonFinalTokens];

  // Process all tokens in order.
  for (const token of allTokens) {
    let { text, speaker, language } = token;
    const isTranslation = token.translation_status === "translation";

    // Speaker changed -> add a speaker tag.
    if (speaker && speaker !== currentSpeaker) {
      if (currentSpeaker !== null) textParts.push("\n\n");
      currentSpeaker = speaker;
      currentLanguage = null; // Reset language on speaker changes.
      textParts.push(`Speaker ${currentSpeaker}:`);
    }

    // Language changed -> add a language or translation tag.
    if (language && language !== currentLanguage) {
      currentLanguage = language;
      const prefix = isTranslation ? "[Translation] " : "";
      textParts.push(`\n${prefix}[${currentLanguage}] `);
      text = text.trimStart();
    }

    textParts.push(text);
  }

  textParts.push("\n===============================");
  return textParts.join("");
}

function runSession(apiKey, audioPath, audioFormat, translation) {
  const config = getConfig(apiKey);

  console.log("Connecting to Soniox...");
  const ws = new WebSocket(SONIOX_WEBSOCKET_URL);

  let finalTokens = [];

  ws.on("open", () => {
    // Send first request with config.
    ws.send(JSON.stringify(config));

    // Start streaming audio in the background.
    streamAudio(audioPath, ws).catch((err) =>
      console.error("Audio stream error:", err),
    );
    console.log("Session started.");
  });

  ws.on("message", (msg) => {
    const res = JSON.parse(msg.toString());

    // Error from server.
    if (res.error_code) {
      console.error(`Error: ${res.error_code} - ${res.error_message}`);
      ws.close();
      return;
    }

    // Parse tokens from current response.
    let nonFinalTokens = [];
    if (res.tokens) {
      for (const token of res.tokens) {
        if (token.text) {
          if (token.is_final) {
            // Final tokens are returned once and should be appended to final_tokens.
            finalTokens.push(token);
          } else {
            // Non-final tokens update as more audio arrives; reset them on every response.
            nonFinalTokens.push(token);
          }
        }
      }
    }

    // Render tokens.
    const text = renderTokens(finalTokens, nonFinalTokens);
    console.log(text);

    // Session finished.
    if (res.finished) {
      console.log("Session finished.");
      ws.close();
    }
  });

  ws.on("error", (err) => console.error("WebSocket error:", err));
}

// Read the audio file and send its bytes to the websocket.
async function streamAudio(audioPath, ws) {
  const stream = fs.createReadStream(audioPath, { highWaterMark: 3840 });

  for await (const chunk of stream) {
    ws.send(chunk);
    // Sleep for 120 ms to simulate real-time streaming.
    await new Promise((res) => setTimeout(res, 120));
  }

  // Empty string signals end-of-audio to the server
  ws.send("");
}

// WebSocket server for real-time Bengali transcription
const wss = new WebSocket.Server({ port: 8080 });

console.log('Bengali Soniox WebSocket server running on port 8080');

wss.on('connection', (ws) => {
  console.log('Client connected to Bengali transcription server');
  
  let sonioxWs = null;
  let finalTokens = [];
  
  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      
      if (data.type === 'start') {
        // Initialize Soniox connection
        const apiKey = process.env.SONIOX_API_KEY;
        if (!apiKey) {
          ws.send(JSON.stringify({ 
            type: 'error', 
            message: 'SONIOX_API_KEY not configured' 
          }));
          return;
        }
        
        const config = getConfig(apiKey);
        sonioxWs = new WebSocket(SONIOX_WEBSOCKET_URL);
        
        sonioxWs.on('open', () => {
          console.log('Connected to Soniox, sending config...');
          sonioxWs.send(JSON.stringify(config));
          ws.send(JSON.stringify({ type: 'connected' }));
        });
        
        sonioxWs.on('message', (msg) => {
          try {
            const res = JSON.parse(msg.toString());
            
            if (res.error_code) {
              console.error(`Soniox API Error: ${res.error_code} - ${res.error_message}`);
              ws.send(JSON.stringify({ 
                type: 'error', 
                message: `${res.error_code} - ${res.error_message}` 
              }));
              return;
            }
          
          let nonFinalTokens = [];
          if (res.tokens) {
            for (const token of res.tokens) {
              if (token.text) {
                if (token.is_final) {
                  finalTokens.push(token);
                  ws.send(JSON.stringify({
                    type: 'final',
                    speaker: token.speaker ? `Speaker ${token.speaker}` : 'Unknown',
                    text: token.text,
                    confidence: token.confidence || 0.9
                  }));
                } else {
                  nonFinalTokens.push(token);
                }
              }
            }
          }
          
          // Send interim results
          if (nonFinalTokens.length > 0) {
            const latestToken = nonFinalTokens[nonFinalTokens.length - 1];
            ws.send(JSON.stringify({
              type: 'interim',
              speaker: latestToken.speaker ? `Speaker ${latestToken.speaker}` : 'Unknown',
              text: latestToken.text,
              confidence: latestToken.confidence || 0.7
            }));
          }
          
          if (res.finished) {
            ws.send(JSON.stringify({ type: 'finished' }));
            sonioxWs.close();
          }
          } catch (parseErr) {
            console.error('Error parsing Soniox message:', parseErr);
            console.error('Raw message:', msg.toString());
            ws.send(JSON.stringify({ 
              type: 'error', 
              message: `Soniox message parse error: ${parseErr.message}` 
            }));
          }
        });
        
        sonioxWs.on('error', (err) => {
          console.error('Soniox WebSocket error:', err);
          ws.send(JSON.stringify({ 
            type: 'error', 
            message: `Soniox connection error: ${err.message}` 
          }));
        });
        
      } else if (data.type === 'audio' && sonioxWs) {
        // Forward audio data to Soniox
        const audioBuffer = Buffer.from(data.audio, 'base64');
        sonioxWs.send(audioBuffer);
      } else if (data.type === 'end' && sonioxWs) {
        // End of audio stream
        sonioxWs.send("");
      }
      
    } catch (err) {
      console.error('Error processing message:', err);
      console.error('Message was:', message.toString());
      ws.send(JSON.stringify({ 
        type: 'error', 
        message: `Invalid message format: ${err.message}` 
      }));
    }
  });
  
  ws.on('close', () => {
    console.log('Client disconnected');
    if (sonioxWs) {
      sonioxWs.close();
    }
  });
  
  ws.on('error', (err) => {
    console.error('Client WebSocket error:', err);
  });
});

// Handle command line usage
if (require.main === module) {
  const { parseArgs } = require('node:util');
  
  async function main() {
    const { values: argv } = parseArgs({
      options: {
        audio_path: { type: "string" },
        audio_format: { type: "string", default: "auto" },
        translation: { type: "string", default: "none" },
      },
    });

    const apiKey = process.env.SONIOX_API_KEY;
    if (!apiKey) {
      throw new Error(
        "Missing SONIOX_API_KEY.\n" +
          "1. Get your API key at https://console.soniox.com\n" +
          "2. Run: export SONIOX_API_KEY=<YOUR_API_KEY>",
      );
    }

    if (argv.audio_path) {
      runSession(apiKey, argv.audio_path, argv.audio_format, argv.translation);
    } else {
      console.log('Bengali Soniox WebSocket server started');
      console.log('Connect to ws://localhost:8080 for real-time transcription');
    }
  }

  main().catch((err) => {
    console.error("Error:", err.message);
    process.exit(1);
  });
}