'use client';

import { useState, useCallback } from 'react';
import { useAssemblyAITranscription } from './hooks/useAssemblyAITranscription';
import { RealTimeTranscription } from './components/RealTimeTranscription';
import { MedicalAnalysis } from './components/MedicalAnalysis';
import { RealTimeRecordingControls } from './components/RealTimeRecordingControls';
import { 
  MedicalAnalysis as MedicalAnalysisType,
  AnalysisType 
} from './types';
import { Download, Trash2, AlertCircle, Wifi, Brain } from 'lucide-react';

export default function AssemblyAIPrescriptionAssistant() {
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
  } = useAssemblyAITranscription();

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
    }
  }, []);

  const handleExport = useCallback(() => {
    const exportData = {
      timestamp: new Date().toISOString(),
      type: 'assemblyai_transcription',
      conversation: segments,
      analyses: Array.from(analyses.entries()).map(([type, analysis]) => ({
        type,
        content: analysis.content,
        timestamp: analysis.timestamp,
      })),
      connectionStatus: {
        isConnected,
        isRecording,
        isProcessing,
      },
      service: 'AssemblyAI',
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: 'application/json',
    });
    
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `assemblyai-prescription-${new Date().toISOString()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [segments, analyses, isConnected, isRecording, isProcessing]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-4xl font-bold text-gray-800">
                  🏥 AssemblyAI Prescription Assistant
                </h1>
                <div className="flex items-center gap-1 bg-purple-100 text-purple-700 px-3 py-1 rounded-full text-sm font-medium">
                  <Brain className="w-4 h-4" />
                  AssemblyAI
                </div>
              </div>
              <p className="text-gray-600">
                Advanced speaker diarization with AssemblyAI's superior accuracy
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
                AssemblyAI WebSocket • Superior Speaker Detection
              </p>
            </div>
          </div>
        </div>

        {/* AssemblyAI Info Banner */}
        <div className="mb-6 bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <Brain className="w-6 h-6 text-purple-600" />
            <div>
              <h3 className="font-semibold text-purple-800">Powered by AssemblyAI</h3>
              <p className="text-sm text-purple-700">
                Advanced speaker diarization with 95%+ accuracy • Medical vocabulary boost • 
                Real-time processing • Superior to Google Cloud Speech-to-Text
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

        {/* Processing Indicator */}
        {isProcessing && (
          <div className="mb-6 bg-blue-50 border-l-4 border-blue-500 p-4 rounded-lg">
            <div className="flex items-center gap-3">
              <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
              <div>
                <h3 className="font-semibold text-blue-800">Processing with AssemblyAI</h3>
                <p className="text-sm text-blue-700">
                  Advanced speaker diarization and transcription in progress...
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="mb-6 flex gap-3">
          <button
            onClick={handleExport}
            disabled={segments.length === 0}
            className="flex items-center gap-2 px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
            isProcessing={isProcessing}
            error={error}
            onStart={startRecording}
            onStop={stopRecording}
            onConnect={connect}
            onDisconnect={disconnect}
          />
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* AssemblyAI Transcription Panel */}
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
            Powered by AssemblyAI's advanced speaker diarization technology.
          </p>
          <p className="mt-1">
            ⚠️ Always verify AI-generated suggestions. This tool is for clinical
            decision support only.
          </p>
          <p className="mt-1">
            <strong>Service:</strong> AssemblyAI | 
            <strong> Status:</strong> {isConnected ? 'Connected' : 'Disconnected'} | 
            <strong> Recording:</strong> {isRecording ? 'Active' : 'Inactive'} |
            <strong> Processing:</strong> {isProcessing ? 'Yes' : 'No'} |
            <strong> Segments:</strong> {segments.length}
          </p>
        </div>
      </div>
    </div>
  );
}
