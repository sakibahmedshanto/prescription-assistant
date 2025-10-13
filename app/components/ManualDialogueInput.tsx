'use client';

import { useState } from 'react';
import { Plus, Trash2, Send } from 'lucide-react';
import { TranscriptionSegment } from '../types';

interface ManualDialogueInputProps {
  onAddSegments: (segments: TranscriptionSegment[]) => void;
  onClear: () => void;
  currentSegments: TranscriptionSegment[];
}

export function ManualDialogueInput({ 
  onAddSegments, 
  onClear, 
  currentSegments 
}: ManualDialogueInputProps) {
  const [speaker, setSpeaker] = useState<'Doctor' | 'Patient'>('Doctor');
  const [text, setText] = useState('');
  const [showQuickTemplates, setShowQuickTemplates] = useState(false);

  const handleAddSegment = () => {
    if (!text.trim()) return;

    const newSegment: TranscriptionSegment = {
      speaker,
      text: text.trim(),
      timestamp: new Date(),
      isFinal: true,
      confidence: 1.0,
    };

    onAddSegments([newSegment]);
    setText('');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && e.ctrlKey) {
      handleAddSegment();
    }
  };

  const quickTemplates = [
    {
      name: 'Fever & Headache',
      segments: [
        { speaker: 'Doctor' as const, text: 'Hello, what brings you in today?' },
        { speaker: 'Patient' as const, text: 'I have had a high fever and severe headache for the past 2 days.' },
        { speaker: 'Doctor' as const, text: 'Any other symptoms? Body aches, cough, or sore throat?' },
        { speaker: 'Patient' as const, text: 'Yes, I have body aches and feel very weak.' },
        { speaker: 'Doctor' as const, text: 'I will prescribe some medication for the fever and pain relief.' },
      ]
    },
    {
      name: 'Diabetes Check',
      segments: [
        { speaker: 'Doctor' as const, text: 'How are you feeling today?' },
        { speaker: 'Patient' as const, text: 'I have been feeling very tired and thirsty all the time.' },
        { speaker: 'Doctor' as const, text: 'Have you noticed increased urination or blurred vision?' },
        { speaker: 'Patient' as const, text: 'Yes, I urinate frequently, especially at night.' },
        { speaker: 'Doctor' as const, text: 'Based on your symptoms, I recommend checking your blood sugar levels. I will prescribe diabetes medication.' },
      ]
    },
    {
      name: 'Common Cold',
      segments: [
        { speaker: 'Doctor' as const, text: 'What seems to be the problem?' },
        { speaker: 'Patient' as const, text: 'I have a runny nose, sneezing, and cough for 3 days.' },
        { speaker: 'Doctor' as const, text: 'Any fever or chest pain?' },
        { speaker: 'Patient' as const, text: 'Mild fever, no chest pain.' },
        { speaker: 'Doctor' as const, text: 'This appears to be a common cold. I will prescribe antihistamine and cough medicine.' },
      ]
    },
    {
      name: 'Hypertension',
      segments: [
        { speaker: 'Doctor' as const, text: 'How has your blood pressure been?' },
        { speaker: 'Patient' as const, text: 'I have been having headaches and dizziness lately.' },
        { speaker: 'Doctor' as const, text: 'Let me check your blood pressure. It is 150/95, which is high.' },
        { speaker: 'Patient' as const, text: 'Is that serious?' },
        { speaker: 'Doctor' as const, text: 'Yes, you have hypertension. I will prescribe blood pressure medication.' },
      ]
    },
    {
      name: 'Gastric Problem',
      segments: [
        { speaker: 'Doctor' as const, text: 'What symptoms are you experiencing?' },
        { speaker: 'Patient' as const, text: 'I have severe stomach pain and acidity after eating.' },
        { speaker: 'Doctor' as const, text: 'How long have you had these symptoms?' },
        { speaker: 'Patient' as const, text: 'For about a week now, especially at night.' },
        { speaker: 'Doctor' as const, text: 'This sounds like gastritis. I will prescribe antacids and proton pump inhibitors.' },
      ]
    },
  ];

  const loadTemplate = (template: typeof quickTemplates[0]) => {
    const segments: TranscriptionSegment[] = template.segments.map(seg => ({
      speaker: seg.speaker,
      text: seg.text,
      timestamp: new Date(),
      isFinal: true,
      confidence: 1.0,
    }));
    onAddSegments(segments);
    setShowQuickTemplates(false);
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-gray-800">
          📝 Manual Dialogue Input (Testing)
        </h3>
        <div className="flex gap-2">
          <button
            onClick={() => setShowQuickTemplates(!showQuickTemplates)}
            className="px-3 py-1 text-sm bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors"
          >
            {showQuickTemplates ? 'Hide Templates' : 'Quick Templates'}
          </button>
          {currentSegments.length > 0 && (
            <button
              onClick={onClear}
              className="flex items-center gap-1 px-3 py-1 text-sm bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              Clear All
            </button>
          )}
        </div>
      </div>

      {/* Quick Templates */}
      {showQuickTemplates && (
        <div className="mb-4 p-4 bg-purple-50 rounded-lg border border-purple-200">
          <h4 className="text-sm font-semibold text-purple-800 mb-3">
            Quick Test Scenarios
          </h4>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {quickTemplates.map((template, idx) => (
              <button
                key={idx}
                onClick={() => loadTemplate(template)}
                className="px-3 py-2 text-sm bg-white border-2 border-purple-200 text-purple-700 rounded-lg hover:bg-purple-100 hover:border-purple-400 transition-all font-medium"
              >
                {template.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input Form */}
      <div className="space-y-3">
        <div className="flex gap-3">
          {/* Speaker Selection */}
          <div className="flex gap-2">
            <button
              onClick={() => setSpeaker('Doctor')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                speaker === 'Doctor'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              👨‍⚕️ Doctor
            </button>
            <button
              onClick={() => setSpeaker('Patient')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                speaker === 'Patient'
                  ? 'bg-green-500 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              🤒 Patient
            </button>
          </div>
        </div>

        {/* Text Input */}
        <div className="flex gap-2">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={`Type ${speaker}'s message... (Ctrl+Enter to add)`}
            className="flex-1 px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none resize-none"
            rows={3}
          />
          <button
            onClick={handleAddSegment}
            disabled={!text.trim()}
            className={`px-6 py-3 rounded-lg font-medium transition-colors flex items-center gap-2 ${
              text.trim()
                ? 'bg-blue-500 text-white hover:bg-blue-600'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            <Plus className="w-5 h-5" />
            Add
          </button>
        </div>

        <p className="text-xs text-gray-500">
          💡 Tip: Press <kbd className="px-2 py-1 bg-gray-200 rounded">Ctrl</kbd> + 
          <kbd className="px-2 py-1 bg-gray-200 rounded ml-1">Enter</kbd> to quickly add
        </p>
      </div>

      {/* Current Conversation Preview */}
      {currentSegments.length > 0 && (
        <div className="mt-4 p-3 bg-gray-50 rounded-lg border border-gray-200 max-h-40 overflow-y-auto">
          <p className="text-xs font-semibold text-gray-600 mb-2">
            Current Conversation ({currentSegments.length} segments):
          </p>
          <div className="space-y-1">
            {currentSegments.slice(-5).map((seg, idx) => (
              <div key={idx} className="text-xs">
                <span className={`font-bold ${
                  seg.speaker === 'Doctor' ? 'text-blue-600' : 'text-green-600'
                }`}>
                  {seg.speaker}:
                </span>{' '}
                <span className="text-gray-700">
                  {seg.text.slice(0, 80)}
                  {seg.text.length > 80 ? '...' : ''}
                </span>
              </div>
            ))}
            {currentSegments.length > 5 && (
              <p className="text-xs text-gray-400 italic">
                ... and {currentSegments.length - 5} more
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

