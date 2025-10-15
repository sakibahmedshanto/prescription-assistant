// app/api/transcribe-soniox/route.ts
import { NextRequest, NextResponse } from 'next/server';
import WebSocket from 'ws';

const SONIOX_WEBSOCKET_URL = "wss://stt-rt.soniox.com/transcribe-websocket";

// Get Soniox STT config for Bengali medical conversations
function getConfig(apiKey: string) {
  return {
    // Get your API key at console.soniox.com, then run: export SONIOX_API_KEY=<YOUR_API_KEY>
    api_key: apiKey,

    // Select the model to use for Bengali
    model: "stt-rt-preview",

    // Set Bengali language hints for medical context
    language_hints: ["bn", "en"],

    // Enable language identification
    enable_language_identification: true,

    // Enable speaker diarization for doctor-patient conversations
    enable_speaker_diarization: true,

    // Set medical context to improve recognition of Bengali medical terms
    context: `
      ডাক্তার, রোগী, চিকিৎসা, ঔষধ, প্রেসক্রিপশন, ডায়াবেটিস, উচ্চ রক্তচাপ, জ্বর, মাথাব্যথা, 
      পেটে ব্যথা, কাশি, সর্দি, অ্যালার্জি, ইনফেকশন, ট্যাবলেট, ক্যাপসুল, সিরাপ, ইনজেকশন,
      রক্ত পরীক্ষা, এক্স-রে, সিটি স্ক্যান, এমআরআই, ইসিজি, ব্লাড প্রেসার, সুগার লেভেল,
      চিকিৎসকের পরামর্শ, রোগের লক্ষণ, চিকিৎসার পরিকল্পনা, ফলো-আপ, পরবর্তী অ্যাপয়েন্টমেন্ট
    `,

    // Use endpointing to detect when the speaker stops
    enable_endpoint_detection: true,

    // Audio format for real-time streaming
    audio_format: "pcm_s16le",
    sample_rate: 16000,
    num_channels: 1,
  };
}

export async function POST(req: NextRequest) {
  try {
    const { audioChunkBase64 } = await req.json();

    if (!audioChunkBase64) {
      return NextResponse.json({ error: 'No audio chunk provided' }, { status: 400 });
    }

    const apiKey = process.env.SONIOX_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'SONIOX_API_KEY not configured' }, { status: 500 });
    }

    const config = getConfig(apiKey);
    const audioBuffer = Buffer.from(audioChunkBase64, 'base64');

    return new Promise((resolve, reject) => {
      const ws = new WebSocket(SONIOX_WEBSOCKET_URL);
      let finalTokens: any[] = [];
      let transcript: string[] = [];

      ws.on('open', () => {
        // Send config first
        ws.send(JSON.stringify(config));
        // Send audio data
        ws.send(audioBuffer);
        // Send empty string to signal end-of-audio
        ws.send("");
      });

      ws.on('message', (data) => {
        try {
          const res = JSON.parse(data.toString());

          // Handle errors
          if (res.error_code) {
            console.error(`Soniox Error: ${res.error_code} - ${res.error_message}`);
            ws.close();
            reject(NextResponse.json({ error: res.error_message }, { status: 500 }));
            return;
          }

          // Process tokens
          let nonFinalTokens: any[] = [];
          if (res.tokens) {
            for (const token of res.tokens) {
              if (token.text) {
                if (token.is_final) {
                  finalTokens.push(token);
                } else {
                  nonFinalTokens.push(token);
                }
              }
            }
          }

          // Convert tokens to readable transcript with speaker info
          const allTokens = [...finalTokens, ...nonFinalTokens];
          let currentText = '';
          let currentSpeaker = null;

          for (const token of allTokens) {
            const { text, speaker, language } = token;
            
            if (speaker && speaker !== currentSpeaker) {
              if (currentSpeaker !== null) currentText += '\n';
              currentSpeaker = speaker;
              currentText += `Speaker ${currentSpeaker}: `;
            }
            
            currentText += text;
          }

          if (currentText.trim()) {
            transcript.push(currentText.trim());
          }

          // Session finished
          if (res.finished) {
            ws.close();
            resolve(NextResponse.json({ 
              success: true, 
              transcription: transcript.join('\n'),
              tokens: finalTokens,
              speaker_count: new Set(finalTokens.map(t => t.speaker).filter(Boolean)).size
            }));
          }
        } catch (err) {
          console.error('Error parsing Soniox message:', err);
          reject(NextResponse.json({ error: 'Failed to parse response' }, { status: 500 }));
        }
      });

      ws.on('error', (err) => {
        console.error('WebSocket error:', err);
        reject(NextResponse.json({ error: err.message }, { status: 500 }));
      });

      ws.on('close', () => {
        if (transcript.length === 0) {
          resolve(NextResponse.json({ success: true, transcription: '' }));
        }
      });
    });
  } catch (err: any) {
    console.error('Soniox transcription error:', err);
    return NextResponse.json({ error: err.message || 'Failed to transcribe' }, { status: 500 });
  }
}
