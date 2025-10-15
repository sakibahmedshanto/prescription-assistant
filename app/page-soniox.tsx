'use client';

import { useState } from 'react';
import { RealTimeRecordingControls } from './components/RealTimeRecordingControls';
import { RealTimeTranscription } from './components/RealTimeTranscription';
import { MedicalAnalysis } from './components/MedicalAnalysis';
import { useSonioxTranscription } from './hooks/useSonioxTranscription';
import { TranscriptionSegment } from './types';

export default function SonioxRealTimePage() {
  const [showAnalysis, setShowAnalysis] = useState(false);
  
  const {
    isConnected,
    isRecording,
    isProcessing,
    segments,
    error,
    startRecording,
    stopRecording,
    connect,
    disconnect,
  } = useSonioxTranscription();

  // Convert segments to conversation format for analysis
  const conversationData = {
    conversation: segments.map((segment: TranscriptionSegment) => ({
      speaker: segment.speaker,
      text: segment.text,
      timestamp: segment.timestamp.toISOString(),
    })),
    metadata: {
      totalSegments: segments.length,
      doctorSegments: segments.filter(s => s.speaker?.includes('Speaker') && s.speaker !== 'Speaker 1').length,
      patientSegments: segments.filter(s => s.speaker?.includes('Speaker') && s.speaker === 'Speaker 1').length,
      transcriptionService: 'Soniox',
      language: segments.find(s => s.language)?.language || 'en',
    }
  };

  const handleStartRecording = async () => {
    await startRecording();
  };

  const handleStopRecording = () => {
    stopRecording();
  };

  const handleConnect = () => {
    connect();
  };

  const handleDisconnect = () => {
    disconnect();
  };

  const handleAnalyze = () => {
    setShowAnalysis(true);
  };

  const handleBackToTranscription = () => {
    setShowAnalysis(false);
  };

  if (showAnalysis) {
    return (
      <MedicalAnalysis 
        conversationData={conversationData}
        onBack={handleBackToTranscription}
        title="Medical Analysis - Soniox Transcription"
      />
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Prescription Assistant
          </h1>
          <p className="text-xl text-gray-600 mb-4">
            Real-Time Transcription with Soniox
          </p>
          <div className="inline-flex items-center gap-2 bg-blue-100 text-blue-800 px-4 py-2 rounded-full text-sm font-medium">
            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
            Soniox STT with Speaker Diarization
          </div>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Recording Controls */}
          <div className="order-2 lg:order-1">
            <RealTimeRecordingControls
              isConnected={isConnected}
              isRecording={isRecording}
              isProcessing={isProcessing}
              error={error}
              onStart={handleStartRecording}
              onStop={handleStopRecording}
              onConnect={handleConnect}
              onDisconnect={handleDisconnect}
            />
          </div>

          {/* Live Transcription */}
          <div className="order-1 lg:order-2">
            <RealTimeTranscription
              segments={segments}
              isConnected={isConnected}
              isRecording={isRecording}
            />
          </div>
        </div>

        {/* Analysis Section */}
        {segments.length > 0 && (
          <div className="mt-8">
            <div className="bg-white rounded-lg shadow-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold text-gray-800">
                  Transcription Analysis
                </h2>
                <button
                  onClick={handleAnalyze}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold"
                >
                  Analyze Conversation
                </button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <div className="text-sm font-medium text-blue-800 mb-1">Total Segments</div>
                  <div className="text-2xl font-bold text-blue-900">{segments.length}</div>
                </div>
                
                <div className="bg-green-50 p-4 rounded-lg">
                  <div className="text-sm font-medium text-green-800 mb-1">Final Segments</div>
                  <div className="text-2xl font-bold text-green-900">
                    {segments.filter(s => s.isFinal).length}
                  </div>
                </div>
                
                <div className="bg-purple-50 p-4 rounded-lg">
                  <div className="text-sm font-medium text-purple-800 mb-1">Speakers Detected</div>
                  <div className="text-2xl font-bold text-purple-900">
                    {new Set(segments.map(s => s.speaker)).size}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Features */}
        <div className="mt-8">
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">
              Soniox Features
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="text-center p-4">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-2">
                  <span className="text-blue-600 font-bold">STT</span>
                </div>
                <h3 className="font-semibold text-gray-800 mb-1">Speech-to-Text</h3>
                <p className="text-sm text-gray-600">High accuracy real-time transcription</p>
              </div>
              
              <div className="text-center p-4">
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-2">
                  <span className="text-green-600 font-bold">SD</span>
                </div>
                <h3 className="font-semibold text-gray-800 mb-1">Speaker Diarization</h3>
                <p className="text-sm text-gray-600">Automatic speaker identification</p>
              </div>
              
              <div className="text-center p-4">
                <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-2">
                  <span className="text-purple-600 font-bold">LI</span>
                </div>
                <h3 className="font-semibold text-gray-800 mb-1">Language ID</h3>
                <p className="text-sm text-gray-600">Multi-language support</p>
              </div>
              
              <div className="text-center p-4">
                <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-2">
                  <span className="text-orange-600 font-bold">RT</span>
                </div>
                <h3 className="font-semibold text-gray-800 mb-1">Real-Time</h3>
                <p className="text-sm text-gray-600">Low latency streaming</p>
              </div>
            </div>
          </div>
        </div>

        {/* Setup Instructions */}
        <div className="mt-8">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
            <h3 className="font-semibold text-yellow-800 mb-2">Setup Instructions</h3>
            <div className="text-sm text-yellow-700 space-y-1">
              <p>1. Get your API key from <a href="https://console.soniox.com" target="_blank" rel="noopener noreferrer" className="underline">console.soniox.com</a></p>
              <p>2. Set environment variable: <code className="bg-yellow-100 px-1 rounded">export SONIOX_API_KEY=your_api_key</code></p>
              <p>3. Start WebSocket server: <code className="bg-yellow-100 px-1 rounded">node websocket-server-soniox.js</code></p>
              <p>4. Connect and start recording for real-time transcription</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
