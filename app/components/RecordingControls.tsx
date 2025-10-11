'use client';

import { Mic, Square, Pause, Play, Loader2 } from 'lucide-react';

interface RecordingControlsProps {
  isRecording: boolean;
  isPaused: boolean;
  duration: number;
  isProcessing: boolean;
  onStart: () => void;
  onStop: () => void;
  onPause: () => void;
  onResume: () => void;
}

export function RecordingControls({
  isRecording,
  isPaused,
  duration,
  isProcessing,
  onStart,
  onStop,
  onPause,
  onResume,
}: RecordingControlsProps) {
  const formatDuration = (seconds: number): string => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <h2 className="text-2xl font-bold mb-4 text-gray-800">Recording Controls</h2>
      
      <div className="flex flex-col items-center gap-6">
        {/* Duration Display */}
        <div className="text-center">
          <div className={`text-5xl font-mono font-bold mb-2 ${
            isRecording && !isPaused ? 'text-red-500 animate-pulse' : 'text-gray-700'
          }`}>
            {formatDuration(duration)}
          </div>
          <div className="text-sm text-gray-500">
            {isRecording
              ? isPaused
                ? 'Recording Paused'
                : 'Recording in Progress'
              : 'Ready to Record'}
          </div>
        </div>

        {/* Control Buttons */}
        <div className="flex items-center gap-4">
          {!isRecording ? (
            <button
              onClick={onStart}
              disabled={isProcessing}
              className="flex items-center gap-3 px-8 py-4 bg-red-500 hover:bg-red-600 text-white rounded-full shadow-lg transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-6 h-6 animate-spin" />
                  <span className="font-semibold">Processing...</span>
                </>
              ) : (
                <>
                  <Mic className="w-6 h-6" />
                  <span className="font-semibold">Start Recording</span>
                </>
              )}
            </button>
          ) : (
            <>
              {isPaused ? (
                <button
                  onClick={onResume}
                  className="flex items-center gap-2 px-6 py-3 bg-green-500 hover:bg-green-600 text-white rounded-full shadow-lg transition-all transform hover:scale-105"
                >
                  <Play className="w-5 h-5" />
                  <span className="font-semibold">Resume</span>
                </button>
              ) : (
                <button
                  onClick={onPause}
                  className="flex items-center gap-2 px-6 py-3 bg-yellow-500 hover:bg-yellow-600 text-white rounded-full shadow-lg transition-all transform hover:scale-105"
                >
                  <Pause className="w-5 h-5" />
                  <span className="font-semibold">Pause</span>
                </button>
              )}
              
              <button
                onClick={onStop}
                className="flex items-center gap-2 px-6 py-3 bg-gray-700 hover:bg-gray-800 text-white rounded-full shadow-lg transition-all transform hover:scale-105"
              >
                <Square className="w-5 h-5" />
                <span className="font-semibold">Stop & Process</span>
              </button>
            </>
          )}
        </div>

        {/* Status Indicator */}
        {isRecording && !isPaused && (
          <div className="flex items-center gap-2 text-red-500">
            <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
            <span className="text-sm font-medium">Live Recording</span>
          </div>
        )}
      </div>
    </div>
  );
}

