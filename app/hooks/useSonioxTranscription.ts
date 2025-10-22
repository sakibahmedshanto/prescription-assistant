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
  const audioContextRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);

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
      const wsUrl = `ws://localhost:8081?sessionId=${sessionIdRef.current}`;
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
        text: seg.text?.replace(/<end>/g, '').trim() || '',
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

  // Send PCM audio chunk to WebSocket
  const sendPCMAudioChunk = useCallback((pcmData: Int16Array) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      try {
        // Convert Int16Array to base64
        const buffer = new Uint8Array(pcmData.buffer);
        const base64Audio = btoa(String.fromCharCode(...buffer));

        wsRef.current.send(JSON.stringify({
          type: 'audio_chunk',
          audioData: base64Audio,
          config: {
            encoding: 'LINEAR16',
            sampleRateHertz: 16000,
            languageCode: 'en-US',
          }
        }));
      } catch (err) {
        console.error('Error sending PCM audio chunk:', err);
      }
    }
  }, []);

  // Start recording
  const startRecording = useCallback(async () => {
    // Define sendPCMAudioChunk inside startRecording to capture dependencies
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
          autoGainControl: true,
          sampleRate: 16000, // Lower sample rate for better reliability
        }
      });

      streamRef.current = stream;

      // Create AudioContext for raw PCM audio
      const audioContext = new AudioContext({ sampleRate: 16000 });
      audioContextRef.current = audioContext;

      const source = audioContext.createMediaStreamSource(stream);
      sourceRef.current = source;

      // Use ScriptProcessorNode for raw PCM audio extraction
      const processor = audioContext.createScriptProcessor(4096, 1, 1);
      processorRef.current = processor;

      processor.onaudioprocess = (e) => {
        const inputData = e.inputBuffer.getChannelData(0);

        // Convert Float32Array to Int16Array (PCM S16LE)
        const pcmData = new Int16Array(inputData.length);
        for (let i = 0; i < inputData.length; i++) {
          // Clamp the value to [-1, 1] and convert to 16-bit integer
          const s = Math.max(-1, Math.min(1, inputData[i]));
          pcmData[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
        }

        // Send PCM data directly
        sendPCMAudioChunk(pcmData);
      };

      source.connect(processor);
      processor.connect(audioContext.destination);

      setIsRecording(true);
      console.log('Recording started for Soniox (PCM format)');

      // Start transcription stream with LINEAR16 encoding
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({
          type: 'start_stream',
          config: {
            encoding: 'LINEAR16',
            sampleRateHertz: 16000,
            languageCode: 'en-US',
          }
        }));
      }

    } catch (err: any) {
      console.error('Error starting recording:', err);
      setError(err.message || 'Failed to start recording');
    }
  }, [isConnected, isRecording, sendPCMAudioChunk]);

  // Stop recording
  const stopRecording = useCallback(() => {
    setIsRecording(false);

    // Disconnect audio nodes
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }

    if (sourceRef.current) {
      sourceRef.current.disconnect();
      sourceRef.current = null;
    }

    // Close audio context
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }

    // Stop media stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    // Stop transcription stream
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'stop_stream'
      }));
    }

    console.log('Recording stopped for Soniox');
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
