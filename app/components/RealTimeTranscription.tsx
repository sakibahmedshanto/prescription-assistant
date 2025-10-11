'use client';

import { useEffect, useRef } from 'react';
import { TranscriptionSegment } from '../types';
import { User, Stethoscope, Wifi, WifiOff } from 'lucide-react';

interface RealTimeTranscriptionProps {
  segments: TranscriptionSegment[];
  isConnected: boolean;
  isRecording: boolean;
}

export function RealTimeTranscription({ 
  segments, 
  isConnected, 
  isRecording 
}: RealTimeTranscriptionProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new segments arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [segments]);

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold text-gray-800">
          Live Transcription
        </h2>
        
        {/* Connection Status */}
        <div className="flex items-center gap-2">
          {isConnected ? (
            <div className="flex items-center gap-1 text-green-600">
              <Wifi className="w-4 h-4" />
              <span className="text-sm font-medium">Connected</span>
            </div>
          ) : (
            <div className="flex items-center gap-1 text-red-600">
              <WifiOff className="w-4 h-4" />
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
        className="flex-1 overflow-y-auto space-y-3 pr-2"
        style={{ scrollbarWidth: 'thin' }}
      >
        {segments.length === 0 ? (
          <div className="text-center text-gray-400 py-12">
            <div className="mb-4">
              <div className={`w-16 h-16 mx-auto rounded-full flex items-center justify-center ${
                isConnected ? 'bg-blue-100' : 'bg-gray-100'
              }`}>
                {isConnected ? (
                  <Stethoscope className="w-8 h-8 text-blue-500" />
                ) : (
                  <WifiOff className="w-8 h-8 text-gray-400" />
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
          segments.map((segment, index) => (
            <div
              key={index}
              className={`flex gap-3 p-4 rounded-lg transition-all duration-300 ${
                segment.speaker === 'Doctor'
                  ? 'bg-blue-50 border-l-4 border-blue-500'
                  : 'bg-green-50 border-l-4 border-green-500'
              } ${!segment.isFinal ? 'opacity-70' : ''}`}
            >
              {/* Speaker Icon */}
              <div className="flex-shrink-0">
                {segment.speaker === 'Doctor' ? (
                  <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
                    <Stethoscope className="w-5 h-5 text-white" />
                  </div>
                ) : (
                  <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center">
                    <User className="w-5 h-5 text-white" />
                  </div>
                )}
              </div>
              
              {/* Content */}
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`font-semibold ${
                    segment.speaker === 'Doctor' ? 'text-blue-700' : 'text-green-700'
                  }`}>
                    {segment.speaker}
                  </span>
                  
                  {segment.timestamp && (
                    <span className="text-xs text-gray-500">
                      {segment.timestamp.toLocaleTimeString()}
                    </span>
                  )}
                  
                  {!segment.isFinal && (
                    <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded">
                      Interim
                    </span>
                  )}
                  
                  {segment.confidence && (
                    <span className={`text-xs px-2 py-0.5 rounded ${
                      segment.confidence > 0.8 
                        ? 'bg-green-100 text-green-800' 
                        : segment.confidence > 0.6
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {Math.round(segment.confidence * 100)}%
                    </span>
                  )}
                </div>
                
                <p className={`text-gray-700 leading-relaxed ${
                  !segment.isFinal ? 'italic' : ''
                }`}>
                  {segment.text}
                  {!segment.isFinal && (
                    <span className="inline-block w-2 h-4 bg-gray-400 ml-1 animate-pulse"></span>
                  )}
                </p>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Footer Stats */}
      {segments.length > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="flex justify-between text-sm text-gray-500">
            <div>
              <span className="font-medium">Total Segments:</span> {segments.length}
            </div>
            <div>
              <span className="font-medium">Doctors:</span> {segments.filter(s => s.speaker === 'Doctor').length} | 
              <span className="font-medium"> Patients:</span> {segments.filter(s => s.speaker === 'Patient').length}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
