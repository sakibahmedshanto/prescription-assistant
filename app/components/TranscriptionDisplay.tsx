'use client';

import { TranscriptionSegment } from '../types';
import { User, Stethoscope } from 'lucide-react';

interface TranscriptionDisplayProps {
  segments: TranscriptionSegment[];
}

export function TranscriptionDisplay({ segments }: TranscriptionDisplayProps) {
  return (
    <div className="bg-white rounded-lg shadow-lg p-6 h-full overflow-y-auto">
      <h2 className="text-2xl font-bold mb-4 text-gray-800">
        Real-Time Transcription
      </h2>
      
      {segments.length === 0 ? (
        <div className="text-center text-gray-400 py-12">
          <p>Start recording to see transcription...</p>
        </div>
      ) : (
        <div className="space-y-4">
          {segments.map((segment, index) => (
            <div
              key={index}
              className={`flex gap-3 p-4 rounded-lg ${
                segment.speaker === 'Doctor'
                  ? 'bg-blue-50 border-l-4 border-blue-500'
                  : 'bg-green-50 border-l-4 border-green-500'
              }`}
            >
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
                </div>
                <p className="text-gray-700 leading-relaxed">{segment.text}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

