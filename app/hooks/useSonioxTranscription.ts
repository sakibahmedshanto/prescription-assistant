// /hooks/useSonioxTranscription.ts
'use client';

import { useState, useCallback } from 'react';
import { TranscriptionSegment } from '../types';

export function useSonioxTranscription() {
  const [segments, setSegments] = useState<TranscriptionSegment[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      let chunks: BlobPart[] = [];

      mediaRecorder.ondataavailable = (e) => chunks.push(e.data);

      mediaRecorder.onstart = () => setIsRecording(true);

      mediaRecorder.onstop = async () => {
        setIsRecording(false);
        const blob = new Blob(chunks, { type: 'audio/webm' });
        const base64 = await blobToBase64(blob);

        try {
          const response = await fetch('/api/transcribe-soniox', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ audioContentBase64: base64 }),
          });

          const data = await response.json();

          if (data.success && data.transcription) {
            setSegments((prev) => [
              ...prev,
              { speaker: 'Patient', text: data.transcription, timestamp: new Date() },
            ]);
          } else {
            setError(data.error || 'Transcription failed');
          }
        } catch (err: any) {
          console.error('Error fetching transcription:', err);
          setError(err.message || 'Transcription API failed');
        }
      };

      mediaRecorder.start();

      // Example: record for 5 seconds, then stop automatically
      setTimeout(() => mediaRecorder.stop(), 5000);
    } catch (err: any) {
      console.error('Recording error:', err);
      setError(err.message || 'Recording failed');
    }
  }, []);

  const stopRecording = useCallback(() => {
    setIsRecording(false);
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
