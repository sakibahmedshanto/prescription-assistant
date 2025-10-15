import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import { writeFileSync, unlinkSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';
import crypto from 'crypto';

const ASSEMBLYAI_BASE_URL = 'https://api.assemblyai.com/v2';

const getAssemblyAIHeaders = () => {
  const apiKey = process.env.ASSEMBLYAI_API_KEY;
  if (!apiKey) {
    throw new Error('ASSEMBLYAI_API_KEY environment variable is required');
  }
  return {
    authorization: apiKey,
    'Content-Type': 'application/json'
  };
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { audioContent, doctorName, config } = body;

    if (!audioContent) {
      return NextResponse.json(
        { error: 'Audio content is required' },
        { status: 400 }
      );
    }

    if (!doctorName) {
      return NextResponse.json(
        { error: 'Doctor name is required' },
        { status: 400 }
      );
    }

    // Convert base64 to buffer
    const audioBuffer = Buffer.from(audioContent, 'base64');

    // Save to temporary file
    const tempDir = join(process.cwd(), 'temp');
    if (!existsSync(tempDir)) {
      mkdirSync(tempDir, { recursive: true });
    }

    const tempFilePath = join(tempDir, `voice_train_${Date.now()}.webm`);
    writeFileSync(tempFilePath, audioBuffer);

    try {
      // Upload audio to AssemblyAI
      const uploadResponse = await axios.post(
        `${ASSEMBLYAI_BASE_URL}/upload`,
        audioBuffer,
        {
          headers: {
            authorization: getAssemblyAIHeaders().authorization
          }
        }
      );

      const uploadUrl = uploadResponse.data.upload_url;

      // Transcribe with speaker diarization to extract voice characteristics
      const transcriptionData = {
        audio_url: uploadUrl,
        speaker_labels: true,
        speakers_expected: 1, // Only doctor's voice
        language_code: 'en_us',
        punctuate: true,
        format_text: true,
        auto_highlights: true,
        entity_detection: true,
        word_boost: [
          'doctor', 'physician', 'diagnose', 'diagnosis', 'prescription',
          'medication', 'treatment', 'examine', 'symptoms', 'condition',
          'blood pressure', 'temperature', 'pulse', 'heart rate'
        ],
        boost_param: 'high'
      };

      const transcriptResponse = await axios.post(
        `${ASSEMBLYAI_BASE_URL}/transcript`,
        transcriptionData,
        {
          headers: getAssemblyAIHeaders()
        }
      );

      const transcriptId = transcriptResponse.data.id;

      // Poll for completion
      const pollingEndpoint = `${ASSEMBLYAI_BASE_URL}/transcript/${transcriptId}`;
      
      let transcriptionResult;
      let attempts = 0;
      const maxAttempts = 60;

      while (attempts < maxAttempts) {
        const pollingResponse = await axios.get(pollingEndpoint, {
          headers: getAssemblyAIHeaders()
        });

        transcriptionResult = pollingResponse.data;

        if (transcriptionResult.status === 'completed') {
          break;
        } else if (transcriptionResult.status === 'error') {
          throw new Error(`Transcription failed: ${transcriptionResult.error}`);
        }

        await new Promise(resolve => setTimeout(resolve, 3000));
        attempts++;
      }

      if (transcriptionResult.status !== 'completed') {
        throw new Error('Transcription timeout');
      }

      // Extract voice signature from transcription
      const voiceSignature = createVoiceSignature(
        transcriptionResult,
        doctorName
      );

      return NextResponse.json({
        success: true,
        voiceSignature,
        sampleDuration: transcriptionResult.audio_duration,
        confidence: transcriptionResult.confidence,
        message: `Voice profile created for ${doctorName}`
      });

    } finally {
      // Clean up temporary file
      try {
        unlinkSync(tempFilePath);
      } catch (err) {
        console.warn('Could not delete temp file:', err);
      }
    }

  } catch (error: any) {
    console.error('Voice recognition training error:', error);
    return NextResponse.json(
      { 
        error: error.message || 'Failed to create voice profile',
        details: error.response?.data || error.toString()
      },
      { status: 500 }
    );
  }
}

