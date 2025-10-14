'use client';

import { useState, useRef, useCallback } from 'react';
import { TranscriptionSegment } from '../types';

export function useSonioxTranscription() {
  const [segments, setSegments] = useState<TranscriptionSegment[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

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
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      let chunks: BlobPart[] = [];

      // Open WebSocket connection
      const ws = new WebSocket(`wss://api.soniox.com/realtime?language=bn-BD`, [
        'soniox-realtime'
      ]);
      wsRef.current = ws;

      ws.onopen = () => setIsRecording(true);
      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.type === 'transcript' && msg.text) {
            setSegments((prev) => [
              ...prev,
              { speaker: msg.speaker || 'Patient', text: msg.text, timestamp: new Date() },
            ]);
          }
        } catch (err) {
          console.error('Error parsing Soniox message:', err);
        }
      };

      ws.onerror = (err) => setError('WebSocket error: ' + err);

      mediaRecorder.ondataavailable = async (e) => {
        if (ws.readyState === WebSocket.OPEN && e.data.size > 0) {
          const base64 = await blobToBase64(e.data);
          ws.send(JSON.stringify({ type: 'audio', audio: base64 }));
        }
      };

      mediaRecorder.onstop = () => {
        setIsRecording(false);
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: 'EOS' }));
          ws.close();
        }
      };

      mediaRecorder.start(250); // chunk every 250ms
    } catch (err: any) {
      console.error('Recording error:', err);
      setError(err.message || 'Recording failed');
    }
  }, []);

  const stopRecording = useCallback(() => {
    mediaRecorderRef.current?.stop();
    mediaRecorderRef.current = null;
  }, []);

  const clearSegments = useCallback(() => {
    setSegments([]);
    setError(null);
  }, []);

  return {
    segments,
    isRecording,
    error,
    startRecording,
    stopRecording,
    clearSegments,
  };
}
