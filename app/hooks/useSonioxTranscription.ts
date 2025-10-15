'use client';

import { useState, useRef, useCallback } from 'react';
import { TranscriptionSegment } from '../types';

const SONIOX_WEBSOCKET_URL = "ws://localhost:8080";

// Get Soniox STT config for Bengali medical conversations
function getConfig(apiKey: string) {
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

export function useSonioxTranscription() {
  const [segments, setSegments] = useState<TranscriptionSegment[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const finalTokensRef = useRef<any[]>([]);

  // Convert Blob -> base64
  const blobToBase64 = (blob: Blob) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result?.toString().split(',')[1] || '');
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });

  const startRecording = useCallback(async () => {
    setError(null);
    finalTokensRef.current = [];
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          sampleRate: 16000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true
        } 
      });
      
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });
      mediaRecorderRef.current = mediaRecorder;

      // Open WebSocket connection to our server
      const ws = new WebSocket(SONIOX_WEBSOCKET_URL);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('Connected to WebSocket server, starting Soniox connection...');
        setIsConnected(true);
        // Now send the start command to initialize Soniox
        ws.send(JSON.stringify({ type: 'start' }));
      };

      ws.onmessage = (event) => {
        try {
          const res = JSON.parse(event.data);

          // Handle different message types from our server
          if (res.type === 'connected') {
            console.log('Connected to Soniox via server, starting recording...');
            setIsRecording(true);
            mediaRecorder.start(250); // Start recording in 250ms chunks
            return;
          }

          if (res.type === 'error') {
            console.error(`Soniox Error: ${res.message}`);
            setError(`Soniox Error: ${res.message}`);
            return;
          }

          if (res.type === 'final') {
            // Add final segment
            const speakerType: 'Doctor' | 'Patient' = res.speaker.includes('Speaker 1') ? 'Doctor' : 'Patient';
            setSegments((prev) => [
              ...prev,
              { 
                speaker: speakerType, 
                text: res.text, 
                timestamp: new Date(),
                isFinal: true,
                confidence: res.confidence || 0.9
              },
            ]);
          }

          if (res.type === 'interim') {
            // Update interim segments
            const speakerType: 'Doctor' | 'Patient' = res.speaker.includes('Speaker 1') ? 'Doctor' : 'Patient';
            
            setSegments((prev) => {
              // Remove previous interim segments
              const filtered = prev.filter(seg => seg.isFinal);
              
              // Add new interim segment
              return [
                ...filtered,
                { 
                  speaker: speakerType, 
                  text: res.text, 
                  timestamp: new Date(),
                  isFinal: false,
                  confidence: res.confidence || 0.7
                },
              ];
            });
          }

          if (res.type === 'finished') {
            console.log('Transcription session finished');
          }

        } catch (err) {
          console.error('Error parsing message:', err);
        }
      };

      ws.onerror = (err) => {
        console.error('WebSocket error:', err);
        setError('WebSocket connection error');
        setIsConnected(false);
      };

      ws.onclose = () => {
        setIsConnected(false);
        setIsRecording(false);
      };

      // Handle audio data
      let chunks: BlobPart[] = [];
      
      mediaRecorder.ondataavailable = async (e) => {
        if (e.data.size > 0 && ws.readyState === WebSocket.OPEN) {
          chunks.push(e.data);
          
          // Send audio chunk every 250ms
          if (chunks.length >= 2) {
            const audioBlob = new Blob(chunks, { type: 'audio/webm' });
            const base64 = await blobToBase64(audioBlob);
            ws.send(JSON.stringify({ type: 'audio', audio: base64 }));
            chunks = [];
          }
        }
      };

      mediaRecorder.onstop = () => {
        if (ws.readyState === WebSocket.OPEN) {
          // Send remaining chunks
          if (chunks.length > 0) {
            const audioBlob = new Blob(chunks, { type: 'audio/webm' });
            blobToBase64(audioBlob).then(base64 => {
              ws.send(JSON.stringify({ type: 'audio', audio: base64 }));
              ws.send(JSON.stringify({ type: 'end' })); // End of stream
            });
          } else {
            ws.send(JSON.stringify({ type: 'end' })); // End of stream
          }
        }
        
        // Stop all tracks
        stream.getTracks().forEach(track => track.stop());
      };
      
    } catch (err: any) {
      console.error('Recording error:', err);
      setError(err.message || 'Recording failed');
    }
  }, []);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.close();
    }
  }, []);

  const clearSegments = useCallback(() => {
    setSegments([]);
    setError(null);
    finalTokensRef.current = [];
  }, []);

  return {
    segments,
    isRecording,
    isConnected,
    error,
    startRecording,
    stopRecording,
    clearSegments,
  };
}
