'use client';

import { useEffect, useRef } from 'react';
import { TranscriptionSegment } from '../types';
import { User, Stethoscope } from 'lucide-react';

interface TranscriptionDisplayWithBubblesProps {
  segments: TranscriptionSegment[];
  uploadedSegments: TranscriptionSegment[]; // New prop for uploaded JSON segments
  isConnected: boolean;
  isRecording: boolean;
}

export function TranscriptionDisplayWithBubbles({ 
  segments, 
  uploadedSegments, 
  isConnected, 
  isRecording 
}: TranscriptionDisplayWithBubblesProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new segments arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [segments, uploadedSegments]); // Include uploadedSegments in dependency array

  // Convert speaker format to Doctor/Patient
  const getSpeakerLabel = (speaker: string) => {
    if (speaker?.includes('Speaker 1')) return 'Patient';
    if (speaker?.includes('Speaker 2')) return 'Doctor';
    if (speaker === 'Doctor') return 'Doctor';
    if (speaker === 'Patient') return 'Patient';
    return speaker || 'Unknown';
  };

  const getSpeakerIcon = (speaker: string) => {
    const speakerLabel = getSpeakerLabel(speaker);
    if (speakerLabel === 'Doctor') {
      return <Stethoscope className="w-5 h-5 text-white" />;
    }
    return <User className="w-5 h-5 text-white" />;
  };

  const getSpeakerColor = (speaker: string) => {
    const speakerLabel = getSpeakerLabel(speaker);
    if (speakerLabel === 'Doctor') {
      return 'bg-blue-500';
    }
    return 'bg-green-500';
  };

  // Combine segments and uploadedSegments for display
  const allSegments = [...uploadedSegments, ...segments]; // Prioritize uploaded segments by listing first

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold text-gray-800">
          Real-Time Transcription
        </h2>
        
        {/* Connection Status */}
        <div className="flex items-center gap-2">
          {isConnected ? (
            <div className="flex items-center gap-1 text-green-600">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span className="text-sm font-medium">Connected</span>
            </div>
          ) : (
            <div className="flex items-center gap-1 text-red-600">
              <div className="w-2 h-2 bg-red-500 rounded-full"></div>
              <span className="text-sm font-medium">Disconnected</span>
            </div>
          )}
          
          {isRecording && (
            <div className="flex items-center gap-1 text-red-500">
              <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
              <span className="text-sm font-medium">Recording</span>
            </div>
          )}
        </div>
      </div>

      {/* Transcription Content */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto space-y-4 pr-2"
        style={{ scrollbarWidth: 'thin' }}
      >
        {allSegments.length === 0 ? (
          <div className="text-center text-gray-400 py-12">
            <div className="mb-4">
              <div className={`w-16 h-16 mx-auto rounded-full flex items-center justify-center ${
                isConnected ? 'bg-blue-100' : 'bg-gray-100'
              }`}>
                {isConnected ? (
                  <Stethoscope className="w-8 h-8 text-blue-500" />
                ) : (
                  <User className="w-8 h-8 text-gray-400" />
                )}
              </div>
            </div>
            <p className="text-lg font-medium mb-2">
              {isConnected ? 'Ready for Live Transcription' : 'Connecting...'}
            </p>
            <p className="text-sm">
              {isConnected 
                ? 'Start recording to see real-time transcription with speaker detection'
                : 'Please wait while connecting to the transcription server'
              }
            </p>
          </div>
        ) : (
          allSegments.map((segment, index) => {
            const speakerLabel = getSpeakerLabel(segment.speaker);
            const isDoctor = speakerLabel === 'Doctor';
            
            return (
              <div
                key={index}
                className={`flex gap-3 ${isDoctor ? 'justify-end' : 'justify-start'}`}
              >
                {!isDoctor && (
                  <div className="flex-shrink-0">
                    <div className={`w-10 h-10 ${getSpeakerColor(segment.speaker)} rounded-full flex items-center justify-center`}>
                      {getSpeakerIcon(segment.speaker)}
                    </div>
                  </div>
                )}
                
                <div className={`flex flex-col max-w-xs lg:max-w-md ${isDoctor ? 'items-end' : 'items-start'}`}>
                  <div className={`px-4 py-2 rounded-2xl ${
                    isDoctor 
                      ? 'bg-blue-500 text-white' 
                      : 'bg-gray-200 text-gray-800'
                  } ${!segment.isFinal ? 'opacity-70' : ''}`}>
                    <p className="text-sm leading-relaxed">
                      {segment.text}
                      {!segment.isFinal && (
                        <span className="inline-block w-2 h-4 bg-current ml-1 animate-pulse"></span>
                      )}
                    </p>
                  </div>
                  
                  <div className={`text-xs text-gray-500 mt-1 ${isDoctor ? 'text-right' : 'text-left'}`}>
                    {speakerLabel} {segment.timestamp?.toLocaleTimeString()}
                    {!segment.isFinal && (
                      <span className="ml-2 bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded text-xs">
                        Interim
                      </span>
                    )}
                  </div>
                </div>
                
                {isDoctor && (
                  <div className="flex-shrink-0">
                    <div className={`w-10 h-10 ${getSpeakerColor(segment.speaker)} rounded-full flex items-center justify-center`}>
                      {getSpeakerIcon(segment.speaker)}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Footer Stats */}
      {allSegments.length > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="flex justify-between text-sm text-gray-500">
            <div>
              <span className="font-medium">Total Segments:</span> {allSegments.length}
            </div>
            <div>
              <span className="font-medium">Doctors:</span> {allSegments.filter(s => getSpeakerLabel(s.speaker) === 'Doctor').length} | 
              <span className="font-medium"> Patients:</span> {allSegments.filter(s => getSpeakerLabel(s.speaker) === 'Patient').length}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}