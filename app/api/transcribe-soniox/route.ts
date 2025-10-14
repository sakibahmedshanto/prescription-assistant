// app/api/transcribe-soniox/route.ts
import { NextRequest, NextResponse } from 'next/server';
import WebSocket from 'ws';

export async function POST(req: NextRequest) {
  try {
    const { audioContentBase64 } = await req.json();

    if (!audioContentBase64) {
      return NextResponse.json({ error: 'No audio provided' }, { status: 400 });
    }

    // Connect to Soniox Realtime WebSocket API
    const wsUrl = `wss://api.soniox.com/realtime?language=bn`; // Bangla
    const ws = new WebSocket(wsUrl, {
      headers: {
        Authorization: `Bearer ${process.env.SONIOX_API_KEY}`,
      },
    });

    const audioBuffer = Buffer.from(audioContentBase64, 'base64');

    return new Promise((resolve, reject) => {
      let transcription: string[] = [];

      ws.on('open', () => {
        // Send audio chunks
        ws.send(audioBuffer);
        ws.send(JSON.stringify({ type: 'EOS' })); // End of stream
      });

      ws.on('message', (data) => {
        const msg = JSON.parse(data.toString());
        if (msg.type === 'transcript') {
          transcription.push(msg.text);
        }
      });

      ws.on('close', () => {
        resolve(NextResponse.json({ success: true, transcription: transcription.join(' ') }));
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
