'use client';

import { useState } from 'react';
import { MedicalAnalysis as MedicalAnalysisType, AnalysisType } from '../types';
import { 
  FileText, 
  Activity, 
  ClipboardList, 
  Pill, 
  Calendar,
  Loader2,
  RefreshCw
} from 'lucide-react';

interface MedicalAnalysisProps {
  analyses: Map<AnalysisType, MedicalAnalysisType>;
  onRequestAnalysis: (type: AnalysisType) => void;
  isAnalyzing: boolean;
}

const analysisConfig = {
  summary: {
    title: 'Medical Summary',
    icon: FileText,
    color: 'blue',
    description: 'Comprehensive visit summary'
  },
  symptoms: {
    title: 'Symptoms Analysis',
    icon: Activity,
    color: 'red',
    description: 'Detected symptoms and patterns'
  },
  diagnosis: {
    title: 'Differential Diagnosis',
    icon: ClipboardList,
    color: 'purple',
    description: 'Possible diagnoses and recommendations'
  },
  prescription: {
    title: 'Prescription Suggestions',
    icon: Pill,
    color: 'green',
    description: 'Medication recommendations'
  },
  'follow-up': {
    title: 'Follow-up Plan',
    icon: Calendar,
    color: 'orange',
    description: 'Care continuity recommendations'
  },
};

export function MedicalAnalysis({ 
  analyses, 
  onRequestAnalysis, 
  isAnalyzing 
}: MedicalAnalysisProps) {
  const [activeTab, setActiveTab] = useState<AnalysisType>('summary');

  const config = analysisConfig[activeTab];
  const Icon = config.icon;
  const analysis = analyses.get(activeTab);

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 h-full flex flex-col">
      <h2 className="text-2xl font-bold mb-4 text-gray-800">
        Medical Analysis & Suggestions
      </h2>

      {/* Analysis Type Tabs */}
      <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
        {(Object.keys(analysisConfig) as AnalysisType[]).map((type) => {
          const tabConfig = analysisConfig[type];
          const TabIcon = tabConfig.icon;
          const hasAnalysis = analyses.has(type);
          
          return (
            <button
              key={type}
              onClick={() => setActiveTab(type)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg whitespace-nowrap transition-colors ${
                activeTab === type
                  ? `bg-${tabConfig.color}-500 text-white`
                  : `bg-gray-100 text-gray-700 hover:bg-gray-200`
              } ${hasAnalysis ? 'ring-2 ring-green-400' : ''}`}
            >
              <TabIcon className="w-4 h-4" />
              <span className="text-sm font-medium">{tabConfig.title}</span>
            </button>
          );
        })}
      </div>

      {/* Analysis Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Icon className={`w-6 h-6 text-${config.color}-500`} />
              <h3 className="text-lg font-semibold text-gray-800">
                {config.title}
              </h3>
            </div>
            
            <button
              onClick={() => onRequestAnalysis(activeTab)}
              disabled={isAnalyzing}
              className={`flex items-center gap-2 px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                isAnalyzing
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : `bg-${config.color}-500 text-white hover:bg-${config.color}-600`
              }`}
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4" />
                  {analysis ? 'Refresh' : 'Generate'}
                </>
              )}
            </button>
          </div>
          
          <p className="text-sm text-gray-500">{config.description}</p>
        </div>

        {analysis ? (
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="prose prose-sm max-w-none">
              <div className="whitespace-pre-wrap text-gray-700">
                {analysis.content}
              </div>
            </div>
            
            <div className="mt-4 text-xs text-gray-400">
              Generated at {analysis.timestamp.toLocaleTimeString()}
            </div>
          </div>
        ) : (
          <div className="text-center text-gray-400 py-12 border-2 border-dashed border-gray-200 rounded-lg">
            <Icon className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>No analysis yet</p>
            <p className="text-sm mt-1">
              Click &quot;Generate&quot; to analyze the conversation
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

