// app/api/transcribe-soniox/route.ts
import { NextRequest, NextResponse } from 'next/server';
import WebSocket from 'ws';

export async function POST(req: NextRequest) {
  try {
    const { audioChunkBase64 } = await req.json();

    if (!audioChunkBase64) {
      return NextResponse.json({ error: 'No audio chunk provided' }, { status: 400 });
    }

    // Connect to Soniox Realtime WebSocket API for Bangla
    const wsUrl = `wss://api.soniox.com/realtime?language=bn-BD`;
    const ws = new WebSocket(wsUrl, {
      headers: {
        Authorization: `Bearer ${process.env.SONIOX_API_KEY}`,
      },
    });

    const audioBuffer = Buffer.from(audioChunkBase64, 'base64');

    return new Promise((resolve, reject) => {
      let transcript: string[] = [];

      ws.on('open', () => {
        ws.send(audioBuffer); // send audio chunk
        ws.send(JSON.stringify({ type: 'EOS' })); // end-of-stream
      });

      ws.on('message', (data) => {
        try {
          const msg = JSON.parse(data.toString());
          if (msg.type === 'transcript') {
            transcript.push(msg.text);
          }
        } catch (err) {
          console.error('Error parsing Soniox message:', err);
        }
      });

      ws.on('close', () => {
        resolve(
          NextResponse.json({ success: true, transcription: transcript.join(' ') })
        );
      });

      ws.on('error', (err) => {
        reject(NextResponse.json({ error: err.message }, { status: 500 }));
      });
    });
  } catch (err: any) {
    console.error('Soniox transcription error:', err);
    return NextResponse.json({ error: err.message || 'Failed to transcribe' }, { status: 500 });
  }
}
