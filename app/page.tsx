'use client';

import { useState, useCallback, useEffect } from 'react';
import { useAudioRecorder } from './hooks/useAudioRecorder';
import { TranscriptionDisplay } from './components/TranscriptionDisplay';
import { MedicalAnalysis } from './components/MedicalAnalysis';
import { RecordingControls } from './components/RecordingControls';
import { VoiceTraining } from './components/VoiceTraining';
import { VoiceRecognitionSetup } from './components/VoiceRecognitionSetup';
import { ManualDialogueInput } from './components/ManualDialogueInput';
import { ConversationJsonUpload } from './components/ConversationJsonUpload';
import { 
  TranscriptionSegment, 
  MedicalAnalysis as MedicalAnalysisType,
  AnalysisType 
} from './types';
import { Download, Trash2, AlertCircle } from 'lucide-react';

export default function PrescriptionAssistant() {
  const {
    isRecording,
    isPaused,
    duration,
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    error: recordingError,
  } = useAudioRecorder();

  const [segments, setSegments] = useState<TranscriptionSegment[]>([]);
  const [analyses, setAnalyses] = useState<Map<AnalysisType, MedicalAnalysisType>>(
    new Map()
  );
  const [isProcessing, setIsProcessing] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showVoiceTraining, setShowVoiceTraining] = useState(false);
  const [showVoiceRecognition, setShowVoiceRecognition] = useState(false);
  const [doctorVoiceProfile, setDoctorVoiceProfile] = useState<any>(null);

  // Check for existing voice profile on component mount
  useEffect(() => {
    const savedProfile = localStorage.getItem('doctorVoiceProfile');
    if (savedProfile) {
      setDoctorVoiceProfile(JSON.parse(savedProfile));
    }
  }, []);

  const handleStartRecording = useCallback(async () => {
    // If no voice profile exists, show training first
    if (!doctorVoiceProfile) {
      setShowVoiceTraining(true);
      return;
    }
    
    setError(null);
    await startRecording();
  }, [startRecording, doctorVoiceProfile]);

  const handleVoiceTrainingComplete = useCallback((profile: any) => {
    setDoctorVoiceProfile(profile);
    setShowVoiceTraining(false);
  }, []);

  const handleVoiceTrainingCancel = useCallback(() => {
    setShowVoiceTraining(false);
  }, []);

  const handleStopRecording = useCallback(async () => {
    setIsProcessing(true);
    setError(null);

    try {
      const audioBlob = await stopRecording();
      
      if (!audioBlob) {
        setError('No audio recorded');
        return;
      }

      // Convert blob to base64
      const reader = new FileReader();
      reader.readAsDataURL(audioBlob);
      
      reader.onloadend = async () => {
        const base64Audio = reader.result?.toString().split(',')[1];
        
        if (!base64Audio) {
          setError('Failed to process audio');
          return;
        }

        try {
          // Send to AssemblyAI transcription API
          const response = await fetch('/api/transcribe-assemblyai', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              audioContent: base64Audio,
              config: {
                encoding: 'WEBM_OPUS',
                sampleRateHertz: 48000,
                languageCode: 'en-US',
              },
              isTraining: false,
              voiceProfile: doctorVoiceProfile, // Include voice profile for recognition
            }),
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Transcription failed');
          }

          const data = await response.json();
          
          if (data.speakerSegments && data.speakerSegments.length > 0) {
            const newSegments: TranscriptionSegment[] = data.speakerSegments.map(
              (seg: any) => ({
                speaker: seg.speaker,
                text: seg.text,
                timestamp: new Date(),
              })
            );
            
            setSegments((prev) => [...prev, ...newSegments]);
          } else {
            setError('No speech detected in audio');
          }
        } catch (err: any) {
          console.error('Transcription error:', err);
          setError(err.message || 'Failed to transcribe audio');
        }
      };

      reader.onerror = () => {
        setError('Failed to read audio file');
      };

    } catch (err: any) {
      console.error('Recording stop error:', err);
      setError(err.message || 'Failed to process recording');
    } finally {
      setIsProcessing(false);
    }
  }, [stopRecording]);

  const handleRequestAnalysis = useCallback(async (type: AnalysisType) => {
    if (segments.length === 0) {
      setError('No conversation to analyze. Please record first.');
      return;
    }

    setIsAnalyzing(true);
    setError(null);

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
          structuredData: data.structuredData,
          bdMedicines: data.bdMedicines,
        };

        setAnalyses((prev) => {
          const updated = new Map(prev);
          updated.set(type, newAnalysis);
          return updated;
        });

        // Auto-generate medicine suggestions when diagnosis is completed
        if (type === 'diagnosis' && segments.length > 0) {
          setTimeout(() => {
            handleRequestAnalysis('prescription');
          }, 500);
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
      setSegments([]);
      setAnalyses(new Map());
      setError(null);
    }
  }, []);

  const handleAddManualSegments = useCallback((newSegments: TranscriptionSegment[]) => {
    setSegments((prev) => [...prev, ...newSegments]);
  }, []);

  const handleLoadJsonConversation = useCallback((newSegments: TranscriptionSegment[]) => {
    setSegments(newSegments);
    setAnalyses(new Map());
    setError(null);
  }, []);

  const handleRetrainVoice = useCallback(() => {
    if (confirm('This will clear your current voice profile and retrain. Continue?')) {
      localStorage.removeItem('doctorVoiceProfile');
      setDoctorVoiceProfile(null);
      setShowVoiceTraining(true);
    }
  }, []);

  const handleExport = useCallback(() => {
    const exportData = {
      timestamp: new Date().toISOString(),
      duration,
      conversation: segments,
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
  }, [segments, analyses, duration]);

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
                    <div className="flex items-center gap-1 bg-purple-100 text-purple-700 px-3 py-1 rounded-full text-sm font-medium">
                      🧠 AssemblyAI
                    </div>
                  </div>
                  <p className="text-gray-600">
                    AI-powered medical conversation transcription with AssemblyAI's superior speaker diarization (95%+ accuracy)
                  </p>
            </div>
            
            <div className="text-right">
              {doctorVoiceProfile ? (
                <>
                  <div className="flex items-center gap-2 text-green-600 mb-1">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    <span className="text-sm font-medium">
                      Voice Recognition Active
                    </span>
                  </div>
                  <div className="text-xs text-gray-600 mb-1">
                    {doctorVoiceProfile.doctorName}
                  </div>
                  <button
                    onClick={() => setShowVoiceRecognition(true)}
                    className="text-xs text-purple-600 hover:text-purple-800 underline"
                  >
                    Retrain Voice Recognition
                  </button>
                </>
              ) : (
                <>
                  <div className="flex items-center gap-2 text-gray-500 mb-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                    <span className="text-sm font-medium">No Voice Profile</span>
                  </div>
                  <button
                    onClick={() => setShowVoiceRecognition(true)}
                    className="text-xs text-purple-600 hover:text-purple-800 font-medium underline"
                  >
                    Setup Voice Recognition →
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Error Display */}
        {(error || recordingError) && (
          <div className="mb-6 bg-red-50 border-l-4 border-red-500 p-4 rounded-lg flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-red-800">Error</h3>
              <p className="text-red-700 text-sm">{error || recordingError}</p>
            </div>
            <button
              onClick={() => setError(null)}
              className="ml-auto text-red-500 hover:text-red-700"
            >
              ✕
            </button>
          </div>
        )}

        {/* Action Buttons */}
        <div className="mb-6 flex gap-3">
          <ConversationJsonUpload
            onLoadConversation={handleLoadJsonConversation}
          />
          
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
            Clear All
          </button>
        </div>

        {/* Recording Controls */}
        <div className="mb-6">
          <RecordingControls
            isRecording={isRecording}
            isPaused={isPaused}
            duration={duration}
            isProcessing={isProcessing}
            onStart={handleStartRecording}
            onStop={handleStopRecording}
            onPause={pauseRecording}
            onResume={resumeRecording}
          />
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Transcription Panel */}
          <div className="h-[600px]">
            <TranscriptionDisplay segments={segments} />
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
            This system uses Google Cloud Speech-to-Text and OpenAI for medical
            conversation analysis.
          </p>
          <p className="mt-1">
            ⚠️ Always verify AI-generated suggestions. This tool is for clinical
            decision support only.
          </p>
        </div>
      </div>

      {/* Voice Training Modal */}
      {showVoiceTraining && (
        <VoiceTraining
          onTrainingComplete={handleVoiceTrainingComplete}
          onCancel={handleVoiceTrainingCancel}
        />
      )}

      {/* Voice Recognition Setup Modal */}
      {showVoiceRecognition && (
        <VoiceRecognitionSetup
          onSetupComplete={(profile) => {
            setDoctorVoiceProfile(profile);
            setShowVoiceRecognition(false);
          }}
          onCancel={() => setShowVoiceRecognition(false)}
        />
      )}
    </div>
  );
}
