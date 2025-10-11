'use client';

import { useState, useCallback } from 'react';
import { useRealTimeTranscription } from './hooks/useRealTimeTranscription';
import { RealTimeTranscription } from './components/RealTimeTranscription';
import { MedicalAnalysis } from './components/MedicalAnalysis';
import { RealTimeRecordingControls } from './components/RealTimeRecordingControls';
import { 
  MedicalAnalysis as MedicalAnalysisType,
  AnalysisType 
} from './types';
import { Download, Trash2, AlertCircle, Wifi } from 'lucide-react';

export default function RealTimePrescriptionAssistant() {
  const {
    isConnected,
    isRecording,
    segments,
    error,
    startRecording,
    stopRecording,
    connect,
    disconnect,
  } = useRealTimeTranscription();

  const [analyses, setAnalyses] = useState<Map<AnalysisType, MedicalAnalysisType>>(
    new Map()
  );
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleRequestAnalysis = useCallback(async (type: AnalysisType) => {
    if (segments.length === 0) {
      setErrorMessage('No conversation to analyze. Please record first.');
      return;
    }

    setIsAnalyzing(true);
    setErrorMessage(null);

    try {
      // Format conversation for analysis
      const conversation = segments
        .map((seg) => `${seg.speaker}: ${seg.text}`)
        .join('\n\n');

      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          conversation,
          analysisType: type,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Analysis failed');
      }

      const data = await response.json();

      if (data.success && data.analysis) {
        const newAnalysis: MedicalAnalysisType = {
          type,
          content: data.analysis,
          timestamp: new Date(),
        };

        setAnalyses((prev) => {
          const updated = new Map(prev);
          updated.set(type, newAnalysis);
          return updated;
        });
      }
    } catch (err: any) {
      console.error('Analysis error:', err);
      setErrorMessage(err.message || 'Failed to analyze conversation');
    } finally {
      setIsAnalyzing(false);
    }
  }, [segments]);

  const handleClearAll = useCallback(() => {
    if (confirm('Are you sure you want to clear all data? This cannot be undone.')) {
      setAnalyses(new Map());
      setErrorMessage(null);
      // Note: We don't clear segments here as they're managed by the real-time hook
    }
  }, []);

  const handleExport = useCallback(() => {
    const exportData = {
      timestamp: new Date().toISOString(),
      type: 'realtime_transcription',
      conversation: segments,
      analyses: Array.from(analyses.entries()).map(([type, analysis]) => ({
        type,
        content: analysis.content,
        timestamp: analysis.timestamp,
      })),
      connectionStatus: {
        isConnected,
        isRecording,
      },
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: 'application/json',
    });
    
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `realtime-prescription-${new Date().toISOString()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [segments, analyses, isConnected, isRecording]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-gray-800 mb-2">
                🏥 Real-Time Prescription Assistant
              </h1>
              <p className="text-gray-600">
                Live streaming transcription with WebSocket connection
              </p>
            </div>
            
            <div className="text-right">
              <div className={`flex items-center gap-2 mb-1 ${
                isConnected ? 'text-green-600' : 'text-red-600'
              }`}>
                <Wifi className="w-4 h-4" />
                <span className="text-sm font-medium">
                  {isConnected ? 'Live Connected' : 'Disconnected'}
                </span>
              </div>
              <p className="text-xs text-gray-500">
                WebSocket: ws://localhost:8080
              </p>
            </div>
          </div>
        </div>

        {/* Error Display */}
        {(error || errorMessage) && (
          <div className="mb-6 bg-red-50 border-l-4 border-red-500 p-4 rounded-lg flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-red-800">Error</h3>
              <p className="text-red-700 text-sm">{error || errorMessage}</p>
            </div>
            <button
              onClick={() => setErrorMessage(null)}
              className="ml-auto text-red-500 hover:text-red-700"
            >
              ✕
            </button>
          </div>
        )}

        {/* Action Buttons */}
        <div className="mb-6 flex gap-3">
          <button
            onClick={handleExport}
            disabled={segments.length === 0}
            className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Download className="w-4 h-4" />
            Export Data
          </button>
          
          <button
            onClick={handleClearAll}
            disabled={segments.length === 0 && analyses.size === 0}
            className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            Clear Analysis
          </button>
        </div>

        {/* Recording Controls */}
        <div className="mb-6">
          <RealTimeRecordingControls
            isConnected={isConnected}
            isRecording={isRecording}
            isProcessing={false}
            error={error}
            onStart={startRecording}
            onStop={stopRecording}
            onConnect={connect}
            onDisconnect={disconnect}
          />
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Real-Time Transcription Panel */}
          <div className="h-[600px]">
            <RealTimeTranscription
              segments={segments}
              isConnected={isConnected}
              isRecording={isRecording}
            />
          </div>

          {/* Analysis Panel */}
          <div className="h-[600px]">
            <MedicalAnalysis
              analyses={analyses}
              onRequestAnalysis={handleRequestAnalysis}
              isAnalyzing={isAnalyzing}
            />
          </div>
        </div>

        {/* Footer Info */}
        <div className="mt-6 text-center text-sm text-gray-500">
          <p>
            Real-time streaming transcription using WebSockets and Google Cloud Speech-to-Text.
          </p>
          <p className="mt-1">
            ⚠️ Always verify AI-generated suggestions. This tool is for clinical
            decision support only.
          </p>
          <p className="mt-1">
            <strong>Server Status:</strong> {isConnected ? 'Connected' : 'Disconnected'} | 
            <strong> Recording:</strong> {isRecording ? 'Active' : 'Inactive'} |
            <strong> Segments:</strong> {segments.length}
          </p>
        </div>
      </div>
    </div>
  );
}
