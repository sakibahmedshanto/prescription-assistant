'use client';

import { useState, useCallback } from 'react';
import { useSonioxTranscription } from './hooks/useSonioxTranscription';
import { TranscriptionDisplay } from './components/TranscriptionDisplay';
import { MedicalAnalysis } from './components/MedicalAnalysis';
import { RecordingControls } from './components/RecordingControls';
import { 
  MedicalAnalysis as MedicalAnalysisType,
  AnalysisType 
} from './types';
import { Download, Trash2, AlertCircle, Languages } from 'lucide-react';

export default function PrescriptionAssistant() {
  const {
    segments,
    isRecording,
    isConnected,
    error: transcriptionError,
    startRecording,
    stopRecording,
    clearSegments,
  } = useSonioxTranscription();

  const [analyses, setAnalyses] = useState<Map<AnalysisType, MedicalAnalysisType>>(new Map());
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);

  const handleStartRecording = useCallback(async () => {
    setError(null);
    setIsConnecting(true);
    try {
      await startRecording();
    } finally {
      setIsConnecting(false);
    }
  }, [startRecording]);

  const handleStopRecording = useCallback(() => {
    stopRecording();
  }, [stopRecording]);

  const handleRequestAnalysis = useCallback(async (type: AnalysisType) => {
    if (segments.length === 0) {
      setError('No conversation to analyze. Please record first.');
      return;
    }

    setIsAnalyzing(true);
    setError(null);

    try {
      const conversation = segments.map((seg) => `${seg.speaker}: ${seg.text}`).join('\n\n');

      // Send Bengali conversation directly to analysis
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          conversation, 
          analysisType: type,
          language: 'bengali'
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
          structuredData: data.structuredData,
          bdMedicines: data.bdMedicines,
        };
        setAnalyses((prev) => {
          const updated = new Map(prev);
          updated.set(type, newAnalysis);
          return updated;
        });

        if (type === 'diagnosis' && segments.length > 0) {
          setTimeout(() => handleRequestAnalysis('prescription'), 500);
        }
      }
    } catch (err: any) {
      console.error('Analysis error:', err);
      setError(err.message || 'Failed to analyze conversation');
    } finally {
      setIsAnalyzing(false);
    }
  }, [segments]);

  const handleClearAll = useCallback(() => {
    if (confirm('Are you sure you want to clear all data? This cannot be undone.')) {
      clearSegments();
      setAnalyses(new Map());
      setError(null);
    }
  }, [clearSegments]);

  const downloadTranscript = useCallback(() => {
    if (segments.length === 0) return;

    const transcript = segments
      .map(seg => `${seg.speaker}: ${seg.text}`)
      .join('\n');

    const blob = new Blob([transcript], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bengali-transcript-${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [segments]);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-4xl font-bold text-gray-800">🏥 Prescription Assistant</h1>
                <div className="flex items-center gap-1 bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm font-medium">
                  <Languages className="w-4 h-4" />
                  বাংলা
                </div>
                <div className="flex items-center gap-1 bg-purple-100 text-purple-700 px-3 py-1 rounded-full text-sm font-medium">
                  🧠 Soniox Bengali Transcription
                </div>
              </div>
              <p className="text-gray-600">
                AI-powered medical conversation transcription with Soniox for Bengali with speaker diarization
              </p>
            </div>

            <div className="text-right">
              <div className="flex items-center gap-2 mb-2">
                {segments.length > 0 && (
                  <>
                    <button
                      onClick={downloadTranscript}
                      className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                    >
                      <Download className="w-4 h-4" />
                      Download Transcript
                    </button>
                    <button
                      onClick={handleClearAll}
                      className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                      Clear
                    </button>
                  </>
                )}
              </div>
              
              {(error || transcriptionError) && (
                <div className="flex items-center gap-2 text-red-600 text-sm">
                  <AlertCircle className="w-4 h-4" />
                  {error || transcriptionError}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column - Transcription */}
          <div>
            <TranscriptionDisplay segments={segments} />
          </div>

          {/* Right Column - Medical Analysis */}
          <div>
            <MedicalAnalysis 
              analyses={analyses} 
              onRequestAnalysis={handleRequestAnalysis} 
              isAnalyzing={isAnalyzing} 
            />
          </div>
        </div>

        {/* Recording Controls */}
        <div className="mt-6">
          <RecordingControls
            isRecording={isRecording}
            isPaused={false}
            duration={0}
            isProcessing={isConnecting}
            onStart={handleStartRecording}
            onStop={handleStopRecording}
            onPause={() => {}}
            onResume={() => {}}
          />
        </div>

        {/* Footer */}
        <div className="mt-6 text-center text-sm text-gray-500">
          <p>This system uses Soniox for Bengali transcription with speaker diarization, and OpenAI for medical conversation analysis.</p>
          <p className="mt-1">⚠️ Always verify AI-generated suggestions. This tool is for clinical decision support only.</p>
        </div>
      </div>
    </div>
  );
}