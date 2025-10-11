'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { TranscriptionSegment } from '../types';

interface UseAssemblyAITranscriptionReturn {
  isConnected: boolean;
  isRecording: boolean;
  isProcessing: boolean;
  segments: TranscriptionSegment[];
  error: string | null;
  startRecording: () => Promise<void>;
  stopRecording: () => void;
  connect: () => void;
  disconnect: () => void;
}

export function useAssemblyAITranscription(): UseAssemblyAITranscriptionReturn {
  const [isConnected, setIsConnected] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [segments, setSegments] = useState<TranscriptionSegment[]>([]);
  const [error, setError] = useState<string | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const sessionIdRef = useRef<string>(generateSessionId());
  const audioChunksRef = useRef<Blob[]>([]);

  // Generate unique session ID
  function generateSessionId(): string {
    return `assemblyai_session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
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
        console.log('AssemblyAI WebSocket connected');
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
        console.log('AssemblyAI WebSocket disconnected');
        setIsConnected(false);
        setIsRecording(false);
        setIsProcessing(false);
      };

      ws.onerror = (error) => {
        console.error('AssemblyAI WebSocket error:', error);
        setError('WebSocket connection error');
        setIsConnected(false);
      };

      wsRef.current = ws;
    } catch (err) {
      console.error('Error connecting to AssemblyAI WebSocket:', err);
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
    setIsProcessing(false);
  }, []);

  // Handle WebSocket messages
  const handleWebSocketMessage = useCallback((message: any) => {
    switch (message.type) {
      case 'connected':
        console.log('Connected to AssemblyAI server:', message.message);
        break;

      case 'processing_started':
        setIsProcessing(true);
        console.log('AssemblyAI processing started');
        break;

      case 'transcription':
        handleTranscriptionResult(message.data);
        setIsProcessing(false);
        break;

      case 'stream_started':
        console.log('AssemblyAI stream started');
        break;

      case 'stream_stopped':
        console.log('AssemblyAI stream stopped');
        break;

      case 'error':
        setError(message.message);
        setIsProcessing(false);
        break;

      default:
        console.log('Unknown message type:', message.type);
    }
  }, []);

  // Handle transcription results from AssemblyAI
  const handleTranscriptionResult = useCallback((data: any) => {
    if (data.utterances && data.utterances.length > 0) {
      const newSegments: TranscriptionSegment[] = data.utterances.map((utterance: any) => ({
        speaker: utterance.speaker,
        text: utterance.text,
        timestamp: new Date(),
        isFinal: true,
        confidence: utterance.confidence,
        startTime: utterance.start,
        endTime: utterance.end,
      }));

      // Add new segments to the existing ones
      setSegments(prev => [...prev, ...newSegments]);
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

      // Create MediaRecorder with small time slices for streaming
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus',
      });

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
          
          // Send audio chunk to WebSocket
          sendAudioChunk(event.data);
        }
      };

      mediaRecorder.onstart = () => {
        setIsRecording(true);
        console.log('Recording started for AssemblyAI');
        
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
        console.log('Recording stopped for AssemblyAI');
        
        // Process any remaining audio
        if (wsRef.current?.readyState === WebSocket.OPEN) {
          wsRef.current.send(JSON.stringify({
            type: 'process_audio'
          }));
        }
      };

      mediaRecorderRef.current = mediaRecorder;
      
      // Start recording with 1-second chunks for AssemblyAI processing
      mediaRecorder.start(1000);

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
        // Convert blob to base64
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        
        reader.onloadend = () => {
          const base64Audio = reader.result?.toString().split(',')[1];
          if (base64Audio) {
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
    isProcessing,
    segments,
    error,
    startRecording,
    stopRecording,
    connect,
    disconnect,
  };
}
