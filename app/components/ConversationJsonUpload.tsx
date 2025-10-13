'use client';

import { useRef } from 'react';
import { Upload } from 'lucide-react';
import { TranscriptionSegment } from '../types';

interface ConversationJsonUploadProps {
  onLoadConversation: (segments: TranscriptionSegment[]) => void;
}

interface ConversationJson {
  conversation: Array<{
    speaker: 'Doctor' | 'Patient';
    text: string;
  }>;
}

export function ConversationJsonUpload({ onLoadConversation }: ConversationJsonUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const parseJsonFile = (file: File) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const data: ConversationJson = JSON.parse(content);

        // Validate JSON structure
        if (!data.conversation || !Array.isArray(data.conversation)) {
          alert('Invalid JSON format. Expected { conversation: [...] }');
          return;
        }

        // Convert to TranscriptionSegment format
        const segments: TranscriptionSegment[] = data.conversation.map((item, index) => {
          if (!item.speaker || !item.text) {
            throw new Error(`Invalid segment at index ${index}`);
          }

          if (item.speaker !== 'Doctor' && item.speaker !== 'Patient') {
            throw new Error(`Invalid speaker "${item.speaker}"`);
          }

          return {
            speaker: item.speaker,
            text: item.text,
            timestamp: new Date(),
            isFinal: true,
            confidence: 1.0,
          };
        });

        // Success!
        onLoadConversation(segments);
      } catch (err: any) {
        alert(err.message || 'Failed to parse JSON file');
      }
    };

    reader.onerror = () => {
      alert('Failed to read file');
    };

    reader.readAsText(file);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.name.endsWith('.json')) {
        alert('Please select a JSON file');
        return;
      }
      parseJsonFile(file);
    }
  };

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <button
      onClick={handleButtonClick}
      className="flex items-center gap-2 px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors font-medium"
    >
      <Upload className="w-4 h-4" />
      Upload JSON
      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        onChange={handleFileSelect}
        className="hidden"
      />
    </button>
  );
}

