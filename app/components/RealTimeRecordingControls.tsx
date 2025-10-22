'use client';

import { Mic, Square, Wifi, WifiOff, AlertCircle } from 'lucide-react';

interface RealTimeRecordingControlsProps {
  isConnected: boolean;
  isRecording: boolean;
  isProcessing: boolean;
  error: string | null;
  onStart: () => void;
  onStop: () => void;
  onConnect: () => void;
  onDisconnect: () => void;
}

export function RealTimeRecordingControls({
  isConnected,
  isRecording,
  isProcessing,
  error,
  onStart,
  onStop,
  onConnect,
  onDisconnect,
}: RealTimeRecordingControlsProps) {
  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <h2 className="text-2xl font-bold mb-4 text-gray-800">
        Real-Time Recording
      </h2>

      {/* Connection Status */}
      <div className="mb-6">
        <div className={`flex items-center gap-3 p-3 rounded-lg ${
          isConnected
            ? 'bg-green-50 border border-green-200'
            : 'bg-red-50 border border-red-200'
        }`}>
          {isConnected ? (
            <Wifi className="w-5 h-5 text-green-600" />
          ) : (
            <WifiOff className="w-5 h-5 text-red-600" />
          )}

          <div>
            <div className={`font-semibold ${
              isConnected ? 'text-green-800' : 'text-red-800'
            }`}>
              {isConnected ? 'Connected to Server' : 'Disconnected'}
            </div>
            <div className={`text-sm ${
              isConnected ? 'text-green-600' : 'text-red-600'
            }`}>
              {isConnected
                ? 'Real-time transcription ready'
                : 'Unable to connect to transcription server'
              }
            </div>
          </div>

          <div className="ml-auto">
            {isConnected ? (
              <button
                onClick={onDisconnect}
                className="px-3 py-1 bg-red-500 text-white rounded text-sm hover:bg-red-600 transition-colors"
              >
                Disconnect
              </button>
            ) : (
              <button
                onClick={onConnect}
                className="px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600 transition-colors"
              >
                Connect
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="mb-6 bg-red-50 border-l-4 border-red-500 p-4 rounded-lg flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-red-800">Connection Error</h3>
            <p className="text-red-700 text-sm mt-1">{error}</p>
          </div>
        </div>
      )}

      {/* Recording Controls */}
      <div className="flex flex-col items-center gap-6">
        {/* Status Display */}
        <div className="text-center">
          <div className={`text-4xl font-mono font-bold mb-2 ${
            isRecording ? 'text-red-500 animate-pulse' : 'text-gray-700'
          }`}>
            {isRecording ? 'LIVE' : 'READY'}
          </div>
          <div className="text-sm text-gray-500">
            {isRecording
              ? 'Recording and transcribing in real-time'
              : isConnected
              ? 'Click start to begin live recording'
              : 'Connect to server first'
            }
          </div>
        </div>

        {/* Control Buttons */}
        <div className="flex items-center gap-4">
          {!isRecording ? (
            <button
              onClick={onStart}
              disabled={!isConnected || isProcessing}
              className={`flex items-center gap-3 px-8 py-4 rounded-full shadow-lg transition-all transform ${
                !isConnected || isProcessing
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-red-500 hover:bg-red-600 text-white hover:scale-105'
              }`}
            >
              {isProcessing ? (
                <>
                  <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span className="font-semibold">Connecting...</span>
                </>
              ) : (
                <>
                  <Mic className="w-6 h-6" />
                  <span className="font-semibold">
                    {isConnected ? 'Start Live Recording' : 'Connect First'}
                  </span>
                </>
              )}
            </button>
          ) : (
            <button
              onClick={onStop}
              className="flex items-center gap-2 px-6 py-3 bg-gray-700 hover:bg-gray-800 text-white rounded-full shadow-lg transition-all transform hover:scale-105"
            >
              <Square className="w-5 h-5" />
              <span className="font-semibold">Stop Recording</span>
            </button>
          )}
        </div>

        {/* Live Indicator */}
        {isRecording && (
          <div className="flex items-center gap-2 text-red-500">
            <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
            <span className="text-sm font-medium">Live Transcription Active</span>
          </div>
        )}
      </div>

      {/* Instructions */}
      <div className="mt-6 p-4 bg-blue-50 rounded-lg">
        <h3 className="font-semibold text-blue-800 mb-2">How it works:</h3>
        <ul className="text-sm text-blue-700 space-y-1">
          <li>• <strong>Connect:</strong> Establishes WebSocket connection to transcription server</li>
          <li>• <strong>Start Recording:</strong> Begins real-time audio capture and streaming</li>
          <li>• <strong>Live Transcription:</strong> See speaker-separated text appear in real-time</li>
          <li>• <strong>Stop Recording:</strong> Ends the session and saves all transcriptions</li>
        </ul>
      </div>

      {/* Technical Info */}
      <div className="mt-4 text-xs text-gray-500 text-center">
        <p>Real-time streaming • Speaker diarization • WebSocket connection</p>
        <p>Server: ws://localhost:8081 • Audio: 48kHz Opus • Latency: ~2-3 seconds</p>
      </div>
    </div>
  );
}
