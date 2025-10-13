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
  structuredData?: StructuredMedicineData;
  bdMedicines?: MedicineSearchResult[];
}

export type AnalysisType =
  | 'summary'
  | 'symptoms'
  | 'diagnosis'
  | 'prescription'
  | 'follow-up';

export interface Medicine {
  brandId: string;
  brandName: string;
  type: string;
  dosageForm: string;
  generic: string;
  strength: string;
  manufacturer: string;
  packageContainer: string;
  packageSize: string;
}

export interface Generic {
  genericId: string;
  genericName: string;
  drugClass: string;
  indication: string;
  indicationDescription: string;
  therapeuticClass: string;
  pharmacology: string;
}

export interface MedicineSearchResult {
  medicine: Medicine;
  genericInfo?: Generic;
  relevanceScore: number;
}

export interface StructuredMedicineData {
  conditions: string[];
  medicines: Array<{
    genericName: string;
    indication: string;
    dosage: string;
    duration: string;
    instructions: string;
  }>;
  nonPharmacological: string[];
  safetyNotes: string[];
}

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

