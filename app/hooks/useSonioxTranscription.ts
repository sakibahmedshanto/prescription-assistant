'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { TranscriptionSegment } from '../types';

interface UseSonioxTranscriptionReturn {
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

export function useSonioxTranscription(): UseSonioxTranscriptionReturn {
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
    return `soniox_session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
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
        console.log('Soniox WebSocket connected');
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
        console.log('Soniox WebSocket disconnected');
        setIsConnected(false);
        setIsRecording(false);
        setIsProcessing(false);
      };

      ws.onerror = (error) => {
        console.error('Soniox WebSocket error:', error);
        setError('WebSocket connection error');
        setIsConnected(false);
      };

      wsRef.current = ws;
    } catch (err) {
      console.error('Error connecting to Soniox WebSocket:', err);
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
        console.log('Connected to Soniox server:', message.message);
        break;

      case 'stream_started':
        setIsProcessing(true);
        console.log('Soniox stream started');
        break;

      case 'transcription':
        handleTranscriptionResult(message.data, message.isFinal);
        if (message.isFinal) {
          setIsProcessing(false);
        }
        break;

      case 'stream_stopped':
        setIsProcessing(false);
        console.log('Soniox stream stopped');
        break;

      case 'session_finished':
        setIsProcessing(false);
        console.log('Soniox session finished');
        break;

      case 'error':
        setError(message.message);
        setIsProcessing(false);
        break;

      default:
        console.log('Unknown message type:', message.type);
    }
  }, []);

  // Handle transcription results from Soniox
  const handleTranscriptionResult = useCallback((data: any, isFinal: boolean) => {
    if (data.speakerSegments && data.speakerSegments.length > 0) {
      const newSegments: TranscriptionSegment[] = data.speakerSegments.map((seg: any) => ({
        speaker: seg.speaker,
        text: seg.text,
        timestamp: new Date(seg.timestamp),
        isFinal: seg.isFinal,
        confidence: seg.confidence,
        language: seg.language,
        isTranslation: seg.isTranslation
      }));

      if (isFinal) {
        // Add final segments to the list
        setSegments(prev => [...prev, ...newSegments]);
      } else {
        // Update interim results - replace the last non-final segments
        setSegments(prev => {
          // Keep all final segments
          const finalSegments = prev.filter(seg => seg.isFinal);
          
          // Add new interim segments
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
        console.log('Recording started for Soniox');
        
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
        console.log('Recording stopped for Soniox');
        
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