// Create a voice signature from transcription data
function createVoiceSignature(transcriptionResult: any, doctorName: string) {
  const signature: any = {
    doctorName,
    profileId: crypto.randomBytes(16).toString('hex'),
    createdAt: new Date().toISOString(),
    
    // Voice characteristics
    characteristics: {
      averageConfidence: transcriptionResult.confidence || 0,
      totalWords: transcriptionResult.words?.length || 0,
      audioDuration: transcriptionResult.audio_duration || 0,
      speakerCount: 1,
      
      // Speech patterns
      speechRate: calculateSpeechRate(transcriptionResult),
      avgWordLength: calculateAvgWordLength(transcriptionResult),
      vocabularyComplexity: calculateVocabularyComplexity(transcriptionResult),
      
      // Medical terminology usage
      medicalTermCount: countMedicalTerms(transcriptionResult),
      medicalTermDensity: calculateMedicalTermDensity(transcriptionResult),
      
      // Linguistic patterns
      questionFrequency: countQuestions(transcriptionResult),
      sentenceStructure: analyzeSentenceStructure(transcriptionResult),
    },
    
    // Sample metadata
    metadata: {
      language: transcriptionResult.language_code,
      autoHighlights: Array.isArray(transcriptionResult.auto_highlights?.results) 
        ? transcriptionResult.auto_highlights.results.slice(0, 5)
        : [],
      entities: Array.isArray(transcriptionResult.entities) 
        ? transcriptionResult.entities.slice(0, 10)
        : [],
    },
    
    // Create a unique fingerprint
    fingerprint: createFingerprint(transcriptionResult, doctorName)
  };

  return signature;
}

// Helper functions
function calculateSpeechRate(result: any): number {
  const words = result.words?.length || 0;
  const duration = result.audio_duration || 1;
  return words / (duration / 1000); // words per second
}

function calculateAvgWordLength(result: any): number {
  const words = result.words || [];
  if (words.length === 0) return 0;
  const totalLength = words.reduce((sum: number, word: any) => sum + (word.text?.length || 0), 0);
  return totalLength / words.length;
}

function calculateVocabularyComplexity(result: any): number {
  const text = result.text || '';
  const words = text.toLowerCase().split(/\s+/);
  const uniqueWords = new Set(words);
  return uniqueWords.size / Math.max(words.length, 1);
}

function countMedicalTerms(result: any): number {
  const medicalTerms = [
    'diagnose', 'diagnosis', 'prescription', 'medication', 'treatment',
    'examine', 'symptoms', 'condition', 'blood pressure', 'temperature',
    'pulse', 'heart rate', 'mg', 'dosage', 'chronic', 'acute', 'prescribe'
  ];
  
  const text = result.text?.toLowerCase() || '';
  return medicalTerms.filter(term => text.includes(term)).length;
}

function calculateMedicalTermDensity(result: any): number {
  const medicalCount = countMedicalTerms(result);
  const totalWords = result.words?.length || 1;
  return medicalCount / totalWords;
}

function countQuestions(result: any): number {
  const text = result.text || '';
  const questionWords = ['what', 'when', 'where', 'how', 'why', 'who', 'which', 'can you', 'do you', 'have you'];
  const sentences = text.split(/[.!?]+/);
  
  let questionCount = 0;
  sentences.forEach(sentence => {
    const lowerSentence = sentence.toLowerCase();
    if (questionWords.some(q => lowerSentence.includes(q)) || sentence.includes('?')) {
      questionCount++;
    }
  });
  
  return questionCount;
}

function analyzeSentenceStructure(result: any): any {
  const text = result.text || '';
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
  
  return {
    avgSentenceLength: sentences.length > 0
      ? sentences.reduce((sum, s) => sum + s.split(/\s+/).length, 0) / sentences.length
      : 0,
    totalSentences: sentences.length,
    complexity: sentences.length > 0 ? sentences[0].split(/[,;:]/).length : 0
  };
}

function createFingerprint(result: any, doctorName: string): string {
  // Create a unique fingerprint based on voice characteristics
  const data = {
    name: doctorName,
    confidence: result.confidence,
    words: result.words?.length,
    duration: result.audio_duration,
    speechRate: calculateSpeechRate(result),
    medicalTerms: countMedicalTerms(result),
  };
  
  const dataString = JSON.stringify(data);
  return crypto.createHash('sha256').update(dataString).digest('hex');
}
