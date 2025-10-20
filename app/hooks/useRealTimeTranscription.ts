'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { TranscriptionSegment } from '../types';

interface UseRealTimeTranscriptionReturn {
  isConnected: boolean;
  isRecording: boolean;
  segments: TranscriptionSegment[];
  error: string | null;
  startRecording: () => Promise<void>;
  stopRecording: () => void;
  connect: () => void;
  disconnect: () => void;
}

export function useRealTimeTranscription(): UseRealTimeTranscriptionReturn {
  const [isConnected, setIsConnected] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [segments, setSegments] = useState<TranscriptionSegment[]>([]);
  const [error, setError] = useState<string | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const sessionIdRef = useRef<string>(generateSessionId());
  const audioChunksRef = useRef<Blob[]>([]);

  // Generate unique session ID
  function generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Connect to WebSocket server
  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    try {
      const wsUrl = `ws://localhost:8080?sessionId=${sessionIdRef.current}`;
      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        console.log('WebSocket connected');
        setIsConnected(true);
        setError(null);
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          handleWebSocketMessage(message);
        } catch (err) {
          console.error('Error parsing WebSocket message:', err);
        }
      };

      ws.onclose = () => {
        console.log('WebSocket disconnected');
        setIsConnected(false);
        setIsRecording(false);
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        setError('WebSocket connection error');
        setIsConnected(false);
      };

      wsRef.current = ws;
    } catch (err) {
      console.error('Error connecting to WebSocket:', err);
      setError('Failed to connect to transcription server');
    }
  }, []);

  // Disconnect from WebSocket
  const disconnect = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setIsConnected(false);
    setIsRecording(false);
  }, []);

  // Handle WebSocket messages
  const handleWebSocketMessage = useCallback((message: any) => {
    switch (message.type) {
      case 'connected':
        console.log('Connected to transcription server:', message.message);
        break;

      case 'transcription':
        handleTranscriptionResult(message.data);
        break;

      case 'stream_started':
        console.log('Transcription stream started');
        break;

      case 'stream_stopped':
        console.log('Transcription stream stopped');
        break;

      case 'error':
        setError(message.message);
        break;

      default:
        console.log('Unknown message type:', message.type);
    }
  }, []);

  // Handle transcription results
  const handleTranscriptionResult = useCallback((data: any) => {
    if (data.speakerSegments && data.speakerSegments.length > 0) {
      const newSegments: TranscriptionSegment[] = data.speakerSegments.map((seg: any) => ({
        speaker: seg.speaker,
        text: seg.text,
        timestamp: new Date(),
        isFinal: seg.isFinal || false,
        confidence: data.confidence,
      }));

      if (data.isFinal) {
        // Add final segments to the list
        setSegments(prev => [...prev, ...newSegments]);
      } else {
        // Update interim results (you might want to handle this differently)
        setSegments(prev => {
          // Remove previous interim results and add new ones
          const finalSegments = prev.filter(seg => seg.isFinal !== false);
          return [...finalSegments, ...newSegments];
        });
      }
    }
  }, []);

  // Start recording
  const startRecording = useCallback(async () => {
    if (!isConnected) {
      setError('Not connected to transcription server');
      return;
    }

    if (isRecording) {
      return;
    }

    try {
      setError(null);

      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 48000,
        }
      });

      streamRef.current = stream;
      audioChunksRef.current = [];

      // Create MediaRecorder with small time slices for real-time streaming
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus',
      });

      mediaRecorder.ondataavailable = (event) => {
        // Only send chunks that are large enough (at least 1KB)
        // This filters out silence and very small/invalid chunks
        if (event.data.size > 1000) {
          audioChunksRef.current.push(event.data);
          
          // Send audio chunk to WebSocket
          sendAudioChunk(event.data);
        } else if (event.data.size > 0) {
          console.log(`Skipping small audio chunk: ${event.data.size} bytes (likely silence)`);
        }
      };

      mediaRecorder.onstart = () => {
        setIsRecording(true);
        console.log('Recording started');
        
        // Start transcription stream
        if (wsRef.current?.readyState === WebSocket.OPEN) {
          wsRef.current.send(JSON.stringify({
            type: 'start_stream',
            config: {
              encoding: 'WEBM_OPUS',
              sampleRateHertz: 48000,
              languageCode: 'en-US',
            }
          }));
        }
      };

      mediaRecorder.onstop = () => {
        setIsRecording(false);
        console.log('Recording stopped');
        
        // Stop transcription stream
        if (wsRef.current?.readyState === WebSocket.OPEN) {
          wsRef.current.send(JSON.stringify({
            type: 'stop_stream'
          }));
        }
      };

      mediaRecorderRef.current = mediaRecorder;
      
      // Start recording with small time slices for real-time streaming
      mediaRecorder.start(1000); // Collect data every 1 second

    } catch (err: any) {
      console.error('Error starting recording:', err);
      setError(err.message || 'Failed to start recording');
    }
  }, [isConnected, isRecording]);

  // Stop recording
  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    setIsRecording(false);
  }, []);

  // Send audio chunk to WebSocket
  const sendAudioChunk = useCallback(async (audioBlob: Blob) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      try {
        // Skip empty or very small blobs
        if (!audioBlob || audioBlob.size < 100) {
          console.log('Skipping empty or too small audio blob');
          return;
        }

        // Convert blob to base64
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        
        reader.onloadend = () => {
          const base64Audio = reader.result?.toString().split(',')[1];
          if (base64Audio && base64Audio.length > 0) {
            wsRef.current?.send(JSON.stringify({
              type: 'audio_chunk',
              audioData: base64Audio,
              config: {
                encoding: 'WEBM_OPUS',
                sampleRateHertz: 48000,
                languageCode: 'en-US',
              }
            }));
          }
        };
      } catch (err) {
        console.error('Error sending audio chunk:', err);
      }
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopRecording();
      disconnect();
    };
  }, [stopRecording, disconnect]);

  // Auto-connect on mount
  useEffect(() => {
    connect();
    
    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  return {
    isConnected,
    isRecording,
    segments,
    error,
    startRecording,
    stopRecording,
    connect,
    disconnect,
  };
}
