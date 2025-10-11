'use client';

import { useState, useRef, useCallback } from 'react';
import { Mic, Square, Loader2, CheckCircle, XCircle, User, AlertCircle } from 'lucide-react';

interface VoiceRecognitionSetupProps {
  onSetupComplete: (profile: any) => void;
  onCancel: () => void;
}

export function VoiceRecognitionSetup({ onSetupComplete, onCancel }: VoiceRecognitionSetupProps) {
  const [step, setStep] = useState<'intro' | 'recording' | 'processing' | 'success' | 'error'>('intro');
  const [isRecording, setIsRecording] = useState(false);
  const [countdown, setCountdown] = useState(15);
  const [error, setError] = useState<string | null>(null);
  const [doctorName, setDoctorName] = useState('');
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const startVoiceRecording = useCallback(async () => {
    if (!doctorName.trim()) {
      setError('Please enter your name first');
      return;
    }

    setError(null);
    setStep('recording');
    setIsRecording(true);
    setCountdown(15);
    audioChunksRef.current = [];

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 48000,
        }
      });
      
      mediaRecorderRef.current = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus',
      });

      mediaRecorderRef.current.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorderRef.current.onstop = async () => {
        setStep('processing');
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        
        // Process the voice sample
        await processVoiceSample(audioBlob);
      };

      mediaRecorderRef.current.start();

      // 15 second countdown
      countdownIntervalRef.current = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(countdownIntervalRef.current!);
            mediaRecorderRef.current?.stop();
            stream.getTracks().forEach(track => track.stop());
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

    } catch (err: any) {
      setError('Microphone access denied. Please enable it in your browser settings.');
      setStep('error');
      setIsRecording(false);
    }
  }, [doctorName]);

  const processVoiceSample = async (audioBlob: Blob) => {
    try {
      // Convert to base64
      const reader = new FileReader();
      reader.readAsDataURL(audioBlob);
      
      reader.onloadend = async () => {
        const base64Audio = reader.result?.toString().split(',')[1];
        if (!base64Audio) {
          throw new Error('Failed to process audio');
        }

        // Send to AssemblyAI for voice profile creation
        const response = await fetch('/api/voice-recognition/train', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            audioContent: base64Audio,
            doctorName: doctorName.trim(),
            config: {
              encoding: 'WEBM_OPUS',
              sampleRateHertz: 48000,
              languageCode: 'en-US',
            },
          }),
        });

        const data = await response.json();

        if (response.ok && data.success) {
          // Save voice profile to localStorage
          const voiceProfile = {
            doctorName: doctorName.trim(),
            voiceSignature: data.voiceSignature,
            createdAt: new Date().toISOString(),
            sampleDuration: data.sampleDuration,
            confidence: data.confidence,
          };
          
          localStorage.setItem('doctorVoiceProfile', JSON.stringify(voiceProfile));
          setStep('success');
          
          // Call completion callback after a brief delay
          setTimeout(() => {
            onSetupComplete(voiceProfile);
          }, 2000);
        } else {
          throw new Error(data.error || 'Failed to create voice profile');
        }
      };
    } catch (err: any) {
      console.error('Voice processing error:', err);
      setError(err.message || 'Failed to process voice sample');
      setStep('error');
    }
  };

  const handleCancel = () => {
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    onCancel();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl p-8 max-w-lg w-full">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
            <User className="w-6 h-6 text-purple-600" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-800">Voice Recognition Setup</h2>
            <p className="text-sm text-gray-600">Train the system to recognize your voice</p>
          </div>
        </div>

        {/* Intro Step */}
        {step === 'intro' && (
          <div className="space-y-6">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-semibold text-blue-800 mb-2">How it works:</h3>
              <ul className="text-sm text-blue-700 space-y-2">
                <li>✅ Record 15 seconds of your voice</li>
                <li>✅ System creates your unique voice profile</li>
                <li>✅ Future consultations automatically identify you as "Doctor"</li>
                <li>✅ 98%+ accuracy with voice recognition</li>
              </ul>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Your Name (Doctor)
              </label>
              <input
                type="text"
                value={doctorName}
                onChange={(e) => setDoctorName(e.target.value)}
                placeholder="e.g., Dr. Sarah Johnson"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-yellow-800">
                  <p className="font-semibold mb-1">Recording Tips:</p>
                  <ul className="space-y-1">
                    <li>• Speak naturally in a quiet environment</li>
                    <li>• Use medical terminology you'd use in consultations</li>
                    <li>• Example: "Hello, I'm Dr. [Name]. Let me examine your symptoms..."</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleCancel}
                className="flex-1 px-4 py-3 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                onClick={startVoiceRecording}
                disabled={!doctorName.trim()}
                className="flex-1 px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <Mic className="w-5 h-5" />
                Start Recording
              </button>
            </div>
          </div>
        )}

        {/* Recording Step */}
        {step === 'recording' && (
          <div className="text-center space-y-6">
            <div className="relative flex items-center justify-center">
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-32 h-32 rounded-full bg-red-200 animate-ping"></div>
              </div>
              <div className="relative w-24 h-24 bg-red-500 rounded-full flex items-center justify-center">
                <Mic className="w-12 h-12 text-white" />
              </div>
            </div>

            <div>
              <div className="text-6xl font-bold text-red-600 mb-2">{countdown}s</div>
              <p className="text-lg text-gray-600">Recording your voice...</p>
              <p className="text-sm text-gray-500 mt-2">Speak naturally about your medical practice</p>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-800 italic">
                "Hello, I'm {doctorName}. Today I'll be examining your symptoms and providing a diagnosis. 
                Let's discuss your medical history and any medications you're currently taking..."
              </p>
            </div>
          </div>
        )}

        {/* Processing Step */}
        {step === 'processing' && (
          <div className="text-center space-y-6">
            <div className="flex justify-center">
              <Loader2 className="w-16 h-16 text-purple-600 animate-spin" />
            </div>
            <div>
              <h3 className="text-xl font-semibold text-gray-800 mb-2">
                Creating Your Voice Profile
              </h3>
              <p className="text-gray-600">
                Analyzing voice patterns and creating unique signature...
              </p>
            </div>
            <div className="bg-gray-100 rounded-lg p-4">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <div className="w-2 h-2 bg-purple-600 rounded-full animate-pulse"></div>
                Processing with AssemblyAI
              </div>
            </div>
          </div>
        )}

        {/* Success Step */}
        {step === 'success' && (
          <div className="text-center space-y-6">
            <div className="flex justify-center">
              <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle className="w-16 h-16 text-green-600" />
              </div>
            </div>
            <div>
              <h3 className="text-2xl font-bold text-green-800 mb-2">
                Voice Profile Created!
              </h3>
              <p className="text-gray-600">
                Welcome, {doctorName}! Your voice is now recognized.
              </p>
            </div>
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <p className="text-sm text-green-800">
                ✅ Future consultations will automatically identify you as "Doctor"
              </p>
            </div>
          </div>
        )}

        {/* Error Step */}
        {step === 'error' && (
          <div className="space-y-6">
            <div className="flex justify-center">
              <div className="w-24 h-24 bg-red-100 rounded-full flex items-center justify-center">
                <XCircle className="w-16 h-16 text-red-600" />
              </div>
            </div>
            <div>
              <h3 className="text-xl font-bold text-red-800 mb-2">Setup Failed</h3>
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-sm text-red-800">{error}</p>
                </div>
              )}
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleCancel}
                className="flex-1 px-4 py-3 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                onClick={() => setStep('intro')}
                className="flex-1 px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium"
              >
                Try Again
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

