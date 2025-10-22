'use client';

import { useState, useCallback, useEffect } from 'react';
import { useSonioxTranscription } from './hooks/useSonioxTranscription';
import { RecordingControlsWithTimer } from './components/RecordingControlsWithTimer';
import { TranscriptionDisplayWithBubbles } from './components/TranscriptionDisplayWithBubbles';
import { MedicalAnalysis } from './components/MedicalAnalysis';
import { ManualDialogueInput } from './components/ManualDialogueInput';
import { ConversationJsonUpload } from './components/ConversationJsonUpload';
import {
  TranscriptionSegment,
  MedicalAnalysis as MedicalAnalysisType,
  AnalysisType,
  MedicineSearchResult,
  StructuredMedicineData,
} from './types';
import { Download, Trash2, AlertCircle, Save, FileText } from 'lucide-react';
import { db } from './lib/firebase'; // Firebase import
import { collection, addDoc, Timestamp } from 'firebase/firestore'; // Firebase Firestore imports
import { auth } from './lib/firebase'; // If using authentication
import Link from 'next/link';

export default function PrescriptionAssistant() {
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

  const [analyses, setAnalyses] = useState<Map<AnalysisType, MedicalAnalysisType>>(
    new Map()
  );
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [uploadedSegments, setUploadedSegments] = useState<TranscriptionSegment[]>([]); // State for uploaded JSON

  const handleStartRecording = useCallback(async () => {
    await startRecording();
  }, [startRecording]);

  const handleStopRecording = useCallback(() => {
    stopRecording();
  }, [stopRecording]);

  const handleConnect = useCallback(() => {
    connect();
  }, [connect]);

  const handleDisconnect = useCallback(() => {
    disconnect();
  }, [disconnect]);

  const handleRequestAnalysis = useCallback(async (type: AnalysisType) => {
    const allSegments = [...uploadedSegments, ...segments]; // Combine uploaded and real-time segments
    console.log('All segments for analysis:', allSegments.length);
    if (allSegments.length === 0) {
      console.log('No segments to analyze');
      return;
    }

    setIsAnalyzing(true);

    try {
      const conversation = allSegments
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
          structuredData: data.structuredData,
          bdMedicines: data.bdMedicines,
        };

        setAnalyses((prev) => {
          const updated = new Map(prev);
          updated.set(type, newAnalysis);
          console.log('Updated analyses:', updated); // Debug log
          return updated;
        });

        if (type === 'diagnosis' && allSegments.length > 0) {
          setTimeout(() => {
            handleRequestAnalysis('prescription');
          }, 500);
        }
      }
    } catch (err: any) {
      console.error('Analysis error:', err);
    } finally {
      setIsAnalyzing(false);
    }
  }, [segments, uploadedSegments]);

  const handleClearAll = useCallback(() => {
    if (confirm('Are you sure you want to clear all data? This cannot be undone.')) {
      setAnalyses(new Map());
    }
  }, []);

  const handleAddManualSegments = useCallback((newSegments: TranscriptionSegment[]) => {
    console.log('Manual dialogue input not integrated with real-time system');
  }, []);

  const handleLoadJsonConversation = useCallback((newSegments: TranscriptionSegment[]) => {
    if (newSegments.length === 0) {
      console.log('No valid segments loaded');
      return;
    }
    console.log('Loaded segments:', newSegments);
    setUploadedSegments(newSegments);
  }, []);

  const handleExport = useCallback(() => {
    const exportData = {
      timestamp: new Date().toISOString(),
      conversation: [...uploadedSegments, ...segments], // Include both uploaded and real-time segments
      analyses: Array.from(analyses.entries()).map(([type, analysis]) => ({
        type,
        content: analysis.content,
        timestamp: analysis.timestamp,
      })),
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: 'application/json',
    });

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `prescription-${new Date().toISOString()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [segments, uploadedSegments, analyses]);

  const handleSaveToFirebase = useCallback(async () => {
    if (analyses.size === 0) {
      console.log('No analyses to save');
      return;
    }

    try {
      // Prepare data object, handling undefined analyses
      const dataToSave = {
        timestamp: Timestamp.now(),
        userId: auth.currentUser?.uid || 'anonymous', // Use auth if enabled, otherwise anonymous
        // Only include analyses that exist and transform them
        ...Array.from(analyses.entries()).reduce((acc, [type, analysis]) => {
          if (analysis) {
            acc[type] = {
              content: analysis.content || 'No content available',
              timestamp: analysis.timestamp || Timestamp.now(),
              // Handle structuredData and bdMedicines safely with correct types
              structuredData: analysis.structuredData || null, // Allow null for optional field
              bdMedicines: analysis.bdMedicines || [], // Fallback to empty array if undefined
            };
          }
          return acc;
        }, {} as {
          [key in AnalysisType]?: {
            content: string;
            timestamp: Date | Timestamp;
            structuredData?: StructuredMedicineData | null; // Match the type
            bdMedicines?: MedicineSearchResult[]; // Match the type, fallback to empty array
          };
        }),
      };

      const docRef = await addDoc(collection(db, 'analyses'), dataToSave);
      console.log('Saved with ID:', docRef.id);
      // Optional: Add UI feedback (e.g., alert or state update)
    } catch (error) {
      console.error('Save error:', error);
      // Optional: Notify user (e.g., with a toast)
    }
  }, [analyses]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-4xl font-bold text-gray-800">
                  🏥 Prescription Assistant
                </h1>
                <div className="flex items-center gap-1 bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm font-medium">
                  🎤 Soniox Real-Time
                </div>
              </div>
              <p className="text-gray-600">
                AI-powered medical conversation transcription with Soniox's superior real-time speaker diarization
              </p>
            </div>

            <div className="text-right">
              <div className="flex items-center gap-2 text-green-600 mb-1">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-sm font-medium">
                  Real-Time Transcription Active
                </span>
              </div>
              <div className="text-xs text-gray-600 mb-1">
                Soniox WebSocket Connected
              </div>
            </div>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="mb-6 bg-red-50 border-l-4 border-red-500 p-4 rounded-lg flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-red-800">Error</h3>
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="mb-6 flex gap-3 flex-wrap">
          <ConversationJsonUpload onLoadConversation={handleLoadJsonConversation} />

          <button
            onClick={handleExport}
            disabled={segments.length === 0 && uploadedSegments.length === 0}
            className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Download className="w-4 h-4" />
            Export Data
          </button>

          <button
            onClick={handleClearAll}
            disabled={
              segments.length === 0 &&
              analyses.size === 0 &&
              uploadedSegments.length === 0
            }
            className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            Clear All
          </button>

          <button
            onClick={handleSaveToFirebase}
            disabled={analyses.size === 0}
            className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Save className="w-4 h-4" />
            Save to Firebase
          </button>

          {/* Generate Prescription Button - Opens in new tab */}
          <Link
            href="/prescription/new"
            target="_blank"
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
          >
            <FileText className="w-4 h-4" />
            Generate Prescription
          </Link>
        </div>

        {/* Recording Controls */}
        <div className="mb-6">
          <RecordingControlsWithTimer
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

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Transcription Panel */}
          <div className="h-[600px]">
            <TranscriptionDisplayWithBubbles
              segments={segments}
              uploadedSegments={uploadedSegments} // Pass uploaded segments
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
            This system uses Soniox Real-Time Transcription and OpenAI for medical
            conversation analysis.
          </p>
          <p className="mt-1">
            ⚠️ Always verify AI-generated suggestions. This tool is for clinical
            decision support only.
          </p>
        </div>
      </div>
    </div>
  );
}