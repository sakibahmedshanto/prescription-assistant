'use client';

import { useState, useEffect } from 'react';
import { Mic, Square } from 'lucide-react';

interface RecordingControlsWithTimerProps {
  isConnected: boolean;
  isRecording: boolean;
  isProcessing: boolean;
  error: string | null;
  onStart: () => void;
  onStop: () => void;
  onConnect: () => void;
  onDisconnect: () => void;
}

export function RecordingControlsWithTimer({
  isConnected,
  isRecording,
  isProcessing,
  error,
  onStart,
  onStop,
  onConnect,
  onDisconnect,
}: RecordingControlsWithTimerProps) {
  const [duration, setDuration] = useState(0);

  // Timer effect
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isRecording) {
      interval = setInterval(() => {
        setDuration(prev => prev + 1);
      }, 1000);
    } else {
      setDuration(0);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRecording]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getStatusText = () => {
    if (error) return 'Connection Error';
    if (isProcessing) return 'Connecting...';
    if (isRecording) return 'Recording...';
    if (isConnected) return 'Ready to Record';
    return 'Connecting...';
  };

  const getStatusColor = () => {
    if (error) return 'text-red-500';
    if (isProcessing) return 'text-yellow-500';
    if (isRecording) return 'text-red-500';
    if (isConnected) return 'text-green-500';
    return 'text-gray-500';
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-8">
      <h2 className="text-3xl font-bold text-gray-800 mb-6 text-center">
        Recording Controls
      </h2>
      
      {/* Timer Display */}
      <div className="text-center mb-6">
        <div className="text-6xl font-mono font-bold text-gray-800 mb-2">
          {formatTime(duration)}
        </div>
        <div className={`text-lg font-medium ${getStatusColor()}`}>
          {getStatusText()}
        </div>
      </div>

      {/* Recording Button */}
      <div className="flex justify-center mb-6">
        {!isRecording ? (
          <button
            onClick={onStart}
            disabled={!isConnected || isProcessing}
            className={`flex items-center gap-3 px-8 py-4 rounded-lg shadow-lg transition-all transform ${
              !isConnected || isProcessing
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-red-500 hover:bg-red-600 text-white hover:scale-105'
            }`}
          >
            <Mic className="w-6 h-6" />
            <span className="font-semibold text-lg">Start Recording</span>
          </button>
        ) : (
          <button
            onClick={onStop}
            className="flex items-center gap-3 px-8 py-4 bg-gray-700 hover:bg-gray-800 text-white rounded-lg shadow-lg transition-all transform hover:scale-105"
          >
            <Square className="w-6 h-6" />
            <span className="font-semibold text-lg">Stop Recording</span>
          </button>
        )}
      </div>

      {/* Connection Status */}
      <div className="text-center">
        <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium ${
          isConnected 
            ? 'bg-green-100 text-green-800' 
            : 'bg-red-100 text-red-800'
        }`}>
          <div className={`w-2 h-2 rounded-full ${
            isConnected ? 'bg-green-500' : 'bg-red-500'
          }`}></div>
          {isConnected ? 'Connected to Soniox' : 'Disconnected'}
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-700 text-sm text-center">{error}</p>
        </div>
      )}
    </div>
  );
}

