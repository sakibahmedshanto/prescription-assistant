'use client';

import { useState, useCallback } from 'react';
import { RealTimeTranscription } from './components/RealTimeTranscription';
import { MedicalAnalysis } from './components/MedicalAnalysis';
import { RealTimeRecordingControls } from './components/RealTimeRecordingControls';
import { Download, Trash2, AlertCircle, Wifi } from 'lucide-react';
import { AnalysisType, MedicalAnalysis as MedicalAnalysisType, TranscriptionSegment } from './types';

export default function SonioxBanglaAssistant() {
  const [isConnected, setIsConnected] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [segments, setSegments] = useState<TranscriptionSegment[]>([]);
  const [analyses, setAnalyses] = useState<Map<AnalysisType, MedicalAnalysisType>>(new Map());
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      let chunks: BlobPart[] = [];

      mediaRecorder.ondataavailable = (e) => chunks.push(e.data);
      mediaRecorder.onstart = () => setIsRecording(true);
      mediaRecorder.onstop = async () => {
        setIsRecording(false);

        const blob = new Blob(chunks, { type: 'audio/webm' });
        const base64 = await blobToBase64(blob);

        const response = await fetch('/api/transcribe-soniox', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ audioContentBase64: base64 }),
        });

        const data = await response.json();

        if (data.success && data.transcription) {
          setSegments((prev) => [
            ...prev,
            { speaker: 'Patient', text: data.transcription, timestamp: new Date() },
          ]);
        } else {
          setError(data.error || 'Transcription failed');
        }
      };

      mediaRecorder.start();
      setTimeout(() => mediaRecorder.stop(), 5000); // example 5-second recording
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Recording failed');
    }
  }, []);

  const stopRecording = useCallback(() => {
    setIsRecording(false);
  }, []);

  const handleRequestAnalysis = useCallback(async (type: AnalysisType) => {
    if (segments.length === 0) {
      setError('No conversation to analyze.');
      return;
    }

    setIsAnalyzing(true);
    setError(null);

    try {
      const conversation = segments.map((s) => `${s.speaker}: ${s.text}`).join('\n\n');
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversation, analysisType: type }),
      });

      const data = await response.json();
      if (data.success && data.analysis) {
        const newAnalysis: MedicalAnalysisType = {
          type,
          content: data.analysis,
          timestamp: new Date(),
        };
        setAnalyses((prev) => new Map(prev).set(type, newAnalysis));
      }
    } catch (err: any) {
      setError(err.message || 'Analysis failed');
    } finally {
      setIsAnalyzing(false);
    }
  }, [segments]);

  const handleClearAll = useCallback(() => {
    setSegments([]);
    setAnalyses(new Map());
    setError(null);
  }, []);

  const handleExport = useCallback(() => {
    const exportData = { conversation: segments, analyses: Array.from(analyses.entries()) };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `soniox-bangla-${new Date().toISOString()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }, [segments, analyses]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6 flex justify-between items-center">
          <h1 className="text-4xl font-bold">🏥 Soniox Bangla Assistant</h1>
          <div className={`flex items-center gap-2 ${isConnected ? 'text-green-600' : 'text-red-600'}`}>
            <Wifi className="w-4 h-4" />
            {isConnected ? 'Connected' : 'Disconnected'}
          </div>
        </div>

        {(error) && (
          <div className="mb-6 bg-red-50 border-l-4 border-red-500 p-4 rounded-lg flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        )}

        <div className="mb-6 flex gap-3">
          <button onClick={handleExport} className="bg-purple-500 text-white px-4 py-2 rounded-lg">
            <Download className="w-4 h-4 inline-block mr-1" /> Export
          </button>
          <button onClick={handleClearAll} className="bg-red-500 text-white px-4 py-2 rounded-lg">
            <Trash2 className="w-4 h-4 inline-block mr-1" /> Clear
          </button>
        </div>

        <div className="mb-6">
          <RealTimeRecordingControls
            isConnected={isConnected}
            isRecording={isRecording}
            isProcessing={false}
            error={error}
            onStart={startRecording}
            onStop={stopRecording}
            onConnect={() => setIsConnected(true)}
            onDisconnect={() => setIsConnected(false)}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="h-[600px]">
            <RealTimeTranscription segments={segments} isConnected={isConnected} isRecording={isRecording} />
          </div>
          <div className="h-[600px]">
            <MedicalAnalysis analyses={analyses} onRequestAnalysis={handleRequestAnalysis} isAnalyzing={isAnalyzing} />
          </div>
        </div>
      </div>
    </div>
  );
}

// Helper: convert Blob -> base64
const blobToBase64 = (blob: Blob) => new Promise<string>((resolve, reject) => {
  const reader = new FileReader();
  reader.onloadend = () => resolve(reader.result?.toString().split(',')[1] || '');
  reader.onerror = reject;
  reader.readAsDataURL(blob);
});
