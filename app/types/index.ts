export interface TranscriptionSegment {
  speaker: 'Doctor' | 'Patient';
  text: string;
  startTime?: any;
  endTime?: any;
  timestamp?: Date;
  isFinal?: boolean;
  confidence?: number;
}

export interface MedicalAnalysis {
  type: AnalysisType;
  content: string;
  timestamp: Date;
  loading?: boolean;
}

export type AnalysisType = 
  | 'summary' 
  | 'symptoms' 
  | 'diagnosis' 
  | 'prescription' 
  | 'follow-up';

export interface ConversationState {
  segments: TranscriptionSegment[];
  isRecording: boolean;
  isPaused: boolean;
  duration: number;
}

export interface AnalysisState {
  analyses: Map<AnalysisType, MedicalAnalysis>;
  isAnalyzing: boolean;
}

