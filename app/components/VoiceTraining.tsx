'use client';

import { useState, useRef } from 'react';
import { Mic, MicOff, CheckCircle, AlertCircle, User, Volume2 } from 'lucide-react';

interface VoiceTrainingProps {
  onTrainingComplete: (doctorVoiceProfile: any) => void;
  onCancel: () => void;
}

export function VoiceTraining({ onTrainingComplete, onCancel }: VoiceTrainingProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [trainingStep, setTrainingStep] = useState<'intro' | 'recording' | 'processing' | 'complete'>('intro');
  const [recordedAudio, setRecordedAudio] = useState<Blob | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [recordingDuration, setRecordingDuration] = useState(0);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const startTraining = async () => {
    try {
      setError(null);
      setTrainingStep('recording');
      setRecordingDuration(0);
      
      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 48000,
        } 
      });

      streamRef.current = stream;

      // Create MediaRecorder for training (10 seconds)
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus',
      });

      const chunks: Blob[] = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/webm' });
        setRecordedAudio(blob);
        setTrainingStep('processing');
        processVoiceProfile(blob);
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start();

      // Start duration counter
      intervalRef.current = setInterval(() => {
        setRecordingDuration(prev => {
          const newDuration = prev + 1;
          if (newDuration >= 10) {
            stopRecording();
          }
          return newDuration;
        });
      }, 1000);

      setIsRecording(true);

    } catch (err: any) {
      console.error('Error starting training:', err);
      setError(err.message || 'Failed to start voice training');
      setTrainingStep('intro');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }

      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
    }
  };

  const processVoiceProfile = async (audioBlob: Blob) => {
    try {
      // Convert audio to base64
      const reader = new FileReader();
      reader.readAsDataURL(audioBlob);
      
      reader.onloadend = async () => {
        const base64Audio = reader.result?.toString().split(',')[1];
        
        if (!base64Audio) {
          setError('Failed to process audio');
          setTrainingStep('intro');
          return;
        }

        try {
          // Send to AssemblyAI transcription API with special training flag
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
                enableSpeakerDiarization: true,
                diarizationSpeakerCount: 1, // Only doctor during training
              },
              isTraining: true,
            }),
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Voice training failed');
          }

          const data = await response.json();
          
          if (data.success) {
            // Create voice profile
            const doctorVoiceProfile = {
              id: 'doctor',
              name: 'Doctor',
              audioFeatures: data.voiceFeatures || {}, // Voice characteristics
              trainedAt: new Date().toISOString(),
              audioDuration: 10,
            };

            // Store in localStorage for future use
            localStorage.setItem('doctorVoiceProfile', JSON.stringify(doctorVoiceProfile));
            
            setTrainingStep('complete');
            onTrainingComplete(doctorVoiceProfile);
          } else {
            throw new Error('Voice training failed');
          }
        } catch (err: any) {
          console.error('Voice training error:', err);
          setError(err.message || 'Failed to process voice training');
          setTrainingStep('intro');
        }
      };

      reader.onerror = () => {
        setError('Failed to read audio file');
        setTrainingStep('intro');
      };

    } catch (err: any) {
      console.error('Processing error:', err);
      setError(err.message || 'Failed to process voice profile');
      setTrainingStep('intro');
    }
  };

  const formatDuration = (seconds: number): string => {
    return `${seconds}`;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full mx-4">
        <div className="text-center">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <User className="w-8 h-8 text-blue-600" />
          </div>
          
          <h2 className="text-2xl font-bold text-gray-800 mb-2">
            Doctor Voice Training
          </h2>
          
          <p className="text-gray-600 mb-6">
            {trainingStep === 'intro' && 
              "Let's train the system to recognize your voice. Please speak clearly for 10 seconds."
            }
            {trainingStep === 'recording' && 
              "Please speak clearly. The system is learning your voice patterns..."
            }
            {trainingStep === 'processing' && 
              "Processing your voice profile..."
            }
            {trainingStep === 'complete' && 
              "Voice training completed successfully!"
            }
          </p>

          {trainingStep === 'intro' && (
            <div className="space-y-4">
              <div className="bg-blue-50 p-4 rounded-lg text-left">
                <h3 className="font-semibold text-blue-800 mb-2">Instructions:</h3>
                <ul className="text-sm text-blue-700 space-y-1">
                  <li>• Speak in your normal doctor voice</li>
                  <li>• Say something like: "Hello, I'm Dr. [Your Name]. How can I help you today?"</li>
                  <li>• Speak clearly and at normal pace</li>
                  <li>• Avoid background noise</li>
                </ul>
              </div>
              
              <button
                onClick={startTraining}
                className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-semibold transition-colors"
              >
                <Mic className="w-5 h-5" />
                Start Voice Training
              </button>
            </div>
          )}

          {trainingStep === 'recording' && (
            <div className="space-y-4">
              <div className="text-center">
                <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
                  <Mic className="w-10 h-10 text-red-500" />
                </div>
                
                <div className="text-3xl font-bold text-red-500 mb-2">
                  {formatDuration(recordingDuration)} / 10
                </div>
                
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-500 h-2 rounded-full transition-all duration-1000"
                    style={{ width: `${(recordingDuration / 10) * 100}%` }}
                  ></div>
                </div>
                
                <p className="text-sm text-gray-500 mt-2">
                  Recording... Speak clearly
                </p>
              </div>
              
              <button
                onClick={stopRecording}
                className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-red-500 hover:bg-red-600 text-white rounded-lg font-semibold transition-colors"
              >
                <MicOff className="w-5 h-5" />
                Stop Recording
              </button>
            </div>
          )}

          {trainingStep === 'processing' && (
            <div className="space-y-4">
              <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Volume2 className="w-10 h-10 text-blue-500 animate-pulse" />
              </div>
              
              <div className="text-lg font-semibold text-gray-700">
                Processing Voice Profile...
              </div>
              
              <div className="text-sm text-gray-500">
                This may take a few seconds
              </div>
            </div>
          )}

          {trainingStep === 'complete' && (
            <div className="space-y-4">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-10 h-10 text-green-500" />
              </div>
              
              <div className="text-lg font-semibold text-green-700">
                Training Complete!
              </div>
              
              <div className="text-sm text-gray-600">
                The system can now recognize your voice as the doctor.
              </div>
              
              <button
                onClick={() => onTrainingComplete({})}
                className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-green-500 hover:bg-green-600 text-white rounded-lg font-semibold transition-colors"
              >
                Continue to Consultation
              </button>
            </div>
          )}

          {error && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center gap-2 text-red-700">
                <AlertCircle className="w-5 h-5" />
                <span className="font-medium">Error:</span>
              </div>
              <p className="text-red-600 text-sm mt-1">{error}</p>
            </div>
          )}

          {trainingStep !== 'complete' && (
            <button
              onClick={onCancel}
              className="mt-4 text-gray-500 hover:text-gray-700 text-sm"
            >
              Cancel
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
